import { Construct, Stack } from "@aws-cdk/core"
import * as pipelines from "@aws-cdk/pipelines"
import type { StackProps } from "@aws-cdk/core"

import { DevStage } from "./dev-stage"
/**
 * CDKPipelineStackProps represent the CDKPipelineStack properties.
 */
export interface CDKPipelineStackProps extends StackProps {
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
   * selfMutation must be set if the CDK Pipeline will update itself. {@default true}
   */
  selfMutation?: boolean;
  /**
   * githubConnectionArn is the GitHub connection ARN generated using the AWS console to connect
   * to the `Empatho-Corp/Empatho-AWS-Infrastructure` repository.
   */
  githubConnectionArn: string;
}
/**
 * CDKPipelineStack is the Construct that represents a CodePipeline service connected to this GitHub's
 * repository, that reacts to new commits done to master, and redeploy's itself an other services
 * using CDK.
 */
export class CDKPipelineStack extends Stack {
  /**
   * Constructor
   *
   * @param scope - The parent Construct instantiating this account.
   * @param id - The instance unique identifier.
   * @param props - Pipeline properties.
   */
  constructor(scope: Construct, id: string, props: CDKPipelineStackProps) {
    super(scope, id, props)
    /**
     * CDK Pipeline
     */
    const cdkPipeline = new pipelines.CodePipeline(this, "CodePipeline", {
      selfMutation: props.selfMutation || true,
      synth: new pipelines.ShellStep("Synth", {
        input: pipelines.CodePipelineSource.connection("Empatho-Corp/Empatho-AWS-Infrastructure", "master", {
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
    cdkPipeline.addStage(new DevStage(this, "DevStage", {
      env: {
        account: props.devAccountId,
        region: Stack.of(this).region,
      },
      empathoNodejsApp: {
        githubConnectionArn: props.githubConnectionArn,
      }
    }))
  }
}