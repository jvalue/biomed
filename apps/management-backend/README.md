# Management Backend
It serves as backend for the management frontend and manages users, workflow data and communication with external systems.
To make the backend work you first have to set up a database.
This can easily done using Docker.
```
docker compose up biomed-db
```

Additionally you have to set a bearer token for the communication with the remote Argo Server in the DEV Cluster.
The Argo Workflows server is deployed with `client` authentication mode, meaning every request must include a Kubernetes ServiceAccount token.
This token is also used for login to the UI.

You can retrieve it the following way:

There is a ServiceAccount with full access to workflows called `argo-user` in the `argo` namespace.

To interact with the cluster you have to export your KubeConfig first:

For Mac/Linux:
```bash
export KUBECONFIG=<path-to-your-kubeconfig>
```

For Windows (PowerShell):
```powershell
$env:KUBECONFIG="<path-to-your-kubeconfig>"
```

Then you can get the token with:
For Mac/Linux:
```bash 
ARGO_TOKEN="Bearer $(kubectl get secret argo-user.service-account-token -n argo -o=jsonpath='{.data.token}' | base64 --decode)"
echo $ARGO_TOKEN
```

For Windows (PowerShell): (need to install base64 utility first)
```powershell
$ARGO_TOKEN="Bearer $(kubectl get secret argo-user.service-account-token -n argo -o=jsonpath='{.data.token}' | base64 --decode)"
echo $ARGO_TOKEN
```
Add this token to your environment variables as `KUBE_BEARER_TOKEN`.