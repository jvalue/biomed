# postgres-mcp — MCP server for Biomed PostgreSQL Database

This FastMCP server exposes tables and data ingested into PostgreSQL as MCP resources and tools
(`list_tables`, `describe_table`, `read_table`, `execute_query`). Use the MCP Inspector to
exercise the API and connect a local LLM client.

## Prerequisites
- Python virtualenv with project dependencies installed
- `uv` (`uv run`) available in PATH (optional but recommended)
- Node.js + npm (for the Inspector / npx)
- Running PostgreSQL database (e.g. via `docker compose up -d biomed-db`)

## Configure Database access
The server reads settings from environment variables or `apps/postgres_mcp/.env`.
Common variables:

- `POSTGRES_DATABASE_URL` (default: `postgresql+psycopg2://postgres:postgres@localhost:5435/biomed`)
- `POSTGRES_SCHEMA` (default: `public`)
- `POSTGRES_MAX_ROWS` (default: `500`)
- `POSTGRES_READ_ONLY` (default: `true`)

Example `.env` (create `apps/postgres_mcp/.env`):

```env
POSTGRES_DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5435/biomed
POSTGRES_SCHEMA=public
POSTGRES_READ_ONLY=true
```

## Start the MCP server

Option A — run directly (stdio transport):

```bash
uv run python -m apps.postgres_mcp.main
```

Option B — run with Streamable HTTP transport (default port 8002):

```bash
export MCP_TRANSPORT=streamable-http
uv run python -m apps.postgres_mcp.main
```

To run on a custom port (e.g. 8005 or 8080):

```bash
export MCP_TRANSPORT=streamable-http
export FASTMCP_PORT=8005
uv run python -m apps.postgres_mcp.main
```

## Start the MCP Inspector (UI)

Option 1 — using `npx`:

```bash
npx @modelcontextprotocol/inspector
```

Option 2 — using `mcp dev`:

```bash
uv run --with "mcp[cli]" mcp dev apps/postgres_mcp/main.py:mcp
```

Once the Inspector is open in the browser:

- Connect to the server: choose "Streamable HTTP" and use `http://127.0.0.1:8000/mcp` (adjust port if you set `FASTMCP_PORT`).
- Use Resources → `postgres://tables` to view all ingested tables.
- Use Tools → `list_tables`, `describe_table`, `read_table`, `execute_query` to inspect table schemas and query data.

## Running Tests

From repository root:

```bash
uv run pytest apps/postgres_mcp/tests
```
