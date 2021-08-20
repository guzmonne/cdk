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

The connection will have the same level of access as the user who accepted the
connection on its GitHub account.

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
```

Beforw deploying the app run the `diff` command to se a list of the
modifications that will be applied.

```sh
npm run cdk-pipeline:diff -- --profile $PROFILE
```

If everything checks out, deploy the stack:

```sh
npm run cdk-pipeline:deploy -- --profile $PROFILE
```