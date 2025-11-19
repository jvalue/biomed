### Creating Workflow Templates
For an example, see test_workflow.yaml.
It is important to set the correct service account in the spec section to ensure the workflow has the necessary permissions to execute.
The correct service account for this project is `argo-workflow`.
You also have to ensure that the namespace is set to argo-managed-crawler in the metadata section.