# Amazon Cognito

## Introduction

Amazon Cognito provides authentication, authorization, and user management for
your web and mobile applications. It supports third-party authentications, as
well as standard user/password authentication.

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

You can bulk create users by providing a specifically formatted CSV file. The
rows of the CSV file will contain all the information about the users except
their `password`. Users will be required to change their passwords on their
first sign-in. In Cognito's terms: users will be created in `RESET_REQUIRED`
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
   users. Else, the bulk import won't start. An email or SMS will be sent to each user so they can update their passwords.
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
   * imported.
   */
  UserPoolId: process.env.AMAZON_COGNITO_USER_POOL_ID,
})
```

Inside the `UserImportJob` object, we can find all the information related to the
job. Especially the value of the `PreSignedUrl` that we have to use to upload
the file.

We can then check the status of the job by running the `describeUserImportJobs`
method or list all the jobs using the `listUserImportJobs` method.

## Lambda Triggers

You can create Lambda functions that will get trigger during some user pool
operations to add authentication challenges, migrate users or customize
verification messages.

Some of the most notable triggers are:

- [`Pre Token
  Generation`](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html):
  Augment or suppress token claims.
- [`Custom
  Message`](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-message.html):
  Advanced customization and localization of messages.

## CDK

### User Pools

For both the `emailBody` and `smsMessage` properties, you can configure the
following substrings that Cognito will populate before sending them:

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
must always be present, and `mutable`, meaning that it can be modified.

The default account recovery mechanisms are by phone, if available, or email.
Users can't recover their accounts through the phone if they use it
as their MFA device.

```ts
new cognito.UserPool(this, "UserPool", {
  /**
   * userPoolName is the name of the User Pool. If none is provided, CDK will
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
   * userInvitation configures the message that gets sent to the user after an
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
   * itself through the sign-in flow.
   */
  signInAliases: {
    /**
     * username allows signing in using the one-time immutable user name that
     * the user chose at the time of sign up.
     */
    username: true,
    /**
     * email allows sign-in in using the email address that is associated with
     * the account.
     */
    email: true,
    /**
     * phone allows sign-in in using the phone number that is associated with the
     * account.
     */
    phone: true,
    /**
     * preferredUsername allows signing in with an alternate user name that can
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
     * For a complete list of attributes, please refer to the following
     * link: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html
     */
  },
  /**
   * customAttributes holds the configuration of Amazon Cognito's custom
   * attributes.
   */
  customAttributes: {
    "stringAttribute": new cognito.StringAttribute({/* String attribute props */}),
    "numberAttribute": new cognito.NumberAttribute({/* Number attribute props */}),
    "booleanAttribute": new cognito.BooleanAttribute({/* Boolean attribute props */}),
    "dateTimeAttribute": new cognito.DateTimeAttribute({/* DateTime attribute props */}),
  }
  /**
   * mfa configures the behavior of multi-factor authentication in the user poo.
   */
  mfa: cognito.Mfa.REQUIRED,
  /**
   * mfaSecondFactor configures the valid second factors supported.
   */
  mfaSecondFactor: {
    /**
     * sms allows SMS as a second factor.
     */
    sms: true,
    /**
     * otp allows One Time Password apps to be used as the second factor.
     */
    otp: true,
  },
  /**
   * passwordPolicy configures the policies that a password must comply with for it
   * to be considered valid. It also sets the configuration of the expiration of
   * temporary passwords generate by creating a user using the admin API.
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

Also, MFA can be configured as either: `off`, `optional`, or `required`. Optional
means that the user has the possibility of configuring MFA by themselves when
they want.

### Emails

By default, Amazon Cognito comes configured to use an internal engine to send
messages. This engine has a limit quota that is not set to handle production
environments. For production, it is recommended to configure SES to send emails to the users.

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

### App Clients

An App is an entity within a user pool with permissions to call
unauthenticated APIs such as register, sign in, and forgotten passwords. To
reach these APIs, you need an app client ID and an optional client secret.

```typescript
const pool = new cognito.UserPool(this, "pool")
const client = pool.addClient("app-client", {
  /**
   * preventUserExistenceErrors is a flag that tells the client to return generic
   * authentication errors. Used to prevent user existence errors.
   */
  preventUserExistenceErrors: true,
})
const clientId = client.userPoolClientId
```

Clients can be configured with different authentication flows: Secure Remote
Password, username-and-password, etc.

```typescript
pool.addClient("app-client", {
  /**
   * authFlows configures the authentication flows supported by the client.
   */
  authFlows: {
    /**
     * userPassword configures the user-password authentication flow.
     */
    userPassword: true,
    /**
     * userSrp configures the user SRP authentication flow.
     */
    userSrp: true,
  }
})
```

Besides these flows, clients can be configured with OAuth 2.0 authorization flows
and scopes. The following snippet configures an app client with the
authorization code grant flow and registers the app's welcome page as a redirect
URL. It also configures the access token scope to `openid`, which is an OAuth
2.0 scope defined on the OAuth 2.0 RFC.

```typescript
pool.addClient("app-client", {
  /**
   * oAuth configures the client oAuth authentication flow.
   */
  oAuth: {
    /**
     * flows configures the different OAuth 2.0 flows provided by the RFC.
     */
    flows: {
      /**
       * authorizationCodeGrant configures the authorization code grant flow.
       */
      authorizationCodeGrant: true,
      /**
       * scopes set the OAuth scopes allowed on the client.
       */
      scopes: [cognito.OAuthScope.OPENID],
      /**
       * callbackUrls set the list of valid callback or redirect URLs to redirect
       * the user after signing in.
       */
      callbacksUrls: ["https://example.com/welcome"],
      /**
       * logoutUrls set the list of valid callback or redirect URLs to redirect
       * the user after signing out.
       */
      logoutUrls: ["https://example.com/signin"],
    },
  }
})
```

Following the OIDC open standard, Cognito user pool clients provide
access tokens, ID tokens, and refresh tokens. The expiration time for each token
can be configured as follows.

```typescript
pool.addClient("app-client", {
  /**
   * accessTokenValidity sets the validity duration of an access token.
   */
  accessTokenValidity: Duration.minutes(60),
  /**
   * idTokenValidity sets the validity duration of an id token.
   */
  idTokenValidity: Duration.minutes(60),
  /**
   * refreshTokenValidity sets the validity duration of a refresh token.
   */
  refreshTokenValidity: Duration.minutes(60),
})
```

## Resouce Servers

A resource server is a server for access-protected resources. It handles
authenticated requests from an app that has an access token.

An application may choose to model custom permissions via OAuth. Resource
servers provide this capability via custom scopes that are attached to an app
client. The following example sets up a resource server for the `users` resource
for two different app clients and configures the clients to use these scopes.

```typescript
const readOnlyScope = new ResourceServerScope({
  /**
   * scopeName defines the friendly name for the scope.
   */
  scopeName: "read",
  /**
   * scopeDescription describes the scope.
   */
  scopeDescription: "Read-only access",
})
const fullAccessScope = new ResourceServerScope({
  scopeName: "*",
  scopeDescription: "Full Access",
})

