# AGENTS.md

This file provides guidance for AI agents when working with code in this repository.

## Project Overview

**JValue BioMed** is an Apache Airflow-based platform for crawling, processing, and cleaning biomedical open data from sources like NCBI, EBI, and other repositories. The project runs Airflow 3.1.0 in Docker using CeleryExecutor and emphasizes the modern **TaskFlow API** (Pythonic syntax with `@task` decorators) for DAG definitions.

**Primary Use Cases:**
- Crawling biomedical databases (GenBank, PubMed, UniProt, ENA, etc.)
- Downloading and processing sequence data, literature, and molecular information
- Data cleaning and transformation pipelines
- Scheduled updates and incremental data synchronization

## Architecture

**Docker Services** (via docker-compose.yaml):
- `airflow-apiserver` - Web UI and REST API (port 8080)
- `airflow-scheduler` - DAG scheduling and orchestration
- `airflow-dag-processor` - DAG file processing
- `airflow-worker` - Celery worker for task execution
- `airflow-triggerer` - Handles deferred/async tasks
- `postgres` - Metadata database (PostgreSQL 16)
- `redis` - Celery message broker (Redis 7.2)

**Directory Structure**:
- `src/jvalue_biomed/` - Reusable Python package for biomedical data utilities (installed in containers)
  - `crawlers/` - Crawling utilities (FTP, HTTP, API clients)
  - `parsers/` - Data format parsers (GenBank, FASTA, PubMed XML, etc.)
- `dags/` - DAG definitions for biomedical data pipelines (mounted as volume to containers)
- `tests/` - Unit tests for the jvalue_biomed package (pytest)
- `logs/` - Airflow execution logs
- `plugins/` - Custom Airflow plugins (operators, sensors, hooks specific to Airflow)
- `config/` - Airflow configuration files

**Data Flow**: DAG files in `dags/` define biomedical data pipelines that are automatically detected by the dag-processor, scheduled by the scheduler, and executed by workers. Typical workflow:
1. **Crawl** - Connect to biomedical data sources (FTP, APIs)
2. **Download** - Retrieve datasets (sequences, literature, annotations)
3. **Transform** - Parse and clean biomedical data formats
4. **Load** - Store processed data for downstream analysis

## Essential Commands

All commands use the Makefile wrapper:

```bash
# Initial setup (only once)
make init                    # Downloads docker-compose.yaml, initializes DB

# Container management
make up                      # Start all services
make down                    # Stop all services
make ps                      # Show container status

# DAG development workflow
make refresh                 # Reload DAGs after code changes (reserializes)
make airflow dags list       # List all DAGs
make airflow dags test <dag_id>  # Test a DAG locally
make airflow tasks list <dag_id> # List tasks in a DAG

# Code quality (run before commits)
make check                   # Run linter + type checker
make lint                    # Ruff linter (checks src/ and dags/)
make type-check              # Mypy static type checking (checks src/ and dags/)
make format                  # Auto-format code
make fix                     # Auto-fix linting issues

# Testing
make test                    # Run all tests (unit + DAG integrity)
make test-unit               # Run pytest unit tests only
make test-dags               # Validate DAG integrity only

# Generic Airflow CLI access
make airflow <any-command>   # Execute any Airflow CLI command
# Examples:
#   make airflow dags unpause demo_taskflow_dag
#   make airflow dags trigger demo_taskflow_dag
#   make airflow config get-value core dags_folder
```

## DAG Development Guidelines

**Use TaskFlow API** for biomedical data pipelines (new syntax since Airflow 2.0+):
```python
from airflow.sdk import dag, task
from datetime import datetime
from jvalue_biomed.crawlers.ncbi import fetch_pubmed_ids  # Import from package
from jvalue_biomed.parsers.pubmed import parse_pubmed_xml

@dag(
    dag_id="ncbi_pubmed_crawler",
    schedule="@daily",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["biomedical", "pubmed", "ncbi"],
)
def pubmed_crawler():
    @task()
    def fetch_article_ids(search_term: str = "COVID-19") -> list[str]:
        # Use utility from jvalue_biomed package
        return fetch_pubmed_ids(search_term)

    @task()
    def download_articles(article_ids: list[str]) -> list[dict]:
        # Download article metadata and abstracts
        return [{"pmid": id, "abstract": "..."} for id in article_ids]

    @task()
    def clean_and_store(articles: list[dict]) -> None:
        # Clean text and store in database
        pass

    ids = fetch_article_ids()
    articles = download_articles(ids)
    clean_and_store(articles)

pubmed_crawler()
```

