import { Construct, Stage, StageProps } from "@aws-cdk/core"
import * as ec2 from "@aws-cdk/aws-ec2"


import { EcsApp } from "./ecs-app"
import type { EcsAppProps } from "./ecs-app"

export interface DevStageProps extends StageProps {
  /**
   * empathoNodejsApp holds the configuration for Empatho's Nodejs App.
   */
  empathoNodejsApp: Omit<EcsAppProps, "vpcCidr" | "githubRepo" | "githubBranch" | "githubOwner" | "ecsContainerName" | "ecsContainerImage" | "ecsAppName">;
}

/**
 * AppProps represent the Empathos application.
 */
export class DevStage extends Stage {
  /**
   * Constructor
   *
   * @param scope - The parent Construct instantiating this account.
   * @param id - The instance unique identifier.
   * @param props - DevStage properties.
   */
  constructor(scope: Construct, id: string, props: DevStageProps) {
    super(scope, id)
    /**
     * Empatho Nodeje App
     */
    new EcsApp(this, "EcsApp", {
      ...props.empathoNodejsApp,
      vpcCidr: "10.0.0.0/16",
      githubOwner: "guzmonne",
      githubRepo: "office-ui-layout",
      githubBranch: "master",
      ecsAppName: "EmpathoNodejsApp",
      ecsContainerName: "EmpathoNodejsApp",
      ecsContainerImage: "EmpathoNodejsApp",
      ecsContainerPort: 80,
      ecsHostPort: 5000,
    })
  }
}