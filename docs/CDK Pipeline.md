# CDK Pipeline

This document details the procedures needed to setup the CDK Pipeline. The CDK
Pipeline is a CI/CD resource that will keep track of the `master` branch of the
`Empatho-Corp/Empatho-AWS-Infrastructure` repository, and apply the
configurations stated on the `bin/cdk-pipeline.ts` app.

## Deployment

The `bin/cdk-pipeline.ts` app must be deployed once using the root user
credentials. After the first run, subsequent runs will be done by CodePipeline
whenever a new `commit` gets pushed to the `master` branch of the
`Empatho-Corp/Empatho-AWS-Infrastructure` repository. The profile used for the
first run must correspond to the management account of the root account.

### Github connection

The `cdk-pipeline` app needs access to two GitHub repositories:

- `Empatho-Corp/Empatho-AWS-Infrastructure`
- `Empatho-Corp/Empatho-Nodejs-App`

We need to manually create a GitHub connection using the AWS `cli` and then
store the connection `ARN` on the project context (on the file `cdk.json`).

To create a connection to GitHub using the AWS `cli` follow this instructions:

Configure your AWS profile as an environment variable

```sh
export PROFILE=<aws_profile>
```

Use the `create-connection` method of the `codestar-connection` service to
create the connection to GitHub.

```sh
aws codestar-connections create-connection --provider-type GitHub --connection-name EmpathoCorpGithubConnection --profile $PROFILE
```

A connection created through the `cli` will have a `PENDING` status. To activate
it you need to:

1. Access the [connections
   page.](https://console.aws.amazon.com/codesuite/settings/connections)
2. Choose `Settings > Connections`.
3. In `Name`, choose the name of the pending connection you want to update.
4. Choose `Update a pending connection`.
5. On the `Connect to Github` page accept and create the connection.
6. Click on `Install a new app`.
7. Select the `Empatho-Corp` organization.
8. Click `Connect`.

The connection must be created from a user who has

### Procedure

Make sure all dependencies have been installed, as well as all the lambda
functions.

```sh
npm install
npm run lambda:build
```

Then, configure the following environment variables on your session.

```sh
export PROFILE=<aws_profile>
export AWS_ACCOUNT_ID=<aws_account_id>
export AWS_REGION=<aws_region>
export ECR_REPO_URI=$AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

Use this as an example:

```sh
export PROFILE=root
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-east-1
export ECR_REPO_URI=$AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

> You can get your `aws_account_id` through the management console or using the
> AWS `cli` running the following command `aws sts get-caller-identity --profile
> $PROFILE`

Beforw deploying the app run the `diff` command to se a list of the
modifications that will be applied.

```sh
npm run cdk-pipeline:diff -- --profile $PROFILE
```

If everything checks out, deploy the stack:

```sh
npm run cdk-pipeline:deploy -- --profile $PROFILE
```

When running the stack for the first time a bug appears that impedes the
creation of the ECS service. The problem is that the Fargate service is trying
to start a container from an image that doesn't exists yet. So, we need to
create the initial image, and push it manually to ECR to avoid this problem. We
are going to need to get the name of the ECR repository. We can do this through
the Management Console or using the API:

```sh
aws ecr describe-repositories --profile $PROFILE
```

Create an environment variable holding the name of the repository.

```sh
export ECR_REPO_NAME=<ecr_repo_name>
```

Go to your project and run the following commands to `build` and `push` the
first container image.


```sh
docker build -t empathonodejsapp:latest .
docker tag empathonodejsapp:latest $ECR_REPO_URI/$ECR_REPO_NAME
docker push --all-tags $ECR_REPO_URI/$ECR_REPO_NAME
```