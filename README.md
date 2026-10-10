# Biomed Platform

An end-to-end platform for automated discovery, ingestion, relational mapping, and AI-assisted querying of biomedical data sources (NCBI, UniProt, BioProject, PMC).

---

## 🏛️ Architecture Overview

```text
               ┌────────────────────────────────────────────────────────┐
               │                  Biomedical Data Sources               │
               │           (NCBI FTP, UniProt, BioProject, etc.)         │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  Discovery & Downloader Stack (apps/crawler)                                            │
│   • crawler_general: Streams FTP trees, detects changes, queues downloads to RabbitMQ │
│   • downloader_general: Consumes queue, streams files into S3/MinIO & local storage    │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  Data Transformation & Relational Mapping (apps/xml_ingestor & libs/crawler-common)   │
│   • Auto-derives PostgreSQL schemas from XML Schema (.xsd) definitions                │
│   • Streams and flattens XML trees into normalized tables & materialized views        │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                      ┌────────────────────┴───────────────────┐
                      ▼                                        ▼
┌───────────────────────────────────────────┐ ┌───────────────────────────────────────────┐
│  Unified GraphQL API (apps/graphql_api)   │ │  Biomed Unified MCP (apps/biomed_mcp)     │
│   • Strawberry GraphQL (Port 8003)        │ │   • FastMCP server (Port 8004 / SSE)      │
│   • Inspects schemas, tables, views       │ │   • Exposes 12 domain tools to AI agents  │
│   • Exposes UniProt & BioProject data     │ │   • In-process GraphQL execution          │
└─────────────────────┬─────────────────────┘ └───────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  Management & Orchestration UI                                                        │
│   • management-backend (NestJS, Port 3002): Auth, schedule engine, Argo Workflows sync│
│   • management-frontend (React/TanStack, Port 4201): Monitoring and schedule UI       │
│   • Argo Workflows (Kubernetes): Distributed containerized workflow execution         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Repository Map

### Applications (`apps/`)

| Path | Tech Stack | Port | Description |
| :--- | :--- | :---: | :--- |
| **[`apps/crawler/crawler_general`](apps/crawler/README.md)** | Python (`uv`) | — | Streaming FTP crawler with delta-detection and RabbitMQ dispatching. |
| **[`apps/crawler/downloader_general`](apps/crawler/README.md)** | Python (`uv`) | — | RabbitMQ queue consumer; downloads queued files to disk or S3/MinIO. |
| **[`apps/crawler/crawler_dummy`](apps/crawler/README.md)** | Python (`uv`) | — | Lightweight crawler skeleton for testing management backend integration. |
| **[`apps/xml_ingestor`](apps/xml_ingestor/README.md)** | Python (`uv`) | — | Relational schema generator and streaming XML-to-PostgreSQL ingestor. |
| **[`apps/graphql_api`](apps/graphql_api/)** | Python / Strawberry | `8003` | Unified GraphQL API for PostgreSQL tables, views, and S3 objects. |
| **[`apps/biomed_mcp`](apps/biomed_mcp/)** | Python / FastMCP | `8004` | Unified Model Context Protocol (MCP) server exposing 12 tools to AI agents. |
| **[`apps/management-backend`](apps/management-backend/)** | NestJS / TypeORM | `3002` | Management API for schedules, API keys, and Argo Workflows orchestration. |
| **[`apps/management-frontend`](apps/management-frontend/)** | React / TanStack | `4201` | Dashboard UI for managing crawl schedules and workflow executions. |

### Shared Libraries & Infrastructure

| Path | Description |
| :--- | :--- |
| **[`libs/crawler-common`](libs/crawler-common/README.md)** | Shared Python library: FTP tools, S3 client, RabbitMQ helpers, and XML Schema mapping engine. |
| **[`biomed-deployment`](../biomed-deployment/)** | Deployment workspace containing Helm charts for Argo Workflows and WorkflowTemplates. |
| **[`sql/`](sql/)** | Materialized view definitions (e.g. `uniprot_materialized_views.sql`) for query optimization. |
| **[`docs/`](docs/)** | Architecture documentation ([arc42](docs/arc42/)) and [XML Schema mapping examples](docs/xml_schema_mapping_examples.md). |

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Python >= 3.13** and **[uv](https://docs.astral.sh/uv/)** package manager
- **Node.js >= 20** and **npm**
- **Docker** and **Docker Compose**

### 2. Install Dependencies

```bash
# Install Python workspace packages (virtualenv created at .venv/)
uv sync

