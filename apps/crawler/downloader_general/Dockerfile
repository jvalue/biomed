FROM python:3.14-slim

WORKDIR /app

# Install uv (pinned)
RUN pip install --upgrade pip \
    && pip install "uv==0.9.13"

# Disable Python buffering for live logs
ENV PYTHONUNBUFFERED=1

# Copy application and shared library from monorepo root context
# Expect build context to be the monorepo root (see docker-compose.yml)
COPY apps/crawler/downloader_general ./downloader_general
COPY libs/crawler-common ./libs/crawler-common

# Install shared library first, then the app itself
RUN uv pip install --system ./libs/crawler-common \
    && uv pip install --system ./downloader_general

# Run the app
CMD ["python", "-m", "src.main"]
