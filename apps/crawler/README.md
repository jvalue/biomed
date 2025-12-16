**Demo Crawler App**

A small example crawler app that demonstrates a runnable Python script under the `crawler_general` package. The included `hello.py` prints a greeting and then writes progress to `progress.txt` while printing progress updates.

**Purpose:**
- **Crawler:** Simple sample app used by the monorepo to validate packaging, local runs and Docker builds.

**Setup on Clean Machine**

1. **Install `uv`**

2. **Create virtual environment and install all dependencies** from repository root:
```bash
# From repo root: creates .venv/ and installs all workspace members
uv sync
```

This creates a shared `.venv/` at the workspace root containing:
- `crawler-common` (shared library from `libs/crawler-common`)
- `crawler-general` (this app)
- All Python dependencies for both projects

**Quick Start - Run the App**

```bash
# From repository root, using the shared venv:
uv run apps/crawler/crawler_general/hello.py

# Or activate the venv and run directly:
source .venv/bin/activate
python apps/crawler/crawler_general/hello.py
```

**Run in Docker (build & run)**
- Build an image from the monorepo root (Dockerfile expects repo root context):

```zsh
docker compose build biomed-crawler

# run the container
docker compose up biomed-crawler
```

The `Dockerfile` installs `uv`, the shared `crawler-common` library and the app, then runs the sample script with `uv`:

```text
# Dockerfile uses:
# RUN uv pip install --system ./libs/crawler-common \
#     && uv pip install --system .
# CMD ["uv", "run", "crawler_general/hello.py"]
```

**Run Tests**

Using pytest with the shared venv:
```bash
# From repo root - test the crawler app
uv run pytest apps/crawler/tests

# Or test the shared library
uv run pytest libs/crawler-common/tests

# With coverage
uv run pytest apps/crawler/tests --cov
```

**Notes & Tips**
- The app package is `crawler_general` and the sample script lives at `apps/crawler/crawler_general/hello.py`.
- This project uses a **uv workspace** with a single shared `.venv/` at the repository root containing all Python projects.
- Root `pyproject.toml` defines workspace members: `libs/crawler-common` and `apps/crawler`.
- Run `uv sync` from the root whenever dependencies change in any `pyproject.toml`.
- The Dockerfile installs packages system-wide (not using venv) for container isolation.
- `uv` automatically downloads and manages the correct Python version - no need to install Python separately.