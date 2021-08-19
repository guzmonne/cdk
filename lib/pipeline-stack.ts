import { Construct, Stage, Stack, SecretValue } from "@aws-cdk/core"
import * as pipelines from "@aws-cdk/pipelines"
import * as codepipeline from "@aws-cdk/aws-codepipeline"
import * as codepipeline_actions from "@aws-cdk/aws-codepipeline-actions"
import * as iam from "@aws-cdk/aws-iam"
import type { StackProps } from "@aws-cdk/core"

/**
 * PipelineStackProps represent the PipelineStack properties.
 */
export interface PipelineStackProps extends StackProps {
  /**
   * app must point to the file that defines the application to deploy. For example
   * `bin/organizations.ts`.
   */
  app: string;
  /**
   * githubRepo corresponds to the name of the repo, without the username.
   */
  githubRepo: string;
  /**
   * gitHubOwner corresponds to the GitHub account/user that owns the repo.
   */
  githubOwner: string;
  /**
   * githubRepoBranch represents the GitHub repository branch that will be tracked by the pipeline.
   */
  githubRepoBranch: string;
  /**
   * githubConnectionArn os the GitHub connection ARN generated using the AWS console.
   */
  githubConnectionArn: string;
  /**
   * pipelineDeployableRegions holds the regions where the application will be deployed.
   * These regions will be bootstraped with resources necessary to run the pipeline.
   *
   * See https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html
   */
  readonly pipelineDeployableRegions: string[];
}

export class PipelineStack extends Stack {
  /**
   * Constructor
   *
   * @param scope - The parent Construct instantiating this account.
   * @param id - The instance unique identifier.
   * @param props - Pipeline properties.
   */
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props)
    /**
     * Artifacts
     */
    const sourceArtifact = new codepipeline.Artifact()
    const cloudAssemblyArtifact = new codepipeline.Artifact()
    /**
     * Pipeline
     */
    const pipeline = new pipelines.CodePipeline(this, "Pipeline", {
      synth: new pipelines.ShellStep("Synth", {
        input: pipelines.CodePipelineSource.connection(`${props.githubOwner}/${props.githubRepo}`, props.githubRepoBranch, {
          /**
           * connectionArn is a GitHub connection created using the AWS console to authenticate
           * to GitHub.
           */
          connectionArn: props.githubConnectionArn,
        }),
        commands: [
          "npm run test",
          `npx cdk synth --app="npx ts-node ${props.app}"`,
        ]
      })
    })

    const pipelineOld = new pipelines.CdkPipeline(this, "Pipeline", {
      pipelineName: "DevopsPipeline",
      cloudAssemblyArtifact,
      sourceAction: new codepipeline_actions.GitHubSourceAction({
        actionName: "GitHub",
        output: sourceArtifact,
        branch: props.githubRepoBranch,
        oauthToken: SecretValue.secretsManager("GITHUB_TOKEN"),
        owner: props.githubOwner,
        repo: props.githubRepo,
      }),
      synthAction: pipelines.SimpleSynthAction.standardNpmSynth({
        sourceArtifact,
        cloudAssemblyArtifact,
        subdirectory: "bin/",
        installCommand: "npm install",
        testCommands: ["npm test"],

      })
    })
  }
}