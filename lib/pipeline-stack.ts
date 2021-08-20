import { Construct, Stage, Stack, SecretValue } from "@aws-cdk/core"
import * as pipelines from "@aws-cdk/pipelines"
import * as codepipeline from "@aws-cdk/aws-codepipeline"
import * as codepipeline_actions from "@aws-cdk/aws-codepipeline-actions"
import * as iam from "@aws-cdk/aws-iam"
import type { StackProps } from "@aws-cdk/core"

import { AppStack } from "./app"

/**
 * PipelineStackProps represent the PipelineStack properties.
 */
export interface PipelineStackProps extends StackProps {
  /**
   * devAccountId corresponds to the ID of the development account.
   */
  devAccountId: string;
  /**
   * app must point to the file that defines the application to deploy. For example
   * `bin/organizations.ts`.
   */
  app: string;
  /**
   * selfMutation must be set if the CDK Pipeline will update itself.
   */
  selfMutation?: boolean;
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
}
/**
 * PipelineStack is the Construct that represents a CodePipeline service connected to this GitHub's
 * repository, that reacts to new commits done to master, and redeploy's itself an other services
 * using CDK.
 */
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
     * CDK Pipeline
     */
    const cdkPipeline = new pipelines.CodePipeline(this, "Pipeline", {
      selfMutation: props.selfMutation || false,
      synth: new pipelines.ShellStep("Synth", {
        input: pipelines.CodePipelineSource.connection(`${props.githubOwner}/${props.githubRepo}`, props.githubRepoBranch, {
          /**
           * connectionArn is a GitHub connection created using the AWS console to authenticate
           * to GitHub.
           */
          connectionArn: props.githubConnectionArn,
        }),
        installCommands: [
          "npm install",
          "npm run lambda:build",
        ],
        commands: [
          "npm run test",
          `npx cdk synth --app="npx ts-node ${props.app}"`,
        ]
      })
    })
    /**
     * Stages
     */
    cdkPipeline.addStage(new AppStack(this, "Dev", {
      env: {
        account: props.devAccountId,
        region: Stack.of(this).region,
      }
    }))
  }
}