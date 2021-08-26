import { App } from "@aws-cdk/core"

import { OrganizationsStack } from "../lib/organizations-stack"
import { AccountType } from "../lib/account"

/**
 * App
 */
const app = new App()
/**
 * Context
 */
const email = app.node.tryGetContext("email")
const forceEmailVerification = app.node.tryGetContext("force_email_verification")
const nestedOU = [{
  name: "DevOps",
  accounts: [{
    name: "CICD",
    email: "mpiamonne+cicd@gmail.com",
    type: AccountType.CICD,
  }]
}, {
  name: "Development",
  accounts: [{
    name: "Dev",
    email: "mpiamonne+dev@gmail.com",
    type: AccountType.PLAYGROUND,
  }, {
    name: "Staging",
    email: "mpiamonne+staging@gmail.com",
    type: AccountType.STAGE,
    stageName: "staging",
    stageOrder: 1,
    hostedServices: ["ALL"],
  }]
}, {
  name: "Production",
  accounts: [{
    name: "Prod",
    email: "mpiamonne+prod@gmail.com",
    type: AccountType.STAGE,
    stageName: "prod",
    stageOrder: 2,
    hostedServices: ["ALL"],
  }]
}]
/**
 * AWS Organizations Stack
 */
new OrganizationsStack(app, "Organizations", {
  email,
  nestedOU,
  forceEmailVerification,
})