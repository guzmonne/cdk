import { Construct } from "@aws-cdk/core"
import * as iam from "@aws-cdk/aws-iam"
import * as s3 from "@aws-cdk/aws-s3"
import * as cfg from "@aws-cdk/aws-config"

/**
 * ConfigRecorder is a Construct that configures AWS Config.
 *
 * AWS Config provides a detailed view of the configuration of AWS resources
 * in your AWS account. This includes how the resources are related to one
 * another and how they were configured in the past so that you can see how
 * the configurations and relationships change over time.
 *
 * Before using, you need to set up AWS Config in the region in which it will
 * be used. This setup includes the one-time creation of the following resources
 * pre region:
 *
 * - `Configuration Recorder`: Configure which resources will be recored for config changes.
 * - `DeliveryChannel`: Configure where to store the recorded data.
 */
export class ConfigRecorder extends Construct {
  /**
   * Constructor
   *
   * @param scope - The parent Construct instantiating this account.
   * @param id - The instance unique identifier.
   */
  constructor(scope: Construct, id: string) {
    super(scope, id)
    /**
     * Configuration Bucket
     */
    const configBucket = new s3.Bucket(this, "ConfigBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    })
    configBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        actions: ["*"],
        principals: [new iam.AnyPrincipal()],
        resources: [configBucket.bucketArn, configBucket.arnForObjects("*")],
        conditions: {
          Bool: {
            "aws:SecureTransport": false,
          }
        }
      })
    )
    // Attach AWSConfigBucketPermissionsCheck to config bucket
    configBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal("config.amazonaws.com")],
        resources: [configBucket.bucketArn],
        actions: ["s3:GetBucketAcl"],
      })
    )
    // Attach AWSConfigBucketDelivery to config bucket
    configBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal("config.amazonaws.com")],
        resources: [`${configBucket.bucketArn}/*`],
        actions: ["s3:PutObject"],
        conditions: {
          StringEquals: {
            "s3:x-amz-acl": "bucket-owner-full-control"
          }
        }
      })
    )
    // Configure AWS Config Delivery Channel
    // https://docs.aws.amazon.com/config/latest/developerguide/gs-cli-prereq.html#gs-cli-create-s3bucket
    new cfg.CfnDeliveryChannel(this, "ConfigDeliveryChannel", {
      s3BucketName: configBucket.bucketName,
      name: "ConfigDeliveryChannel",
    })

    const configRole = new iam.Role(this, "ConfigRecorderRole", {
      assumedBy: new iam.ServicePrincipal("config.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSConfigRole")
      ]
    })
    // Configure AWS Config to only keep track of configuration updates to IAM Users.
    new cfg.CfnConfigurationRecorder(this, "ConfigRecorder", {
      name: "BlueprintConfigRecorder",
      roleArn: configRole.roleArn,
      recordingGroup: {
        resourceTypes: ["AWS::IAM::User"]
      }
    })
  }
}