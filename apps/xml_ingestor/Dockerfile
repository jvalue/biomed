FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.9.13 /uv /uvx /bin/

WORKDIR /app

# Disable Python buffering for live logs & set uv network timeout
ENV PYTHONUNBUFFERED=1
ENV UV_HTTP_TIMEOUT=120

# Copy source code and shared libraries
COPY libs/crawler-common ./libs/crawler-common
COPY apps/xml_ingestor ./apps/xml_ingestor

# Install shared library and xml_ingestor
RUN uv pip install --system ./libs/crawler-common ./apps/xml_ingestor

# Run the app
CMD ["python", "apps/xml_ingestor/main.py"]
