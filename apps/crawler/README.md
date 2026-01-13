**Crawler Apps**

Two Python apps share the `crawler-common` library:
- `crawler_general` (FTP-focused demo)
- `crawler_dummy` (minimal skeleton for experiments)

Shared helpers live in ../../libs/crawler-common.

**Setup**

From repo root, create the shared venv and install all members:
```bash
uv sync
```

**Run locally**

```bash
# crawler_general
uv run apps/crawler/crawler_general/src/main.py

# crawler_dummy
uv run apps/crawler/crawler_dummy/src/main.py
```

**Docker**

Build and run each service from the repo root (Dockerfiles expect root context):
```bash
# crawler_general
docker compose build --no-cache crawler-general
docker compose up crawler-general

# crawler_dummy
docker compose build --no-cache crawler-dummy
docker compose up crawler-dummy
```

Containers mount libs/crawler-common for live code changes; crawler_general also mounts its app directory. If you prefer immutable images, remove the volume mounts in ../../docker-compose.yml.

**Tests**

```bash
uv run pytest libs/crawler-common/tests
uv run pytest apps/crawler/tests
```

**Notes**
- Python 3.13 via uv workspace; run uv sync after changing dependencies.
- Entrypoints: crawler_general/src/main.py, crawler_dummy/src/main.py.
- Docker images install deps system-wide (no venv inside containers).
