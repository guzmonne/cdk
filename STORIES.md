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
- As an operator I would like to be able to access any of the environments through a single secure web portal.
  - **Acceptance Criteria**:
    - A new webpage should be available on which, with a unique set of credentials, I can access any of the environments.
- As an operator I would like to be able to have a way to control and see how much is being spent per environment.
  - **Acceptance Criteria**:
    - Each environment should start producing a separete bill specifing all the services that were consumed on the previous month.
    - A dashboard should be available to drill down the costs produced by each environment.
- As an operator I would like to have a single pane of glass to see every action being done over each environment.
  - **Acceptance Criteria**:
    - All actions generated on any account should be tracked an centraly logged.
    - A dashboard should be provided to be able to filter and see all the logs.
- As an operator I would like to have access to a single pane of glass to be handle the permissions of all the users on any environment.
  - **Acceptance Criteria**:
    - A dashboard should be available with a list of all the users of the organization. Offering a way to modify the permissions assigned to each of them.


## Developers

- As a Developer I would like to have access to a secured playground environment where I can try and break things, without it ever impacting the production environment.
  - **Acceptance Criteria**:
    - A new account should be provided to the developers so they can spin their development environments.
    - A new set of credentials should be provided with the same permission levels they have today.
- As a Developer I would like to be provided with a web portal that allows me to authenticate to any environment.
  - **Acceptance Criteria**:
    - A web page should be provided from which I, with a unique set of credentials, I should be able to access any environment.
- As a Backend Developer I would like to have the backend service be automatically tracked by a CI/CD solution that can generate a development container after each new commit pushed to the `master` branch.
  - **Acceptance Criteria**:
    - The workflow of the backend service should not be modified.
    - A container image should be automatically created any time a new commit is pushed to the main repository, if the test suite passes.
    - After the image is ready, a new container should be deployed to the `staging` environment. If a set of `integration` or `E2E` tests are available, they should be run against the `staging` environment.
- As a Backend Developer I would like to have the backend service be automatically tracked by a CI/CD solution that can generate a production container image after a new `tag` is applied to a `commit` on the `master` branch.
  - **Acceptance Criteria**:
    - The workflow of the backend service should not be modified.
    - A container image should be automatically created any time a new commit is tagged on the `master` branch, if the test suite passes.
    - After the image is ready, a new container should be deployed to the `production` environment using a Green/Blue deployment.
- As a Backend Developer I would like to have access to a service that would simplify the authentication workflows.
  - **Acceptance Criteria**:
    - It must support bulk user creation.
    - It must support a way to keep sessions alive for more than one hour.
    - It must allow to set an authorization code with an expire time longer than 8 hours.











