# Amazon Cognito

## Introduction

Amazon Cognito provide authentication, authorization, and user management for
your web and mobile applications. It suppors third-party authentications, as
well as normal user/password authentication.

The two main components of Amazon Cognito are:

1. User Pools: Directories that provide sign-up and sign-in options.
2. Identity Pools: Enable you to grant your users access to other AWS Services.

## SDK

Amazon Cognito provides a JavaScript SDK called:
[`@aws-sdk/client-cognito-identity-provider`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cognito-identity-provider/index.html)

It can be installed through `npm`.

### Getting Started

Import the `CognitoIdentityProvider` class and configure it with the proper
credentials and region:

```typescript
import {CognitoIdentityProvider} from "@aws-sdk/client-cognito-identity-provider"

const client = new CognitoIdentityProvider({
  region: process.env.AWS_REGION || "us-east-1"
})
```

## Sign Up

There are many ways to sign user to your app:

1. User's sings themselves.
2. Importing a CSV file.
3. Create users as an administrator.

### Importing users from CSV files

You can bulk create users by providing a specificaly formatted CSV file. The
rows of the CSV file will contain all the information about the users except
theeir `password`. User's will be required to change their passwords on their
first sing in. In cognito's terms: users will be created in `RESET_REQUIRED`
state when imported using this method.

Here is a sample of a valid CSV file to import users:

```csv
cognito:username,name,given_name,family_name,middle_name,nickname,preferred_username,profile,picture,website,email,email_verified,gender,birthdate,zoneinfo,locale,phone_number,phone_number_verified,address,updated_at,cognito:mfa_enabled
John,,John,Doe,,,,,,,johndoe@example.com,TRUE,,02/01/1985,,,+12345550100,TRUE,123 Any Street,,FALSE
Jane,,Jane,Roe,,,,,,,janeroe@example.com,TRUE,,01/01/1985,,,+12345550199,TRUE,100 Main Street,,FALSE
```

Some important considerations:

1. The following attributes are required:
  - `cognito:username`
  - `cognito:mfa_enabled`
  - `email_verified` or `phone_number_verified`
  - `email` (if `email_vefified` is `true`)
  - `phone_number` (if `phone_number_verified` is `true`)
  - Any other attribute marked as `required` when creating the User Pool.
2. Eiter `email_verified` or `phone_number_verified` must be `true` for **all**
   users. Else, the bulk import won't start. An email or SMS will be send to
   each user so they can update their passwords.
3. The `header` row is **required**.
4. The maximum file size is 100MB.
5. The maximum number of users is 500.000.

### CloudWatch Logs IAM Role

The following role must be created to enable Amazon Cognito to record
information in CloudWatch Logs about the User Pool import job.

#### Access Policy

> Modify the value of `REGION` and `ACCOUNT` accordingly before creating the policy.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:DescribeLogStreams",
                "logs:PutLogEvents"
            ],
            "Resource": [
                "arn:aws:logs:REGION:ACCOUNT:log-group:/aws/cognito/*"
            ]
        }
    ]
}
```

#### Trust Policy

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "cognito-idp.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
```

### Example: Create a User Import Job from the SDK

The `createUserImportJob` method on the `CognitoIdentityProvider` client creates
a new job that can import users from a CSV file. It returns a signed endpoint
that we can use to upload our CSV file for import.

First, run the method with appropiate configuration:

```typescript
const {UserImportJob} = await client.createUserImportJob({
  /**
   * CloudWatchLogsRoleArn is the role ARN for the Amazon CloudWatch Loggin
   * role for the user import job.
   */
  CloudWatchLogsRoleArn: process.env.AMAZON_CLOUDWATCH_LOGS_ROLE_ARN,
  /**
   * JobName represents the job name.
   */
  JobName: "JobName",
  /**
   * UserPoolId is the user pool ID for the user pool that the users are being
   * imported into.
   */
  UserPoolId: process.env.AMAZON_COGNITO_USER_POOL_ID,
})
```

Inside the `UserImportJob` object we can find all th information related to the
job. Especially the value of the `PreSignedUrl` that we have to use to upload
the file.

