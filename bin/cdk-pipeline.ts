import { App } from "@aws-cdk/core"

import { CDKPipelineStack } from "../lib/cdk-pipeline-stack"

/**
 * App
 */
const app = new App()
/**
 * CDK Pipeline Stack
 */
new CDKPipelineStack(app, "CDKPipelineStack", {
  app: "bin/cdk-pipeline.ts",
  devAccountId: "925638840915",
  githubConnectionArn: "arn:aws:codestar-connections:us-east-1:925638840915:connection/ddf4e02e-e664-4b4e-b620-0973ddd1a513",
})