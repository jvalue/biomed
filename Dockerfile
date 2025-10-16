# Dockerfile - Custom Airflow image with jvalue-biomed package
# Extends the official Apache Airflow image to include local packages

FROM apache/airflow:3.1.0

# Switch to root to install packages
USER root

# Copy the local package source
COPY --chown=airflow:root src /opt/airflow/src
COPY --chown=airflow:root pyproject.toml /opt/airflow/pyproject.toml

# Switch back to airflow user
USER airflow

# Install the local package in editable mode
# This allows DAGs to import from jvalue_biomed without rebuilding the image
RUN pip install --no-cache-dir -e /opt/airflow