We can then check the status of the job by running the `describeUserImportJobs`
method or list all the jobs using the `listUserImportJobs` method.

## Lambda Triggers

You can create Lambda functions that will get trigger during certain user pool
operations to add authentication challenges, migrate users, or customize
verification messages.

Some of the most notable trigger are:

- [`Pre Token
  Generation`](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html):
  Augment or supress token claims.
- [`Custom
  Message`](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-message.html):
  Advanced customization and localization of messages.

## CDK

For both the `emailBody` and `smsMessage` properties, you can configure the
following substrings that will be populated by Cognito before sending them:

| Description | Token |
| --- | --- |
| Verification code | `{####}` |
| Temporary password | `{####}` |
| User name | `{username}` |
| IP address | `{ip-address}` |
| City | `{city}` |
| Country | `{country}` |
| Login Time | `{login-time}` |
| Device Name | `{device-name}` |
| One click link is valid | `{one-click-link-valid}` |
| Onc click link is invalid | `{one-click-link-invalid}` |
| Event id | `{event-id}` |
| Feedback token | `{feedback-token}` |

> User pols can either be configured so that the `username` is the primary sign
> in (with other methods as optional); or it can be configured so that only
> email and phone numbers are allowed.

Cognito comes pre-configured to support a long list of attributes to define each
user. If these attributes are not enough, custom ones can be added by the
administrator. Any attribute can be configured as `required`, meaning that it
needs to always be present; and `mutable`, meaning that it can be modified.

The default account recovery mechanisms is by phone, if available, or email.
Users can't recover their accounts through the phone if they are also using it
as their MFA device.