const userServer = pool.addResourceServer("ResourceServer", {
  /**
   * identifier is the id of the resource server.
   */
  identifier: "users",
  /**
   * scopes define the list of scopes supported by the resource server.
   */
  scopes: [readOnlyScope, fullAccessScope]
})

const readOnlyClient = pool.addClient("read-only-client", {
  // ...
  oAuth: {
    // ...
    scopes: [OAuthScope.resourceServer(userServer, readOnlyScope)]
  }
})

const fullAccessClient = pool.addClient("full-access-client", {
  // ...
  oAuth: {
    // ...
    scopes: [OAuthScope.resourceServer(userServer, fullAccessScope)]
  }
})
```

## Domains

After setting up an app client, the address for the user pool's sign-up and
sign-in webpages can be configured using domains. There are two ways to set up a
domain - either the Amazon Cognito hosted domain can be chosen with an available
domain prefix, or a custom domain name can be selected. The custom domain must be already owned, and whose certificate is registered in AWS
Certificate Manager.

The following code sets up a user pool domain in Amazon Cognito hosted domain
with the prefix `myapp`, and another domain with the custom domain
`custom.myapp.com`.

```typescript
pool.addDomain("CognitoDomain", {
  /**
   * cognitoDomain holds the configuration of the Cognito domain that serves the
   * authentication pages.
   */
  cognitoDomain: {
    /**
     * domainPrefix is the domain prefix to apply to Cognito's auth domain.
     */
    domainPrefix: "myapp",
  }
})

const certificateArn = "arn:aws:acm:us-east-1:123456789012:certificate/11-3336f1-44483d-adc7-9cd375c5169d"

const domainCert = certificatemanager.Certificate.fromCertificateArn(this, "domainCert", certificateArn)

pool.addDomain("CustomDomain", {
  /**
   * customDomain holds the configuration of the custom domain that server the
   * authentication pages.
   */
  customDomain: {
    /**
     * domainName is the custom domain name to be used.
     */
    domainName: "custom.myapp.com",
    /**
     * certificate is the domain certificate construct to use.
     */
    certificate: domainCert,
  }
})
```

The `signInUrl()` method returns the fully qualified URL to the login page for
the user pool. This page comes from the hosted UI configured with Cognito.

```typescript
const client = pool.addClient("Client", {
  // ...
  oAuth: {
    flows: {
      implicitCodeGrant: true,
    },
    callbackUrls: [
      "https://myapp.com/home",
      "https://myapp.com/users",
    ]
  }
})

const domain = userpool.addDomain("Domain", {/**/})

const signInUrl = domain.signInUrl(client, {
  /**
   * redirectUri to redirect the user after the sign-in process is done. It must
   * be one of the URLs configured on the client's `callbackUrls` property.
   */
  redirectUri: "https://myapp.com/home",
})
```

## Resources

- [Amazon Cognito Developer Guide](https://docs.aws.amazon.com/cognito/latest/developerguide/what-is-amazon-cognito.html)