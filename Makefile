.PHONY: help up down restart logs clean init test lint format type-check install-dev airflow refresh check fix test-dags test-unit

# Default target
help:
	@echo "JValue BioMed - Biomedical Data Pipeline"
	@echo "========================================="
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make init          - Initialize Airflow (download compose file, create dirs, init DB)"
	@echo "  make install-dev   - Install development dependencies (linting, type checking)"
	@echo ""
	@echo "Container Management:"
	@echo "  make up            - Start all Airflow services"
	@echo "  make down          - Stop all Airflow services"
	@echo "  make restart       - Restart all Airflow services"
	@echo "  make clean         - Stop services and remove volumes (DESTRUCTIVE)"
	@echo ""
	@echo "Logs & Monitoring:"
	@echo "  make logs          - Follow logs from all services"
	@echo "  make logs-scheduler - Follow scheduler logs"
	@echo "  make logs-worker   - Follow worker logs"
	@echo "  make ps            - Show running containers"
	@echo ""
	@echo "DAG Management:"
	@echo "  make airflow <command> - Execute any Airflow CLI command"
	@echo "  make refresh           - Reload/reserialize all DAGs"
	@echo ""
	@echo "  Examples:"
	@echo "    make airflow dags list"
	@echo "    make airflow dags test demo_taskflow_dag"
	@echo "    make airflow dags unpause demo_taskflow_dag"
	@echo "    make airflow dags trigger demo_taskflow_dag"
	@echo "    make airflow tasks list demo_taskflow_dag"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint          - Run linters on DAG files (ruff)"
	@echo "  make format        - Auto-format DAG files (ruff)"
	@echo "  make type-check    - Run static type checking (mypy)"
	@echo "  make check         - Run all checks (lint + type-check)"
	@echo "  make fix           - Auto-fix issues (format + lint --fix)"
	@echo ""
	@echo "Testing:"
	@echo "  make test          - Run all tests (unit + DAG integrity)"
	@echo "  make test-unit     - Run unit tests (pytest)"
	@echo "  make test-dags     - Validate DAG integrity (import tests)"
	@echo ""
	@echo "Web UI:"
	@echo "  make ui            - Open Airflow web UI in browser"
	@echo ""

# === Setup & Installation ===

init:
	@echo "Initializing Airflow..."
	@mkdir -p ./dags ./logs ./plugins ./config
	@echo "AIRFLOW_UID=$$(id -u)" > .env
	@if [ ! -f docker-compose.yaml ]; then \
		echo "Downloading docker-compose.yaml..."; \
		curl -LfO 'https://airflow.apache.org/docs/apache-airflow/3.1.0/docker-compose.yaml'; \
	fi
	@echo "Initializing database..."
	@docker compose up airflow-init
	@echo "Airflow initialized successfully!"

install-dev:
	@echo "Installing development dependencies..."
	@pip3 install -e ".[dev]"
	@echo "Development dependencies and local package installed!"

# === Container Management ===

up:
	@echo "Starting Airflow services..."
	@docker compose up -d
	@echo "Airflow is starting up. Access the UI at http://localhost:8080"
	@echo "Default credentials: airflow / airflow"

down:
	@echo "Stopping Airflow services..."
	@docker compose down

restart: down up

clean:
	@echo "WARNING: This will remove all containers, volumes, and data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v --remove-orphans; \
		echo "Cleaned up successfully!"; \
	else \
		echo "Cancelled."; \
	fi

# === Logs & Monitoring ===

logs:
	@docker compose logs -f

logs-scheduler:
	@docker compose logs -f airflow-scheduler

logs-worker:
	@docker compose logs -f airflow-worker

logs-apiserver:
	@docker compose logs -f airflow-apiserver

ps:
	@docker compose ps

# === DAG Management ===

# Generic command executor
# Usage: make airflow dags list
# Usage: make airflow dags test demo_taskflow_dag
# Usage: make airflow dags unpause demo_taskflow_dag
# Usage: make airflow tasks test demo_taskflow_dag extract 2024-01-01
airflow:
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		echo "Error: Please specify an Airflow command"; \
		echo ""; \
		echo "Examples:"; \
		echo "  make airflow dags list"; \
		echo "  make airflow dags test demo_taskflow_dag"; \
		echo "  make airflow dags unpause demo_taskflow_dag"; \
		echo "  make airflow dags pause demo_taskflow_dag"; \
		echo "  make airflow dags trigger demo_taskflow_dag"; \
		echo "  make airflow tasks list demo_taskflow_dag"; \
		exit 1; \
	fi
	@docker compose exec airflow-scheduler airflow $(filter-out $@,$(MAKECMDGOALS))

# Refresh/reload DAGs by reserializing them in the metadata DB
refresh:
	@echo "Reserializing DAGs in the metadata database..."
	@docker compose exec airflow-scheduler airflow dags reserialize
	@echo "DAGs have been reloaded!"

# === Code Quality ===

lint:
	@echo "Running ruff linter on source and DAG files..."
	@ruff check src/ dags/

format:
	@echo "Formatting source and DAG files with ruff..."
	@ruff format src/ dags/

type-check:
	@echo "Running mypy type checker on source and DAG files..."
	@mypy src/ dags/

check: lint type-check
	@echo "All checks completed!"

fix: format
	@echo "Auto-fixing linting issues..."
	@ruff check src/ dags/ --fix
	@echo "Auto-fix completed!"

# === Testing ===

test: test-unit test-dags
	@echo "All tests completed!"

test-unit:
	@echo "Running unit tests with pytest..."
	@pytest tests/ -v

test-dags:
	@echo "Validating DAG integrity..."
	@python3 scripts/test_dags.py

# === Web UI ===

ui:
	@echo "Opening Airflow UI in browser..."
	@if command -v xdg-open > /dev/null; then \
		xdg-open http://localhost:8080; \
	elif command -v open > /dev/null; then \
		open http://localhost:8080; \
	else \
		echo "Please open http://localhost:8080 in your browser"; \
	fi

# === Database ===

db-reset:
	@echo "WARNING: This will reset the Airflow database!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down; \
		docker compose up airflow-init; \
		docker compose up -d; \
		echo "Database reset completed!"; \
	else \
		echo "Cancelled."; \
	fi

# === Utility ===

shell:
	@docker compose exec airflow-scheduler bash

shell-worker:
	@docker compose exec airflow-worker bash

python:
	@docker compose exec airflow-scheduler python

# === Variables Configuration ===

config-list:
	@docker compose exec airflow-scheduler airflow config list

# === Connection Management ===

connections-list:
	@docker compose exec airflow-scheduler airflow connections list

connections-add:
	@if [ -z "$(CONN_ID)" ] || [ -z "$(CONN_TYPE)" ]; then \
		echo "Error: Please specify CONN_ID and CONN_TYPE"; \
		echo "Example: make connections-add CONN_ID=my_postgres CONN_TYPE=postgres"; \
		exit 1; \
	fi
	@docker compose exec airflow-scheduler airflow connections add $(CONN_ID) --conn-type $(CONN_TYPE)

# Catch-all target to handle arguments passed to airflow command
# This must be at the end of the Makefile to avoid conflicts
%:
	@true
