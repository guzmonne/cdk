import { Construct, Duration, CfnOutput, Stack } from "@aws-cdk/core"
import * as ec2 from "@aws-cdk/aws-ec2"
import * as ecr from "@aws-cdk/aws-ecr"
import * as ecs from "@aws-cdk/aws-ecs"
import * as ecs_patterns from "@aws-cdk/aws-ecs-patterns"
import * as iam from "@aws-cdk/aws-iam"
import * as codebuild from "@aws-cdk/aws-codebuild"
import * as codepipeline from "@aws-cdk/aws-codepipeline"
import * as codepipeline_actions from "@aws-cdk/aws-codepipeline-actions"

/**
 * EcsAppProps defines the properties of EcsAppProps {@link EcsAppProps}
 */
export interface EcsAppProps {
  /**
   * ecsContainerName is the name of the container.
   */
  ecsContainerName: string;
  /**
   * ecsContainerImage is the name of the container image.
   */
  ecsContainerImage: string;
  /**
   * ecsContainerTag is the tag of the image to use. Defaults to `latest`.
   */
  ecsContainerTag?: string;
  /**
   * ecsContainerMemoryLimitMiB is the amount (in MiB) of memory to present to the container.
   */
  ecsContainerMemoryLimitMiB?: number;
  /**
   * ecsContainerCpu is the minimum number of CPU units to reserve for the container.
   */
  ecsContainerCpu?: number;
  /**
   * ecsContainerPort is the port number on the container that is bound to the user-specified or automatically assigned host port.
   */
  ecsContainerPort?: number;
  /**
   * githubOwner is the GitHub account/user that owns the repo.
   */
  githubOwner: string;
  /**
   * githubRepo is the name of the repo (without the username).
   */
  githubRepo: string;
  /**
   * githubBranch is the name of the branch (can be a regular expression).
   */
  githubBranch: string;
  /**
   * githubConnectionArn is the ID or ARN of the secret.
   */
  githubConnectionArn: string;
  /**
   * ecsAppName of the ECS Stack.
   */
  ecsAppName: string;
  /**
   * vpcCidr is the CIDR of the VPC created for the ECS Service.
   */
  vpcCidr: string;
}
/**
 * EcsApp is a construct that deploys a CodePipeline that tracks the
 * `Empatho-Nodejs-App` repository, and creates a new Docker image on each
 * commit.
 */
