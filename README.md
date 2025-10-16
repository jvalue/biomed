# JValue BioMed

Open biomedical data crawler and cleaner powered by Apache Airflow. This project orchestrates data pipelines for crawling, processing, and cleaning biomedical datasets from sources like NCBI, EBI, and other open data repositories.

## Quick Start

### Prerequisites

- Docker & Docker Compose v2.14.0+
- At least 4GB memory allocated to Docker
- Python 3.10+ (for local development tools)

### Initial Setup

```bash
# Download docker-compose.yaml and initialize database
make init

# Build custom Docker image with jvalue_biomed package
docker compose build

# Start Airflow services
make up

# Install development tools (linting, type checking, testing)
make install-dev
```

Access the web UI at **http://localhost:8080**
Default credentials: `airflow` / `airflow`

**Note:** The project uses a custom Docker image that includes the `jvalue_biomed` package. The first build may take a few minutes.

## Development Workflow

### Creating DAGs

1. Create your DAG file in `dags/` directory
2. Use the TaskFlow API for Pythonic DAG definitions
3. Import utilities from `jvalue_biomed` package as needed:
   ```python
   from jvalue_biomed.crawlers.ftp import parse_ftp_list_item
   from jvalue_biomed.parsers.genbank import parse_genbank_record
   ```
4. Run linting, type checking, and tests:
   ```bash
   make check  # Lint + type check
   make test   # Run all tests
   ```
5. Reload DAGs in Airflow:
   ```bash
   make refresh
   ```

### Managing DAGs

```bash
# List all DAGs
make airflow dags list

# Test a DAG
make airflow dags test demo_taskflow_dag

# Unpause/pause a DAG
make airflow dags unpause demo_taskflow_dag
make airflow dags pause demo_taskflow_dag

# Trigger a DAG manually
make airflow dags trigger demo_taskflow_dag

# Reload DAGs after changes
make refresh
```

### Developing Reusable Package Code

1. Add utilities to `src/jvalue_biomed/`:
   - `crawlers/` - For data fetching (FTP, HTTP, APIs)
   - `parsers/` - For parsing biomedical formats
2. Write unit tests in `tests/`:
   ```bash
   make test-unit
   ```
3. After modifying package code, rebuild Docker containers:
   ```bash
   docker compose build
   make down && make up
   ```

**Note:** DAG changes don't require rebuilding, but package changes do since the package is installed in the Docker image.

### Code Quality

All commands check both `src/` (package) and `dags/` directories:

```bash
# Run linter (checks src/ and dags/)
make lint

# Auto-format code
make format

# Type check (checks src/ and dags/)
make type-check

# Run all checks (lint + type-check)
make check

# Auto-fix issues
make fix
```

### Testing

```bash
# Run all tests (unit + DAG integrity)
make test

# Run only unit tests (pytest)
make test-unit

# Run only DAG integrity tests
make test-dags
```

## Common Commands

| Command | Description |
|---------|-------------|
| `make help` | Show all available commands |
| `make up` | Start Airflow services |
| `make down` | Stop Airflow services |
| `make ps` | Show container status |
| `make logs` | Follow all logs |
| `make logs-scheduler` | Follow scheduler logs |
| `make refresh` | Reload DAGs |
| `make check` | Run linter + type checker |
| `make test` | Run all tests |
| `make airflow <cmd>` | Execute any Airflow CLI command |
| `docker compose build` | Rebuild Docker image (after package changes) |

## Project Structure

```
.
├── src/jvalue_biomed/          # Reusable Python package
│   ├── crawlers/               # Crawling utilities (FTP, HTTP, APIs)
│   └── parsers/                # Data format parsers (GenBank, FASTA, etc.)
├── dags/                       # DAG definitions
│   ├── demo_taskflow_dag.py   # Example TaskFlow DAG
│   └── genbank_ftp_crawler.py # GenBank FTP crawler
├── tests/                      # Package tests (pytest)
├── logs/                       # Airflow logs
├── plugins/                    # Custom Airflow plugins (operators, sensors)
├── config/                     # Airflow configuration
├── Dockerfile                  # Custom Airflow image with local package
├── docker-compose.yaml         # Docker services definition
├── pyproject.toml              # Package definition + tool configs (ruff, mypy, pytest)
├── cspell.json                 # Spell checker configuration
└── Makefile                    # Utility commands
```

### Package Usage

DAGs can import reusable utilities from the `jvalue_biomed` package:

```python
from jvalue_biomed.crawlers.ftp import parse_ftp_list_item
from jvalue_biomed.parsers.genbank import parse_genbank_record
```

The package is automatically installed in Docker containers via the custom Dockerfile.

## Data Sources

Current and planned biomedical data sources:

- **NCBI** - National Center for Biotechnology Information
  - GenBank (DNA sequences) - `genbank_ftp_crawler.py`
  - PubMed (literature)
  - RefSeq (reference sequences)
- **EBI** - European Bioinformatics Institute
  - ENA (European Nucleotide Archive)
  - UniProt (protein sequences)
- **Additional sources**
  - PDB (Protein Data Bank)
  - ChEMBL (bioactive molecules)

## Example DAGs

- `dags/genbank_ftp_crawler.py` - Crawls NCBI GenBank FTP server for sequence files

## Useful Resources

**Airflow Documentation:**
- [Apache Airflow Documentation](https://airflow.apache.org/docs/apache-airflow/stable/index.html)
- [TaskFlow API Tutorial](https://airflow.apache.org/docs/apache-airflow/stable/tutorial/taskflow.html)
- [Airflow Best Practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html)

**Biomedical Data Sources:**
- [NCBI FTP Site](https://ftp.ncbi.nlm.nih.gov/)
- [EBI Data Services](https://www.ebi.ac.uk/services)
- [NCBI E-utilities API](https://www.ncbi.nlm.nih.gov/books/NBK25501/)
- [UniProt REST API](https://www.uniprot.org/help/api)

## Troubleshooting

### Containers not starting
```bash
make down
make clean  # Warning: removes all data
make init
docker compose build
make up
```

### DAGs not appearing
```bash
# Check for import errors
make airflow dags list-import-errors

# Refresh DAGs
make refresh
```

### "Module not found: jvalue_biomed"
The package needs to be installed:
```bash
# For Docker containers (most common):
docker compose build
make down && make up

# For local development:
make install-dev
```

### Package changes not reflected in Airflow
After modifying code in `src/jvalue_biomed/`, rebuild the Docker image:
```bash
docker compose build
make down && make up
```

**Note:** DAG changes don't require rebuilding - just run `make refresh`.

### Reset everything
```bash
make clean  # Removes all containers and volumes
make init   # Reinitialize
docker compose build  # Rebuild with package
make up     # Start fresh
```
