import { Construct, Duration, SecretValue, CfnOutput } from "@aws-cdk/core"
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
   * githubSecret is the ID or ARN of the secret.
   */
  githubSecret: string;
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
export class EcsApp extends Construct {
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
     * ECS VPC
     */
    const vpc = new ec2.Vpc(this, "EcsAppVpc", {
      cidr: props.vpcCidr,
      natGateways: 1,
      maxAzs: 3
    });
    /**
     * ECS Cluster Admin Role
     */
    const clusterAdmin = new iam.Role(this, "EcsAppClusterAdminRole", {
      assumedBy: new iam.AccountRootPrincipal()
    });
    /**
     * ECS Cluster
     */
    const cluster = new ecs.Cluster(this, "EcsAppCluster", {
      vpc: vpc,
    });
    /**
     * ECS AWS Log Driver
     */
    const logging = new ecs.AwsLogDriver({
      streamPrefix: "EcsAppLogs"
    });
    /**
     * ECS Task Role
     */
    const taskRole = new iam.Role(this, `EcsAppTaskRole-${props.ecsAppName}`, {
      roleName: `EcsAppTaskRole-${props.ecsAppName}`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com")
    });
    /**
     * ECS Task
     */
    const taskDef = new ecs.FargateTaskDefinition(this, "EcsAppFargateTaskDefinition", {
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
      image: ecs.ContainerImage.fromRegistry(`${props.ecsContainerImage}:${props.ecsContainerTag || "latest"}`),
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
    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "EcsAppApplicationLoadBalancedFargateService", {
      cluster: cluster,
      taskDefinition: taskDef,
      publicLoadBalancer: true,
      desiredCount: 3,
      listenerPort: 80
    });
    /**
     * ECS Fargate Service Auto Scaling
     */
    const scaling = fargateService.service.autoScaleTaskCount({ maxCapacity: 6 });
    scaling.scaleOnCpuUtilization("EcsAppCpuScaling", {
      targetUtilizationPercent: 10,
      scaleInCooldown: Duration.seconds(60),
      scaleOutCooldown: Duration.seconds(60)
    });
    /**
     * ECR Repository
     */
    const ecrRepo = new ecr.Repository(this, "EcrRepository");
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
    // CODEBUILD - project
    const project = new codebuild.Project(this, "EcsAppCodeBuildProject", {
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
        }
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          pre_build: {
            commands: [
              "env",
              "export TAG=${CODEBUILD_RESOLVED_SOURCE_VERSION}"
            ]
          },
          build: {
            commands: [
              "cd flask-docker-app",
              `docker build -t $ECR_REPO_URI:$TAG .`,
              "$(aws ecr get-login --no-include-email)",
              "docker push $ECR_REPO_URI:$TAG"
            ]
          },
          post_build: {
            commands: [
              "echo \"In Post - Build Stage\"",
              "cd ..",
              "printf '[{ \"name\":\"flask-app\",\"imageUri\":\"%s\"}]' $ECR_REPO_URI: $TAG > imagedefinitions.json",
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
    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: "EcsAppGithubSourceAction",
      owner: props.githubOwner,
      repo: props.githubRepo,
      branch: props.githubBranch,
      oauthToken: SecretValue.secretsManager(props.githubSecret),
      output: sourceOutput
    });
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: "EcsAppCodeBuild",
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
      actionName: "EcsAppDeployAction",
      service: fargateService.service,
      imageFile: new codepipeline.ArtifactPath(buildOutput, `imagedefinitions.json`)
    });
    /**
     * CodePipelines Stages
     */
    new codepipeline.Pipeline(this, "EcsAppCodePipeline", {
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
    new CfnOutput(this, "EcsAppLoadBalancerDNS", {
      value: fargateService.loadBalancer.loadBalancerDnsName
    });
  }
}