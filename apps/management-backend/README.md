# Management Backend

## Setup Instructions

### Setup Environment Variables

The management backend requires several environment variables to be set for proper configuration.
Copy the `.env.example` file to a new file named `.env` and fill in the required values.
Additionally for docker copy the `.env.docker.example` to `.env.docker` and fill in the required values.

### Setup Database

To make the backend work you first have to set up a database.
This can easily done using Docker.

```
docker compose up biomed-db
```

### Setup Connection to Argo Workflows in DEV Cluster

First of all connect via VPN to the University Network to be able to access the DEV Kubernetes Cluster.
Additionally you have to set a bearer token for the communication with the remote Argo Server in the DEV Cluster.
The Argo Workflows server is deployed with `client` authentication mode, meaning every request must include a Kubernetes
ServiceAccount token.
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

### Generate JWT Secret Key

Generate a secret key for JWT token signing with the following command:

```bash
openssl rand -hex 32
```

Add this key to your environment variables as `JWT_SECRET_KEY`.

## Authorization and Permission Management with CASL and Passport

The management backend uses CASL (https://casl.js.org/) for authorization and permission management.
CASL is a powerful and flexible library that allows you to define and manage user permissions in a declarative way.
It integrates seamlessly with Passport (http://www.passportjs.org/), which is used for authentication.
The combination of CASL and Passport provides a robust solution for managing user access and permissions in the backend.

### User management workflow

The user management workflow is as follows:

0. If there is no user in the database, an initial admin user is created on application startup with credentials defined
   in environment variables.
1. A user registers an account with a username and password.
2. An admin approves the user account and assigns permissions.
3. The user can log in and access resources based on their assigned permissions.

### Authentication workflow

The authentication workflow is handled by Passport using JWT strategy.
When a user logs in with his credentials (username and password), they receive a JWT which is used for subsequent
requests to
authenticate the user.

### Defining Permissions

To define permissions, you can create ability definitions based on user roles and actions.
This is done in `user-permissions.enum.ts` and `ability.factory.ts`.

### Guards and Decorators

We have two Guards to protect endpoints

1. `JwtAuthGuard`: This guard checks if the user is authenticated using JWT tokens.
2. `PermissionsGuard`: This guard checks if the user has the necessary permissions to access a specific endpoint in
   combination with the `RequirePermission` decorator.
   These guards are used the following way:

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('read', 'user')
@Get()
async
getUsers()
{
	// Endpoint logic here
}
```

Additionally, you can use the `CurrentUser` decorator to easily access the currently authenticated user in your
controllers:

```typescript
@Get('profile')
async
getProfile(@CurrentUser()
user: UserEntity
)
{
	return user;
}
```

### Checking Permissions in Services

In addition to protecting endpoints, you can also check permissions directly in your services using the
`AbilityFactory`.
This can be done as follows:

```typescript
const ability = this.abilityFactory.defineAbilityFor(user);
if (ability.can('update', 'user')) {
	// User has permission to update the resource
} else {
	// User does not have permission
}
```

