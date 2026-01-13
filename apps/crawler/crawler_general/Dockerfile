FROM python:3.14-slim

WORKDIR /app

# Install uv (pinned)
RUN pip install --upgrade pip \
    && pip install "uv==0.9.13"

# Copy application and shared library from monorepo root context
# Expect build context to be the monorepo root (see docker-compose.yml)
COPY apps/crawler/pyproject.toml ./pyproject.toml
COPY apps/crawler/crawler_general ./crawler_general
COPY libs/crawler-common ./libs/crawler-common

# Install shared library first, then the app itself
RUN uv pip install --system ./libs/crawler-common \
    && uv pip install --system .

# Run the app directly with Python (packages already installed system-wide)
CMD ["python", "crawler_general/main.py"]
