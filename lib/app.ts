import { Construct, Stage, StageProps } from "@aws-cdk/core"

import { EcsApp } from "./ecs-app"
import type { EcsAppProps } from "./ecs-app"

export interface AppStackProps extends StageProps {
  /**
   * ecsApp holds the configuration for the EcsApp.
   */
  ecsApp: EcsAppProps;
}

/**
 * AppProps represent the Empathos application.
 */
export class AppStack extends Stage {
  /**
   * Constructor
   *
   * @param scope - The parent Construct instantiating this account.
   * @param id - The instance unique identifier.
   * @param props - AppStack properties.
   */
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id)
    /**
     * ECR App
     */
    new EcsApp(scope, id, props.ecsApp)
  }
}