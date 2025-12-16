**Demo Crawler App**

A small example crawler app that demonstrates a runnable Python script under the `crawler_general` package. The included `hello.py` prints a greeting and then writes progress to `progress.txt` while printing progress updates.

**Purpose:**
- **Crawler:** Simple sample app used by the monorepo to validate packaging, local runs and Docker builds.

**Quick Start using `uv`**
- **From repository root:** run the app using the `uv` helper that this project uses in Docker. `uv` is a tiny wrapper installed in the Dockerfile and used here to run Python commands inside the expected environment.

```zsh
# install shared library then app into the current environment managed by `uv`
uv pip install --system ./libs/crawler-common
uv pip install --system ./apps/crawler

# run the sample script (prints greeting then progress)
uv run apps/crawler/crawler_general/hello.py
```

If your environment already provides `uv` (for example inside the project container), you can run the `uv` commands from the repo root. The Dockerfile uses the same commands when building the image.

**Run in Docker (build & run)**
- Build an image from the monorepo root (Dockerfile expects repo root context):

```zsh
docker build -t biomed-crawler -f apps/crawler/Dockerfile .

# run the container
docker run --rm biomed-crawler
```

The `Dockerfile` installs `uv`, the shared `crawler-common` library and the app, then runs the sample script with `uv`:

```text
# Dockerfile uses:
# RUN uv pip install --system ./libs/crawler-common \
#     && uv pip install --system .
# CMD ["uv", "run", "crawler_general/hello.py"]
```

**Run tests**
- From the repo root you can run the crawler tests with pytest. Example (project uses coverage and custom pytest config):

```zsh
# run tests for the crawler app
pytest apps/crawler/tests -q
```

**Notes & Tips**
- The app package is `crawler_general` and the sample script lives at `apps/crawler/crawler_general/hello.py`.
- The project uses `pyproject.toml` and `hatch` for packaging; installing via `pip` on a local path will build the package as needed.
- The `uv` binary is used in the Dockerfile to keep a single environment for `pip` and `run` steps.