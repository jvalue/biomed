FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.9.13 /uv /uvx /bin/

WORKDIR /app

# Disable Python buffering for live logs & set uv network timeout
ENV PYTHONUNBUFFERED=1
ENV UV_HTTP_TIMEOUT=120

# Copy shared libraries and services needed by graphql_api resolvers
COPY libs/crawler-common ./libs/crawler-common
COPY apps/postgres_mcp ./apps/postgres_mcp
COPY apps/s3_mcp ./apps/s3_mcp
COPY apps/graphql_api ./apps/graphql_api

# Install dependencies into system Python
RUN uv pip install --system \
    ./libs/crawler-common \
    ./apps/postgres_mcp \
    ./apps/s3_mcp \
    ./apps/graphql_api

EXPOSE 8003

CMD ["python", "apps/graphql_api/main.py"]
