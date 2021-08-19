import { Construct, Stack } from "@aws-cdk/core"
import * as cfg from "@aws-cdk/aws-config"
import * as sns from "@aws-cdk/aws-sns"
import * as snssubscriptions from "@aws-cdk/aws-sns-subscriptions"
import * as iam from "@aws-cdk/aws-iam"

import { ConfigRecorder } from "./config-recorder"

export interface SecureRootUserProps {
  /**
   * notificationEmail is the email account that will be notified upon finding
   * a lack of compliance on some rule.
   */
  notificationEmail: string;
}
/**
 * SecureRootUser is a Construct that applies configuration rules to the root
 * user accounts through AWS Config, and provides remediation mechanisms.
 */
export class SecureRootUser extends Construct {
  /**
   * Constructor
   *
   * @param scope - The parent Construct instantiating this account.
   * @param id - The instance unique identifier.
   * @param props - SecureRootUser properties.
   */
  constructor(scope: Construct, id: string, props: SecureRootUserProps) {
    super(scope, id)
    /**
     * SNS Notification Topic
     */
    const secureRootUserConfigTopic = new sns.Topic(this, "SecureRootUserConfigTopic")
    secureRootUserConfigTopic.addSubscription(new snssubscriptions.EmailSubscription(props.notificationEmail))
    /**
     * AWS Config Recorder
     */
    const configRecorder = new ConfigRecorder(this, "ConfigRecorder")
    /**
     * Enforce Rule: Enable MFA
     */
    const enforceMFARule = new cfg.ManagedRule(this, "EnableMfa", {
      identifier: "ROOT_ACCOUNT_MFA_ENABLED",
      maximumExecutionFrequency: cfg.MaximumExecutionFrequency.TWENTY_FOUR_HOURS,
    })
    /**
     * Enforce: No root access key
     */
    const enforceNoAccessKeyRule = new cfg.ManagedRule(this, "NoRootAccessKey", {
      identifier: "IAM_ROOT_ACCESS_KEY_CHECK",
      maximumExecutionFrequency: cfg.MaximumExecutionFrequency.TWENTY_FOUR_HOURS,
    })
    /**
     * Add enforced rules as dependencies of the Config Recorder
     */
    enforceMFARule.node.addDependency(configRecorder)
    enforceNoAccessKeyRule.node.addDependency(configRecorder)
    /**
     * Role used for remediation
     */
    const autoRemediateRole = new iam.Role(this, "AutoRemediationRole", {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("events.amazonaws.com"),
        new iam.ServicePrincipal("ssm.amazonaws.com"),
      )
    })
    /**
     * Grant Role to the SNS Notification Topic
     */
    secureRootUserConfigTopic.grantPublish(autoRemediateRole)
    /**
     * Create remediations by notifying the owner.
     */
    const mfaRemediationInstructionMessage = [
      `Your main account ${Stack.of(this).account} root user still not have MFA activated.`,
      "\t 1. Go to https://signin.aws.amazon.com/console and sign in using your root account.",
      "\t 2. Go to https://console.aws.amazon.com/iam/home#/security_credentials",
      "\t 3. Activate MFA"
    ].join("\n")
    const accessKeyRemmediationInstructionMessage = [
      `Your main account ${Stack.of(this).account} root user have static access keys.`,
      "\t 1. Go to https://signin.aws.amazon.com/console and sign in using your root account.",
      "\t 2. Go to https://console.aws.amazon.com/iam/home#/security_credentials",
      "\t 3. Delete your access keys."
    ].join("\n")
    this.addNotCompliancyNotificationMechanism(enforceMFARule, autoRemediateRole, secureRootUserConfigTopic, mfaRemediationInstructionMessage)
    this.addNotCompliancyNotificationMechanism(enforceNoAccessKeyRule, autoRemediateRole, secureRootUserConfigTopic, accessKeyRemmediationInstructionMessage)
  }
  /**
   * addNotCompliancyNotificationMechanism adds a notification mechanism based on a manafed rule
   * and comunicated through an SNS Topic.
   * @param enforceMFARule - Manage rule not in compliance to notify.
   * @param autoRemediateRole - IAM Role required to send the notification message.
   * @param secureRootUserConfigTopic - SNS Topic that should send the notification.
   * @param message - Message to add to the notification message (limited to 256 characters)
   */
  private addNotCompliancyNotificationMechanism(enforceMFARule: cfg.ManagedRule, autoRemediateRole: iam.Role, secureRootUserConfigTopic: sns.Topic, message: string) {
    new cfg.CfnRemediationConfiguration(this, `Notification-${enforceMFARule.node.id}`, {
      configRuleName: enforceMFARule.configRuleName,
      targetId: "AWS-PublishSNSNotification",
      targetType: "SSM_DOCUMENT",
      targetVersion: "1",
      automatic: true,
      maximumAutomaticAttempts: 1,
      retryAttemptSeconds: 60,
      parameters: {
        AutomationAssumeRole: {
          StaticValue: {
            Values: [autoRemediateRole.roleArn],
          },
        },
        TopicArn: {
          StaticValue: {
            Values: [secureRootUserConfigTopic.topicArn],
          },
        },
        Message: {
          StaticValue: {
            Values: [message]
          }
        }
      }
    })
  }
}