# Install Node / Nx dependencies
npm install
```

### 3. Start Infrastructure with Docker Compose

To spin up PostgreSQL databases, RabbitMQ, and MinIO:

```bash
# Start storage & message brokers in the background
docker compose up -d biomed-db biomed-crawler-db rabbitmq minio minio-init
```

| Service | Connection | Purpose |
| :--- | :--- | :--- |
| **biomed-db** | `localhost:5435` | Main relational database (`postgres/postgres`) |
| **biomed-crawler-db** | `localhost:5436` | Crawler discovery run metadata |
| **RabbitMQ** | `localhost:5672` (UI: `15672`) | Download task broker (`guest/guest`) |
| **MinIO (S3)** | `localhost:9000` (UI: `9001`) | Object storage (`minioadmin/minioadmin`) |

### 4. Running Services Locally

You can run individual services directly using workspace scripts:

```bash
# 🖥️ Management Frontend (React / TanStack Router)
npm run fe       # -> http://localhost:4201

# ⚙️ Management Backend (NestJS)
npm run be       # -> http://localhost:3002

# 📊 GraphQL API (Strawberry)
uv run apps/graphql_api/main.py    # -> GraphiQL at http://localhost:8003/graphql

# 🤖 Biomed Unified MCP Server
uv run apps/biomed_mcp/main.py     # -> SSE endpoint at http://localhost:8004/sse

# 🕷️ FTP Crawler Run
npm run crawler  # or: uv run apps/crawler/crawler_general/src/main.py
```

---

## ☸️ Kubernetes & Argo Workflows (Minikube / Kind)

For distributed workflow execution and end-to-end testing with Argo Workflows:

* Read the **[MINIKUBE_SETUP.md](MINIKUBE_SETUP.md)** guide.

It covers:
1. Setting up a local cluster with Ingress (`minikube start --cpus=4 --memory=8192`).
2. Deploying Argo Workflows and MinIO artifact archiving via Helm.
3. Replicating secrets (`crawler-management-auth`, `argo-workflows-minio`).
4. Loading local Docker images (`minikube image load <image>`).
5. Running and observing WorkflowTemplates.

---

## 🧪 Testing & Code Quality

### Python Tests
Run pytest across any subproject:

```bash
# Run crawler suite
uv run pytest apps/crawler -q

# Run shared library suite
uv run pytest libs/crawler-common -q

# Run GraphQL API tests
uv run pytest apps/graphql_api -q

# Run Unified MCP tests
uv run pytest apps/biomed_mcp -q

# Run XML Ingestor tests
uv run pytest apps/xml_ingestor -o addopts="" -q
```

### TypeScript / Frontend Tests
```bash
# Run all Nx tests
npm test

# Test specific projects
npx nx test management-backend
npx nx test management-frontend
```

### Linting & Formatting
```bash
# Python (Ruff)
uv run ruff check .
uv run ruff format .

# TypeScript / Web (Biome & ESLint)
npm run lint
npx biome check --write --unsafe .
```

---

## 📚 Key Documentation Links

* **[Architecture (arc42)](docs/arc42/01_requirements.md)**: Architectural constraints, building blocks, and runtime views.
* **[Crawler Infrastructure](apps/crawler/README.md)**: Crawler modules, streaming traversal, and queue payload schemas.
* **[Minikube & Argo Setup](MINIKUBE_SETUP.md)**: Step-by-step local Kubernetes runbook.
