# Stories

## Operators

- As an Operator I want to have a series of isolated environments in order to deploy the differnt parts of the application.
  - **Acceptance Criteria**:
    - A `prod` environment should be created to deploy the production environment.
    - A `dev` environment should be created to use as a development playground.
    - A `staging` environment should be created to use as the first stage of the production deployment.
    - A `cicd` environment should be created that will hold all the CI/CI pipelines to deploy the different parts of the application.
    - All the environments should be created on a different account, that depends on the root AWS account.
    - All accounts should be created on an OU tree with the following OU:
      - Stage
      - Playground
      - CICD
