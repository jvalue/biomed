MINIKUBE SETUP — biomed (local development)

Purpose
- Quick reference to reproduce a local `minikube` deployment of the biomed stack used in today's debugging and testing.

**Prerequisites**
- Install: `minikube`, `kubectl`, `helm`, `docker` (or Docker-compatible daemon), `kubectl-mc`/`mc` for MinIO (optional).
- Ensure `minikube` driver and resources are sufficient (CPU/Memory). Example start:

```bash
minikube start --driver=docker --cpus=4 --memory=8192
minikube addons enable ingress
```

Note: This project uses the fish shell in development; some example scripts assume `bash`/`sh`. Replace `$(...)` with `set` style if running in fish.

**High-level steps performed today**
- Start cluster + enable ingress
- Install Argo Workflows + MinIO (artifact storage)
- Create MinIO bucket `argo-artifacts` and copy Argo MinIO secret into the `argo-managed-crawler` namespace
- Build crawler image locally and load it into minikube image cache
- Create `crawler-management-auth` Secret in the `argo-managed-crawler` namespace with `MANAGEMENT_BACKEND_URL` and `MANAGEMENT_API_KEY`
- Run WorkflowTemplate `crawler-dummy-with-api-calls` and tail crawler + management backend logs to confirm POSTs and persistence
- Fixes/notes: remove trailing `/api/v1` from `MANAGEMENT_BACKEND_URL` in secrets; add print statements in `apps/crawler/crawler_dummy/src/main.py` for visibility; handle MinIO bucket errors

**Commands & snippets**
- Create namespaces (if missing):

```bash
kubectl create ns management || true
kubectl create ns argo || true
kubectl create ns argo-managed-crawler || true
```

- Install Argo Workflows (example using Helm chart in this repo or upstream chart):

```bash
# using upstream chart (adjust version/values as needed)
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update
helm install argo argo/argo-workflows -n argo --create-namespace -f values-argo.yaml
```

- Deploy MinIO (or use the chart in `biomed-deployment/helm/minio`) and create artifact bucket `argo-artifacts`:

```bash
# Example: port-forward to minio and use mc
kubectl -n minio port-forward svc/minio 9000:9000 &
mc alias set local http://127.0.0.1:9000 MINIO_ACCESS_KEY MINIO_SECRET_KEY
mc mb local/argo-artifacts
```

- Copy Argo MinIO secret into `argo-managed-crawler` (so workflows there can archive logs/artifacts):

```bash
kubectl -n argo get secret argo-workflows-minio -o yaml | sed 's/namespace: argo/namespace: argo-managed-crawler/' | kubectl apply -f -
```

- Build crawler image and load into minikube (local image used by WorkflowTemplate):

```bash
# from repo root
docker build -t crawler-dummy:local -f apps/crawler/crawler_dummy/Dockerfile .
minikube image load crawler-dummy:local
```

- Generate API key via management backend (example curl; adapt to your auth flow):

```bash
# create an API key via the management backend (adjust path/auth as required)
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"local-minikube-key"}' \
  http://<management-host>:3002/api/v1/auth/keys
# take returned key value and store in secret below
```

- Create/update `crawler-management-auth` secret in `argo-managed-crawler` namespace:

```bash
kubectl -n argo-managed-crawler create secret generic crawler-management-auth \
  --from-literal=MANAGEMENT_BACKEND_URL=http://management-backend.management.svc.cluster.local:3002 \
  --from-literal=MANAGEMENT_API_KEY=<THE_KEY> \
  --dry-run=client -o yaml | kubectl apply -f -
```

Important: `MANAGEMENT_BACKEND_URL` should not include the `/api/v1` suffix — the crawler app appends endpoints.

- Run the WorkflowTemplate (create a Workflow instance):

```bash
# use create to allow generateName
printf "%s
" "apiVersion: argoproj.io/v1alpha1" "kind: Workflow" "metadata:" "  generateName: crawler-dummy-with-api-calls-" "spec:" "  workflowTemplateRef:" "    name: crawler-dummy-with-api-calls" | kubectl -n argo-managed-crawler create -f -
```

- Tail logs (start the workflow, then quickly find pod and tail crawler + backend logs):

```bash
# find latest pod for this workflow (adjust shell if using fish)
kubectl -n argo-managed-crawler get pods --sort-by=.metadata.creationTimestamp -o name | grep crawler-dummy-with-api-calls | tail -n1
# tail crawler main container
kubectl -n argo-managed-crawler logs -f <pod-name> -c main
# tail management backend logs
kubectl -n management logs -f deployment/management-backend --since=10m
```

If pods complete quickly and are GC'd, fetch archived logs/artifacts from MinIO using the workflow's `archiveLocation` references.

Port-forwarding for local testing
- Use port-forwards to expose in-cluster services on your host for browser-based testing or local curl calls.
- Examples (run in `bash`):

```bash
# Management backend on localhost:3002
kubectl -n management port-forward svc/management-backend 3002:3002 &

# Management frontend on localhost:4201 (used in this workspace during debugging)
kubectl -n management port-forward svc/management-frontend 4201:80 &

# MinIO (if you need to access MinIO from host for mc or browser)
kubectl -n minio port-forward svc/minio 9000:9000 &

# GraphQL API on localhost:8003 (interactive GraphiQL at http://localhost:8003/graphql)
kubectl -n management port-forward svc/graphql-api 8003:8003 &
```

- Notes:
  - These commands run in the foreground by default; use `&` to background them in `bash` or run in separate terminals.
  - To stop background port-forwards you started in the current shell, use `jobs` to list and `kill %<job>` to stop, or `pkill -f "kubectl.*port-forward"` to kill all port-forwards.
  - A hosts file entry alone does not expose an in-cluster service to your host; port-forwarding (or an ingress with a nodePort/hostPath) is required to reach the service from your browser.

