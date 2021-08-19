import { expect as expectCDK, haveResource } from "@aws-cdk/assert"
import { Stack } from "@aws-cdk/core"
import { SecureRootUser } from "../lib/secure-root-user"

test("Get 2FA and Access key rules", () => {
  const stack = new Stack()

  new SecureRootUser(stack, "secureRootUser", { notificationEmail: "test@amazon.com" })

  expectCDK(stack).to(
    haveResource("AWS::Config::ConfigRule", {
      Source: {
        Owner: "AWS",
        SourceIdentifier: "ROOT_ACCOUNT_MFA_ENABLED"
      }
    })
  )
  expectCDK(stack).to(
    haveResource("AWS::Config::ConfigRule", {
      Source: {
        Owner: "AWS",
        SourceIdentifier: "IAM_ROOT_ACCESS_KEY_CHECK"
      }
    })
  )

  expectCDK(stack).to(
    haveResource("AWS::SNS::Topic")
  )
})