**Key patterns**:
- Use `@task()` decorator for Python functions (not PythonOperator)
- Return values from tasks are automatically passed via XCom
- Type hints enable automatic dependency inference
- DAG must be instantiated at module level: `my_dag()`
- Mix traditional operators (like BashOperator) with TaskFlow tasks
- Use `>>` for explicit dependencies between tasks
- Tag DAGs with biomedical source names (e.g., `tags=["ncbi", "genbank", "crawler"]`)
- Use descriptive DAG IDs that indicate the data source and operation
- **Import reusable utilities from `jvalue_biomed` package** (e.g., `from jvalue_biomed.crawlers.ftp import parse_ftp_list_item`)

**After creating/modifying DAGs**:
1. Run `make check` to validate syntax and types
2. Run `make test` to run unit tests and validate DAG integrity
3. Run `make refresh` to reload DAGs in Airflow
4. Check web UI at http://localhost:8080 (credentials: airflow/airflow)

## Package Development Guidelines

**When to add code to `src/jvalue_biomed/` vs DAG files:**
- ✅ **Add to package**: Reusable utilities, parsers, API clients, data transformations
- ❌ **Keep in DAG**: Airflow-specific logic, task orchestration, scheduling logic

**Structure for new utilities:**
```
src/jvalue_biomed/
├── crawlers/          # For fetching data from external sources
│   ├── ftp.py         # FTP utilities
│   ├── ncbi.py        # NCBI API clients
│   └── ebi.py         # EBI API clients
└── parsers/           # For parsing biomedical data formats
    ├── genbank.py     # GenBank format parser
    ├── fasta.py       # FASTA format parser
    └── pubmed.py      # PubMed XML parser
```

**After adding new utilities to the package:**
1. Write unit tests in `tests/` (e.g., `tests/test_ncbi.py`)
2. Run `make test-unit` to verify tests pass
3. Run `make check` to validate code quality
4. Run `make refresh` to reload DAGs (no rebuild needed!)

**Why no rebuild is needed:**
- The `src/` directory is mounted as a Docker volume (like `dags/`)
- The package is installed in editable mode, so Python reads directly from the mounted source
- Changes to package code are immediately available in all containers
- This provides the same fast iteration loop as local development

**For local development without Docker:**
- The package is installed in editable mode via `make install-dev`
- Changes to package code are immediately available (no rebuild needed)
- Changes to DAGs are auto-detected by Airflow (just run `make refresh`)

## Code Quality Configuration

All configuration is centralized in **pyproject.toml**:

- **[tool.ruff]**: Linting rules (based on pyflakes, pycodestyle, isort, etc.)
  - Checks both `src/jvalue_biomed/` and `dags/` directories
  - Configured for biomedical data processing patterns
- **[tool.mypy]**: Type checking with **strict mode** enabled
  - Checks both `src/jvalue_biomed/` and `dags/` directories
  - Airflow decorators (`@task`, `@dag`) are exempt from untyped decorator checks
  - When writing code:
    - Add type annotations to all function parameters and return values
    - Use explicit `Optional[T]` instead of implicit optionals
    - Avoid `Any` types without justification
- **[tool.pytest]**: Test configuration
  - Test directory: `tests/`
  - Coverage reporting enabled for `src/jvalue_biomed/`

When linter/type checker fails, address issues or add `# type: ignore` / `# noqa` comments with justification.

**IMPORTANT**: 
- Always use type hints for arguments and return types. 
- Use docstring comments for functions and classes (PEP 257 formatting conventions).
- Don't use comments to document obvious things or to structure code. Instead, document design decisions and side-effects. For code structuring, introduce well-named helper functions.

## Debugging

```bash
# View logs
make logs                    # All services
make logs-scheduler          # Scheduler only
make logs-worker             # Worker only

# Check DAG import errors
make airflow dags list-import-errors

# Shell access to containers
docker compose exec airflow-scheduler bash
docker compose exec airflow-worker bash
```

## Common Issues

**DAGs not appearing**: Run `make refresh` to reserialize. Check for Python syntax errors with `make airflow dags list-import-errors`.

**Import errors in DAGs**: Ensure imports use correct paths:
- `from airflow.sdk import dag, task` (not `from airflow.decorators`)
- `from airflow.providers.standard.operators.bash import BashOperator` (not `from airflow.operators.bash`)
- `from jvalue_biomed.crawlers.ftp import parse_ftp_list_item` (package imports)

**"Module not found" for jvalue_biomed**: The package is installed in Docker containers via the Dockerfile.
- For local development: Run `make install-dev` to install the package in editable mode
- For Docker: The package is installed in editable mode with `src/` mounted as a volume - no rebuild needed!

**Containers unhealthy**: Check logs with `make logs`. Services depend on postgres/redis being healthy first. May need `make down && make up` to restart.

**Package changes not reflected in Airflow**: Simply run `make refresh` to reload DAGs. No rebuild needed since `src/` is mounted as a volume and the package is installed in editable mode. Changes are immediately available in all containers.