**Code changes made for visibility**
- `apps/crawler/crawler_dummy/src/main.py`: added explicit `print()` lines before/after management POSTs so crawler pod logs show when POSTs occur and their response codes.
  - Path: [apps/crawler/crawler_dummy/src/main.py](apps/crawler/crawler_dummy/src/main.py)
- `libs/crawler-common/crawler_common/http_client.py`: this client reads `MANAGEMENT_BACKEND_URL` and `MANAGEMENT_API_KEY` from env and raises on non-2xx responses. Keep it configured with a short timeout for local tests.

**Common problems and fixes encountered**
- Missing MinIO bucket: Argo waits to archive artifacts and fails workflows with "The specified bucket does not exist". Fix: create `argo-artifacts` and ensure the Argo MinIO secret is available in the workflow namespace.
- Trailing `/api/v1` in `MANAGEMENT_BACKEND_URL`: caused double path errors. Solution: use base URL without `/api/v1`.
- Pods complete very quickly (workflow steps succeed), making live tailing time-sensitive. Use `kubectl logs --since` or fetch archived artifacts if you missed live logs.
- Frontend 403 on path `/crawler-management/`: nginx served a directory index and returned 403. Fix by adjusting ingress rewrite rules or ensuring frontend build includes an index at that path.
- fish shell differences: reuse `bash` for multi-command scripts, or adapt variable assignment syntax when running the helper scripts included in this guide.

**Where to look in the repo**
- Crawler: [apps/crawler/crawler_dummy/src/main.py](apps/crawler/crawler_dummy/src/main.py)
- Shared HTTP client: [libs/crawler-common](libs/crawler-common)
- WorkflowTemplates / Helm charts: check `biomed-deployment/_k8s/helm/argo-workflows` and `biomed/biomed-chart/charts/management-backend` for deployment values and templates.

**Next steps (optional)**
- Automate the above into a `scripts/` helper (create a bash script that: starts minikube, loads images, creates secrets, creates bucket, creates workflow). Remember to write it for `bash` not `fish` or add fish-compatible variants.
- Patch the management backend Argo client to defensively handle `null` cron-workflow responses (observed TypeError).

If you want, I can: (A) run the steps now and capture live logs, (B) create a runnable `scripts/minikube-setup.sh`, or (C) fetch archived logs from MinIO for a specific workflow run. Which should I do next?

Updating builds, images and WorkflowTemplates
 - Frontend (rebuild static files and redeploy image)

```bash
# from repo root, build frontend and image (adjust commands if using a different Dockerfile)
cd apps/management-frontend
npm install
npm run build
cd ../..  # repo root
docker build -t management-frontend:local -f management-frontend.Dockerfile .
minikube image load management-frontend:local

# Update deployed frontend (either by setting image or rolling restart)
kubectl -n management set image deployment/management-frontend management-frontend=management-frontend:local --record || kubectl -n management rollout restart deployment/management-frontend
```

 - Backend (build image and restart)

```bash
# from repo root
docker build -t management-backend:local -f apps/management-backend/Dockerfile .
minikube image load management-backend:local

# update deployment image or restart to pick up new image
kubectl -n management set image deployment/management-backend management-backend=management-backend:local --record || kubectl -n management rollout restart deployment/management-backend
kubectl -n management rollout status deployment/management-backend
```

 - GraphQL API (build image and restart)

```bash
# from repo root
docker build -t biomed-graphql-api:local -f apps/graphql_api/Dockerfile .
minikube image load biomed-graphql-api:local

kubectl -n management rollout restart deployment/graphql-api
kubectl -n management rollout status deployment/graphql-api
```

 - Crawler image and WorkflowTemplate

```bash
# build crawler image used by workflows
docker build -t crawler-dummy:local -f apps/crawler/crawler_dummy/Dockerfile .
minikube image load crawler-dummy:local

# If you changed the WorkflowTemplate YAML, apply the update
kubectl -n argo-managed-crawler apply -f k8s/workflow-templates/crawler-dummy-with-api-calls.yaml

# Or create a new Workflow run to use the updated template
printf "%s
" "apiVersion: argoproj.io/v1alpha1" "kind: Workflow" "metadata:" "  generateName: crawler-dummy-with-api-calls-" "spec:" "  workflowTemplateRef:" "    name: crawler-dummy-with-api-calls" | kubectl -n argo-managed-crawler create -f -
```

 - ConfigMaps / runtime config updates

```bash
# Update runtime config.js used by the frontend (example)
kubectl -n management create configmap management-runtime-config --from-file=./config/config.js --dry-run=client -o yaml | kubectl apply -f -
kubectl -n management rollout restart deployment/management-frontend
```

 - Secrets (API key updates)

```bash
# Recreate or update crawler-management-auth secret
kubectl -n argo-managed-crawler create secret generic crawler-management-auth \
  --from-literal=MANAGEMENT_BACKEND_URL=http://management-backend.management.svc.cluster.local:3002 \
  --from-literal=MANAGEMENT_API_KEY=<THE_KEY> --dry-run=client -o yaml | kubectl apply -f -

# Restart any pods that consume the secret if necessary
kubectl -n argo-managed-crawler rollout restart deploy --all
```

 - Verify after updates

```bash
kubectl -n management get pods
kubectl -n argo-managed-crawler get pods
kubectl -n management logs -f deployment/management-backend --since=5m
```

Notes:
- Use `minikube image load` so cluster nodes can pull local images without pushing to a registry.
- Prefer `kubectl set image` to update a single deployment image, or `rollout restart` when underlying ConfigMap/Secret changed.
- Adjust Dockerfile paths if your repo layout differs.
