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
- `dags/` - DAG definitions for biomedical data pipelines (mounted as volume to containers)
- `logs/` - Airflow execution logs
- `plugins/` - Custom Airflow plugins (biomedical data parsers, connectors)
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
make lint                    # Ruff linter
make type-check              # Mypy static type checking
make format                  # Auto-format code
make fix                     # Auto-fix linting issues

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
        # Fetch from NCBI E-utilities API
        return ["123456", "789012"]

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

**After creating/modifying DAGs**:
1. Run `make check` to validate syntax and types
2. Run `make refresh` to reload DAGs in Airflow
3. Check web UI at http://localhost:8080 (credentials: airflow/airflow)

## Code Quality Configuration

- **ruff.toml**: Linting rules (based on pyflakes, pycodestyle, isort, etc.)
- **mypy.ini**: Type checking with **strict mode** enabled. When writing code:
  - Add type annotations to all function parameters and return values
  - Use explicit `Optional[T]` instead of implicit optionals
  - Avoid `Any` types without justification
  - Airflow decorators (`@task`, `@dag`) are exempt from untyped decorator checks
- Both tools are pre-configured for Airflow development patterns

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

**Containers unhealthy**: Check logs with `make logs`. Services depend on postgres/redis being healthy first. May need `make down && make up` to restart.