export class EcsApp extends Stack {
  /**
   * Constructor
   *
   * @param scope - The parent Construct instantiating this account.
   * @param id - The instance unique identifier.
   * @param props - EcsApp properties.
   */
  constructor(scope: Construct, id: string, props: EcsAppProps) {
    super(scope, id);
    /**
     * ECR Repository
     */
    const ecrRepo = new ecr.Repository(this, "EcrRepository");
    /**
     * ECS VPC
     */
    const vpc = new ec2.Vpc(this, "Vpc", {
      cidr: props.vpcCidr,
      natGateways: 1,
      maxAzs: 3
    });
    /**
     * ECS Cluster Admin Role
     */
    const clusterAdmin = new iam.Role(this, "ClusterAdminRole", {
      assumedBy: new iam.AccountRootPrincipal()
    });
    /**
     * ECS Cluster
     */
    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc: vpc,
    });
    /**
     * ECS AWS Log Driver
     */
    const logging = new ecs.AwsLogDriver({
      streamPrefix: props.ecsAppName,
    });
    /**
     * ECS Task Role
     */
    const taskRole = new iam.Role(this, `TaskRole-${props.ecsAppName}`, {
      roleName: `TaskRole-${props.ecsAppName}`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com")
    });
    /**
     * ECS Task
     */
    const taskDef = new ecs.FargateTaskDefinition(this, "FargateTaskDefinition", {
      taskRole: taskRole
    });
    const executionRolePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
    });
    taskDef.addToExecutionRolePolicy(executionRolePolicy);
    /**
     * ECS Container
     */
    const container = taskDef.addContainer(props.ecsContainerName, {
      image: ecs.ContainerImage.fromRegistry(`${ecrRepo.repositoryUri}/${ecrRepo.repositoryName}:${props.ecsContainerTag || "latest"}`),
      memoryLimitMiB: props.ecsContainerMemoryLimitMiB || 256,
      cpu: props.ecsContainerCpu || 256,
      logging
    });
    /**
     * ECS Container Port Mapping
     */
    container.addPortMappings({
      containerPort: props.ecsContainerPort || 5000,
      protocol: ecs.Protocol.TCP
    });
    /**
     * ECS Fargate Service
     */
    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "ApplicationLoadBalancedFargateService", {
      cluster: cluster,
      taskDefinition: taskDef,
      publicLoadBalancer: true,
      desiredCount: 1,
      listenerPort: 80
    });
    /**
     * ECS Fargate Service Auto Scaling
     */
    const scaling = fargateService.service.autoScaleTaskCount({ maxCapacity: 6 });
    scaling.scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: 10,
      scaleInCooldown: Duration.seconds(60),
      scaleOutCooldown: Duration.seconds(60)
    });
    /**
     * GitHub Source
     */
    const gitHubSource = codebuild.Source.gitHub({
      owner: props.githubOwner,
      repo: props.githubRepo,
      webhook: true, // optional, default: true if `webhookFilteres` were provided, false otherwise
      webhookFilters: [
        codebuild.FilterGroup.inEventOf(codebuild.EventAction.PUSH).andBranchIs(props.githubBranch),
      ],
    });
    /**
     * CodeBuild Project
     */
    const project = new codebuild.Project(this, "CodeBuildProject", {
      projectName: `${props.ecsAppName}`,
      source: gitHubSource,
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_2,
        privileged: true
      },
      environmentVariables: {
        "CLUSTER_NAME": {
          value: `${cluster.clusterName}`
        },
        "ECR_REPO_URI": {
          value: `${ecrRepo.repositoryUri}`
        },
        "ECR_REPO_NAME": {
          value: `${ecrRepo.repositoryName}`
        },
        "DOCKER_IMAGE": {
          value: `${props.ecsContainerImage.toLowerCase()}`
        },
        "DOCKER_TAG": {
          value: `${props.ecsContainerTag?.toLowerCase() || "latest"}`
        },
        "AWS_REGION": {
          value: Stack.of(this).region,
        }
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          pre_build: {
            commands: [
              "env",
              "export GITHUB_COMMIT_ID=${CODEBUILD_RESOLVED_SOURCE_VERSION}",
              "npm install",
            ]
          },
          build: {
            commands: [
              "aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO_URI",
              "docker build -t $DOCKER_IMAGE:$DOCKER_TAG -t $DOCKER_IMAGE:$GITHUB_COMMIT_ID .",
              "docker tag $DOCKER_IMAGE:$DOCKER_TAG $ECR_REPO_URI/$ECR_REPO_NAME:$DOCKER_TAG",
              "docker tag $DOCKER_IMAGE:$GITHUB_COMMIT_ID $ECR_REPO_URI/$ECR_REPO_NAME:$GITHUB_COMMIT_ID",
              "docker push --all-tags $ECR_REPO_URI/$ECR_REPO_NAME",
            ]
          },
          post_build: {
            commands: [
              "echo \"In Post - Build Stage\"",
              "cd ..",
              `printf '[{ \"name\":\"${props.ecsAppName.toLowerCase()}\",\"imageUri\":\"%s\"}]' $ECR_REPO_URI/$ECR_REPO_NAME:$DOCKER_TAG > imagedefinitions.json`,
              "pwd; ls -al; cat imagedefinitions.json"
            ]
          }
        },
        artifacts: {
          files: [
            "imagedefinitions.json"
          ]
        }
      })
    });
    /**
     * CodePipeline Artifacts
     */
    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();
    /**
     * CodePipeline Actions
     */
    const sourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
      actionName: "GithubSourceAction",
      owner: props.githubOwner,
      repo: props.githubRepo,
      branch: props.githubBranch,
      connectionArn: props.githubConnectionArn,
      output: sourceOutput,
    })
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: "CodeBuild",
      project: project,
      input: sourceOutput,
      outputs: [buildOutput], // optional
    });
    /*
    const manualApprovalAction = new codepipeline_actions.ManualApprovalAction({
      actionName: "Approve",
    });
    */
    const deployAction = new codepipeline_actions.EcsDeployAction({
      actionName: "DeployAction",
      service: fargateService.service,
      imageFile: new codepipeline.ArtifactPath(buildOutput, `imagedefinitions.json`)
    });
    /**
     * CodePipelines Stages
     */
    new codepipeline.Pipeline(this, "CodePipeline", {
      stages: [{
        stageName: "Source",
        actions: [sourceAction],
      }, {
        stageName: "Build",
        actions: [buildAction],
      }, /*{
          stageName: "Approve",
          actions: [manualApprovalAction],
        }, */{
        stageName: "Deploy",
        actions: [deployAction],
      }
      ]
    });
    /**
     * Permissions and Grants
     */
    ecrRepo.grantPullPush(project.role!)
    project.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "ecs:DescribeCluster",
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ],
      resources: [`${cluster.clusterArn}`],
    }));
    /**
     * Output
     */
    new CfnOutput(this, "LoadBalancerDNS", {
      value: fargateService.loadBalancer.loadBalancerDnsName
    });
  }
}