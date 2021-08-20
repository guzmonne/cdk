# Organizations

This document details the procedures needed to setup the following AWS
Organizations structures on the root account:

- Root Account
  - CICD OU
    - CICD Account
  - Development OU
    - Dev Account
    - Staging Account
  - Production OU
    - Prod Account

## AWS Organizations

AWS Organizations is an account management service that lets you consolidate
multiple AWS accounts into an organization that you create and centrally manage.
With AWS Organizations, you can create member accounts and invite existing
accounts to join your organization. You can organize those accounts and manage
them as a group.

## Deployment

### Bootstrap AWS Organizations

A CDK stack has been provided to:

- Create an AWS Organization in the main account.
- Enforce secure account access by:
  - Enforcing MFA usage on the root account user.
  - Enforcing deletion of access and secret keys on the root account user.
  - Activating and centralizing AWS CloudTrail to keep track of all accounts.

The stack provided at `bin/organizations.ts` holds the tree structure at the
global `nestedOU` variable. To deploy a new version of this tree, or change its
characteristics you must modify this variable before deploying the stack.

To deploy the stack follow these instructions:

Install all dependencies and run the lambda build task to make sure we have the
compiled versions of all the lambda functions.

```sh
npm install
npm run lambda:build
```

Configure the following environment variables:

```sh
export PROFILE=<aws_profile>
export EMAIL=<root_account_email>
export AWS_ACCOUNT_ID=<aws_account_id>
export AWS_REGION=<aws_region>
```

Use this as an example:

```sh
export PROFILE=root
export EMAIL=example@gmail.com
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-east-1
```

> You can get your `aws_account_id` through the management console or using the
> AWS `cli` running the following command `aws sts get-caller-identity --profile
> $PROFILE`

Set up the necessary CloudFormation stacks required by CDK to deploy
infrastructure changes to an account.

```sh
npm run bootstrap -- aws://$AWS_ACCOUNT_ID/$AWS_REGION --profile $PROFILE
```

> Make sure to load the environment variables before running this command.

Before deploying run the `diff` command to check the list of resources to be
created on the account.

```sh
npm run organizations:diff -- --profile $PROFILE --context email=$EMAIL
```

If everything checks out deploy the stack.

```sh
npm run organizations:deploy -- --profile $PROFILE --context email=$EMAIL
```

At some point you'll receive a notification on the provided SNS topic. You must
subscribe to the topic in order to start receiving root user account rule
enforcenemt notifications.