```ts
new cognito.UserPool(this, "UserPool", {
  /**
   * userPoolName is the name of the User Pool. If none is provided CDK will
   * automatically generate one.
   */
  userPoolName: "userPool",
  /**
   * selfSignUpEnbled is a Flag that indicates if users can create their own
   * accounts or only an administrator user can do it.
   */
  selfSignUpEnabled: true,
  /**
   * userVerification holds the configuration available for a user to confirm
   * their credentials details.
   */
  userVerification: {
    /**
     * emailSubject will be the subject of the email sent to the user.
     */
    emailSubject: "Email Subject",
    /**
     * emailBody will populate the verification email value by default.
     */
    emailBody: "Email Body",
    /**
     * emailStyle defines the style of verification to use.
     */
    emailStyle: cognito.VerificationEmailStyle.CODE,
    /**
     * smsMessage will populate the content of the SMS sent to the user to
     * verify themselves.
     */
    smsMessage: "SMS Message",
  },
  /**
   * userInvitation configures the message that gets send to the user after an
   * administrator creates an account for them using the admin API.
   */
  userInvitation: {
    /**
     * emailSubject will be the subject of the email sent to the user.
     */
    emailSubject: "Email Subject",
    /**
     * emailBody will populate the verification email value by default.
     */
    emailBody: "Email Body",
    /**
     * smsMessage will populate the content of the SMS sent to the user to
     * verify themselves.
     */
    smsMessage: "SMS Message",
  },
  /**
   * signInAliases configures the valid aliases a user can use to authenticate
   * itself through the sign in flow.
   */
  signInAliases: {
    /**
     * username allows signing in using the one time immutable user name that
     * the user chose at the time of sign up.
     */
    username: true,
    /**
     * email allows signin in using the email address that is associated with
     * the account.
     */
    email: true,
    /**
     * phone allows signin in using the phone number that is assciated with the
     * account.
     */
    phone: true,
    /**
     * preferredUsername allows signin in with an alternate user name that can
     * be changed by the user at any time. However, this is not available if
     * the `username` option is not chosen.
     */
    preferredUsername: true,
  },
  /**
   * autoVerify makes the email or phone number automatically valid after a
   * user is created. This is necessary if the `signInAliases` configured are
   * any of them.
   */
  autoVerifiy: {
    /**
     * email is auto verified.
     */
    email: true,
    /**
     * phone is auto verified.
     */
    phone: true,
  },
  /**
   * standardAttributes holds the configuration for Amazon Cognito's standard
   * attributes.
   */
  standardAttributes: {
    fullname: {
      /**
       * required indicates that the attribute should always be present.
       */
      required: true,
      /**
       * mutable indicates that the attribute can be modified.
       */
      modified: true,
    }
    /**
     * For a complete list of attributes please refer to the following
     * link: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html
     */
  },
  /**
   * customAttributes holds the configuraton of Amazon Cognito's custom
   * attributes.
   */
  customAttributes: {
    "stringAttribute": new cognito.StringAttribute({/* String attribute props */}),
    "numberAttribute": new cognito.NumberAttribute({/* Number attribute props */}),
    "booleanAttribute": new cognito.BooleanAttribute({/* Boolean attribute props */}),
    "dateTimeAttribute": new cognito.DateTimeAttribute({/* DateTime attribute props */}),
  }
  /**
   * mfa configures the behaviour of multi factor authentication in the user poo.
   */
  mfa: cognito.Mfa.REQUIRED,
  /**
   * mfaSecondFactor configures the valid second factors supported.
   */
  mfaSecondFactor: {
    /**
     * sms allows SMS as second factor.
     */
    sms: true,
    /**
     * otp allows One Time Password apps to be used as second factos.
     */
    otp: true,
  },
  /**
   * passwordPolicy configures the policies that a password must comply for it
   * to be considered valid. It also sets the configuration of the expiration of
   * temprary passwords generate by creating a user using the admin API.
   */
  passwordPolicy: {
    /**
     * minLength sets the minimum length for a password.
     */
    minLength: 12,
    /**
     * requiresLowercase indicates that passwords require at least one lowercase letter.
     */
    requiresLowercase: true,
    /**
     * requiresUppercase indicates that passwords require at least one uppercase letter.
     */
    requireUppercase: true,
    /**
     * requireDigits indicates that passwords require at least one digit.
     */
    requiresDigits: true,
    /**
     * requireSymbols indicates that passwords require at least one symbol.
     */
    requireSymbols: true,
    /**
     * tempPasswordValidity sets the validity duration of temporary passwords.
     */
    tempPasswordValidity: Duration.days(3),
  },
  /**
   * accountRecovery sets the type of recovery flow available to the user.
   */
  accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
  /**
   * lambdaTriggers configures the different lambda triggers available.
   */
  lambdaTriggers: {
    /**
     * createAuthChallenge sets the lambda trigger to create a custom auth challenge.
     */
    createAuthChallenge: authChallengeFn,
    /**
     * See the documentation for more available lambda triggers.
     *
     * Triggers can be configured using the `userPool.addTrigger` method.
     *
     * Use the `function.attachToRolePolicy()` to add additional IAM permissions
     * to the lambda trigger. Except to add permissions to interact with the
     * user pool itself. If this is the case, use the `attachInlinePolicy` method
     * over the function role.
     */
  },
})
```

### Security

By default, CDK will create the necessary roles to send SMS messages to the
users.

Also, MFA can be configued as either: `off`, `optional`, or `required`. Optional
means that the user has the possibility of configuring MFA by themselves when
they want.

### Emails

By default, Amazon Cognito comes configured to use an internal engine to send
messages. This engine has a limit quota that is not set to handle production
environments. For production, it is recommended to configure SES as the main way
of sending emails to the users.

Unfortunately, the high level `UserPool` construct doesn't support configuring
SES as the default email engine. A workaround is to configure the [underlying
CFN
resource](https://docs.aws.amazon.com/cdk/latest/guide/cfn_layer.html#cfn_layer_resource)
encapsulated by the construct.

```typescript
const cfnUserPool = userPool.node.defaultChild as cognito.CfnUserPool

cfnUserPool.emailConfiguration = {
  emailSendingAccount: "DEVELOPER",
  /**
   * from is the email account from which the email will be delivered.
   */
  from: `Someone from MyService <${fromEmailAddress}>`,
  /**
   * sourceArn should correspond to a valid SES ARN.
   */
  sourceArn: `arn:aws:ses:eu-west-1:${this.account}:identity/${fromEmailAddress}`,
};
```

> The `fromEmailAddress` being used on the above snippet must be verified in SES
> and the SES account must be moved out of the SES Sandbox to send emails to
> unverified email addresses.



