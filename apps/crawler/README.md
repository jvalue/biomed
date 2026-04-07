# Crawler Apps

Two Python crawler applications that share the `crawler-common` library:
- **crawler_general** - FTP-focused demo crawler for biomedical data sources
- **crawler_dummy** - Minimal skeleton for experiments

Both apps use shared FTP helpers and configuration from `libs/crawler-common`.

## Biomedical Data Sources

- [NCBI FTP Site](https://ftp.ncbi.nlm.nih.gov/)
- [EBI Data Services](https://www.ebi.ac.uk/services)
- [NCBI E-utilities API](https://www.ncbi.nlm.nih.gov/books/NBK25501/)
- [UniProt REST API](https://www.uniprot.org/help/api)

## Setup

From repository root, create the shared venv and install all workspace members:

```bash
uv sync
```

This creates a shared `.venv/` at the workspace root containing:
- `crawler-common` (shared library from `libs/crawler-common`)
- `crawler_general` and `crawler_dummy` (crawler apps)
- All Python dependencies for the projects

For details on shared FTP helpers and configuration, see [libs/crawler-common/README.md](../../libs/crawler-common/README.md).

## Run Locally

```bash
# crawler_general
uv run apps/crawler/crawler_general/src/main.py

# crawler_dummy
uv run apps/crawler/crawler_dummy/src/main.py
```

The `crawler_general` app loads credentials from `apps/crawler/crawler_general/.env` and lists root folders from the configured FTP server.

For `crawler_dummy`, create `apps/crawler/crawler_dummy/.env.docker` (you can copy `.env.docker.example`) with:

```bash
MANAGEMENT_BACKEND_URL=http://localhost:3002
MANAGEMENT_API_KEY=<raw-api-key>
CRAWLER_DUMMY_RUN_NAMESPACE=default
CRAWLER_DUMMY_RUN_NAME=crawler-dummy
```

`crawler_dummy` uses these variables to authenticate against management-backend with the `X-API-KEY` header and posts a startup event to:
`/api/v1/crawler-runs/{namespace}/{name}/events`.

## Docker

Build and run each service from the repo root (Dockerfiles expect root context):

```bash
# crawler_general
docker compose build --no-cache crawler-general
docker compose up crawler-general

# crawler_dummy
docker compose build --no-cache crawler-dummy
docker compose up crawler-dummy
```

The Compose setup uses `apps/crawler/crawler_general/.env.docker` for container config. The `.env.docker.example` file is a template.

Containers mount `libs/crawler-common` for live code changes; `crawler_general` also mounts its app directory. If you prefer immutable images, remove the volume mounts in `docker-compose.yml`.

The Dockerfiles install `uv`, the shared `crawler-common` library, and the apps system-wide (no venv inside containers for isolation).

## Kubernetes Secrets (crawler API auth)

For deployments, provide management-backend credentials via Kubernetes Secrets and inject them as environment variables.

Example Secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: crawler-management-auth
type: Opaque
stringData:

  MANAGEMENT_BACKEND_URL: https://management-backend.example.com
  MANAGEMENT_API_KEY: <raw-api-key>
```

Example Deployment env wiring:

```yaml
spec:

  template:
    spec:
      containers:
        - name: crawler-dummy
          env:
            - name: MANAGEMENT_BACKEND_URL
              valueFrom:
                secretKeyRef:
                  name: crawler-management-auth
                  key: MANAGEMENT_BACKEND_URL
            - name: MANAGEMENT_API_KEY
              valueFrom:
                secretKeyRef:
                  name: crawler-management-auth
                  key: MANAGEMENT_API_KEY
            - name: CRAWLER_DUMMY_ENDPOINT
              value: /api/v1/crawler-runs/default/crawler-dummy/events
```

`crawler_dummy` reads process environment variables at runtime, so this works directly in Kubernetes without a `.env` file inside the container.

## Tests

```bash
# Test the crawler apps
uv run pytest apps/crawler/tests

# Test the shared library
uv run pytest libs/crawler-common/tests

# With coverage
uv run pytest apps/crawler/tests --cov
```

## Notes

- **Python 3.13** via uv workspace - `uv` automatically downloads and manages the correct Python version
- Run `uv sync` from repo root whenever dependencies change in any `pyproject.toml`
- Entrypoints: `crawler_general/src/main.py`, `crawler_dummy/src/main.py`
- Root `pyproject.toml` defines workspace members and pins Python version
- Docker images install packages system-wide for container isolation
