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
  githubConnectionArn: "arn:aws:codestar-connections:us-east-1:925638840915:connection/207b4297-7965-47ab-873e-4237bb1c901f",
  githubOwner: "guzmonne",
  githubRepo: "cdk",
})