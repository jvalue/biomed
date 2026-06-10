# s3-mcp — MCP server for Biomed S3

This FastMCP server exposes the biomed S3 bucket as MCP resources and tools
(list_bucket, get_object_metadata, read_object). Use the MCP Inspector to
exercise the API and connect a local LLM client.

## Prerequisites
- Python virtualenv with project dependencies installed
- `uv` (uv run) available in PATH (optional but recommended)
- Node.js + npm (for the Inspector / npx)

## Configure S3 access
The server reads settings from environment variables or `apps/s3_mcp/.env`.
Common variables:

- `S3_ENDPOINT_URL` (default: `http://localhost:9000`)
- `S3_BUCKET` (default: `biomed-data`)
- `S3_TIMEOUT_SECONDS`, `S3_MAX_READ_BYTES` (optional)
- AWS credentials (if required): `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `AWS_REGION`

Example `.env` (create `apps/s3_mcp/.env`):

```
S3_ENDPOINT_URL=http://localhost:9000
S3_BUCKET=biomed-data
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
```

## Start the MCP server

Option A — run directly (quick):

```bash
# activate your venv
export MCP_TRANSPORT=streamable-http
python -m apps.s3_mcp.main
```

Option B — run via `uv` (recommended for Inspector integration):

```bash
# from repository root
uv run --with mcp mcp run apps/s3_mcp/main.py
```

To run on a different port:

```bash
export FASTMCP_PORT=8001
export MCP_TRANSPORT=streamable-http
python -m apps.s3_mcp.main
```

## Start the MCP Inspector (UI)

Option 1 — using `npx` (no extra pip installs required):

```bash
npx @modelcontextprotocol/inspector
```

Option 2 — if you installed `mcp[cli]` in your venv:

```bash
mcp dev apps/s3_mcp/main.py
```

Once the Inspector is open in the browser:

- Connect to the server: choose "Streamable HTTP" and use `http://127.0.0.1:8000/mcp` (adjust port if you set `FASTMCP_PORT`).
- Use Resources → `s3://bucket` (Bucket_Root) to view the root listing.
- Use Tools → `list_bucket`, `get_object_metadata`, `read_object` to list prefixes and read objects.

## Connecting a local LLM
If your local LLM exposes an OpenAI‑compatible HTTP API, add it in the Inspector under Models/Clients as an OpenAI‑compatible client and then use the Sampling UI to drive tool-calls.

## Troubleshooting
- If you see `AccessDenied` from S3: check AWS env vars or the `.env` file and restart the server.
- If Inspector cannot spawn `uv`, run the server manually (Option A) and connect via Streamable HTTP.

For further help, open an issue or ask for an adapter example (stdio↔HTTP) to connect a model.
