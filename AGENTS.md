# AGENTS.md

This file provides guidance for AI agents when working with code in this repository.

## Project Overview

This is an Apache Airflow experimentation project running Airflow 3.1.0 in Docker using CeleryExecutor. The setup emphasizes using the modern **TaskFlow API** (Pythonic syntax with `@task` decorators) for DAG definitions.

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
- `dags/` - DAG definitions (mounted as volume to containers)
- `logs/` - Airflow execution logs
- `plugins/` - Custom Airflow plugins
- `config/` - Airflow configuration files

**Data Flow**: DAG files in `dags/` are automatically detected by the dag-processor, scheduled by the scheduler, and executed by workers. Task outputs are passed via XCom.

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

**Use TaskFlow API** (new syntax since Airflow 2.0+):
```python
from airflow.sdk import dag, task
from datetime import datetime

@dag(
    dag_id="my_dag",
    schedule="@daily",
    start_date=datetime(2024, 1, 1),
    catchup=False,
)
def my_dag():
    @task()
    def extract():
        return {"data": "value"}

    @task()
    def transform(data: dict):
        return data["value"].upper()

    result = transform(extract())

my_dag()
```

**Key patterns**:
- Use `@task()` decorator for Python functions (not PythonOperator)
- Return values from tasks are automatically passed via XCom
- Type hints enable automatic dependency inference
- DAG must be instantiated at module level: `my_dag()`
- Mix traditional operators (like BashOperator) with TaskFlow tasks
- Use `>>` for explicit dependencies between tasks

**After creating/modifying DAGs**:
1. Run `make check` to validate syntax and types
2. Run `make refresh` to reload DAGs in Airflow
3. Check web UI at http://localhost:8080 (credentials: airflow/airflow)

## Code Quality Configuration

- **ruff.toml**: Linting rules (based on pyflakes, pycodestyle, isort, etc.)
- **mypy.ini**: Type checking configuration with Airflow-specific ignores
- Both tools are pre-configured for Airflow development patterns

When linter/type checker fails, address issues or add `# type: ignore` / `# noqa` comments with justification.

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
