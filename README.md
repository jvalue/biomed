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

# Start Airflow services
make up

# Install development tools (linting, type checking)
make install-dev
```

Access the web UI at **http://localhost:8080**
Default credentials: `airflow` / `airflow`

## Development Workflow

### Creating DAGs

1. Create your DAG file in `dags/` directory
2. Use the TaskFlow API for Pythonic DAG definitions
3. Run linting and type checking:
   ```bash
   make check
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

### Code Quality

```bash
# Run linter
make lint

# Auto-format code
make format

# Type check
make type-check

# Run all checks
make check

# Auto-fix issues
make fix
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
| `make airflow <cmd>` | Execute any Airflow CLI command |

## Project Structure

```
.
├── dags/                       # DAG definitions
│   └── demo_taskflow_dag.py   # Example TaskFlow DAG
├── logs/                       # Airflow logs
├── plugins/                    # Custom Airflow plugins
├── config/                     # Airflow configuration
├── docker-compose.yaml         # Docker services definition
├── Makefile                    # Utility commands
├── ruff.toml                   # Linting configuration
├── mypy.ini                    # Type checking configuration
└── requirements-dev.txt        # Development dependencies
```

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
make up
```

### DAGs not appearing
```bash
# Check for import errors
make airflow dags list-import-errors

# Refresh DAGs
make refresh
```

### Reset everything
```bash
make clean  # Removes all containers and volumes
make init   # Reinitialize
make up     # Start fresh
```
