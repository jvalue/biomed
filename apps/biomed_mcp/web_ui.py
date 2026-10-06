# ruff: noqa: E501
from __future__ import annotations

import asyncio
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from mcp import ClientSession
from mcp.client.sse import sse_client

APP_DIR = Path(__file__).resolve().parent
load_dotenv(APP_DIR / ".env")
load_dotenv(APP_DIR.parent.parent / ".env")

MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8004/sse")
GRAPHQL_URL = os.getenv("GRAPHQL_API_URL", "http://localhost:8003/graphql")
PORT = int(os.getenv("WEB_UI_PORT", "5050"))

# Default to remote cluster GraphQL endpoint if port-forwarded
os.environ["GRAPHQL_API_URL"] = os.getenv("GRAPHQL_API_URL", "http://localhost:8003/graphql")

sys.path.insert(0, str(APP_DIR.parent / "graphql_api"))
sys.path.insert(0, str(APP_DIR.parent / "postgres_mcp"))
sys.path.insert(0, str(APP_DIR.parent / "s3_mcp"))
sys.path.insert(0, str(APP_DIR))

from biomed_mcp.server import (  # noqa: E402
    describe_table,
    execute_query,
    get_bioproject_publications,
    get_s3_object_metadata,
    get_uniprot_cross_references,
    list_s3_objects,
    list_tables,
    list_views,
    query_view,
    read_s3_object,
    search_bioproject,
    search_uniprot,
)

GRAPHQL_URL = os.getenv("GRAPHQL_API_URL", "http://localhost:8003/graphql")
PORT = int(os.getenv("WEB_UI_PORT", "5050"))


def _execute_gql(query: str, variables: dict[str, Any] | None = None) -> dict[str, Any]:
    """Execute GraphQL query against remote HTTP service or in-process schema."""
    # Attempt HTTP request to port-forwarded / cluster GraphQL API first
    try:
        req = Request(
            GRAPHQL_URL,
            data=json.dumps({"query": query, "variables": variables or {}}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("errors"):
                messages = "; ".join(str(e.get("message", e)) for e in data["errors"])
                raise RuntimeError(f"GraphQL error: {messages}")
            return data["data"]
    except Exception as http_exc:
        # Fallback to in-process execution if GraphQL endpoint is not running
        try:
            from graphql_api.schema.query import schema as graphql_schema

            result = graphql_schema.execute_sync(query, variable_values=variables)
            if result.errors:
                messages = "; ".join(str(e) for e in result.errors)
                raise RuntimeError(f"In-process GraphQL error: {messages}")
            return result.data
        except Exception:
            raise http_exc

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "search_uniprot",
            "description": "Search UniProt protein entry summaries from mv_uniprot_entry_overview by keyword, accession, or NCBI taxonomy ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search text (protein name, gene name, organism, keyword)",
                    },
                    "accession": {
                        "type": "string",
                        "description": "Primary UniProt accession (e.g. 'P0C9F0')",
                    },
                    "taxid": {
                        "type": "string",
                        "description": "NCBI Taxonomy ID (e.g. '561445', '9606')",
                    },
                    "limit": {"type": "integer", "description": "Max entries to return (default: 50)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_bioproject",
            "description": "Search NCBI BioProject summaries from mv_bioproject_overview by keyword, accession, or taxonomy ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search text (project title, organism name, supergroup)",
                    },
                    "accession": {
                        "type": "string",
                        "description": "BioProject accession (e.g. 'PRJNA12345')",
                    },
                    "taxid": {
                        "type": "string",
                        "description": "NCBI Taxonomy ID",
                    },
                    "limit": {"type": "integer", "description": "Max projects to return (default: 50)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_bioproject_publications",
            "description": "Query publications and literature citations for a BioProject accession or PubMed ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "accession": {
                        "type": "string",
                        "description": "BioProject accession",
                    },
                    "pubmed_id": {
                        "type": "string",
                        "description": "PubMed ID",
                    },
                    "limit": {"type": "integer", "description": "Max rows to return"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_uniprot_cross_references",
            "description": "Query external database cross-references (PDB, AlphaFoldDB, RefSeq, Ensembl, GO, etc.) for a UniProt accession.",
            "parameters": {
                "type": "object",
                "properties": {
                    "accession": {
                        "type": "string",
                        "description": "Primary UniProt accession",
                    },
                    "database_type": {
                        "type": "string",
                        "description": "Database type filter (e.g. 'PDB', 'RefSeq', 'AlphaFoldDB')",
                    },
                    "limit": {"type": "integer", "description": "Max rows to return"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_views",
            "description": "List all materialized and standard views in a PostgreSQL schema.",
            "parameters": {
                "type": "object",
                "properties": {
                    "schema_name": {
                        "type": "string",
                        "description": "Database schema name (e.g. 'uniprot', 'bioproject', 'public')",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_view",
            "description": "Query rows from any database view (e.g. mv_uniprot_entry_overview, mv_bioproject_overview).",
            "parameters": {
                "type": "object",
                "properties": {
                    "view_name": {
                        "type": "string",
                        "description": "View name to query",
                    },
                    "schema_name": {
                        "type": "string",
                        "description": "Database schema name (e.g. 'uniprot', 'bioproject')",
                    },
                    "limit": {"type": "integer", "description": "Max rows to return"},
                    "offset": {"type": "integer", "description": "Row offset"},
                },
                "required": ["view_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_tables",
            "description": "List all tables in a database schema with column counts and estimated row counts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "schema_name": {
                        "type": "string",
                        "description": "Database schema name (e.g. 'uniprot', 'bioproject', 'public')",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "describe_table",
            "description": "Get detailed table metadata (columns, types, nullable, primary key, foreign keys, indexes).",
            "parameters": {
                "type": "object",
                "properties": {
                    "table_name": {"type": "string", "description": "Table name"},
                    "schema_name": {"type": "string", "description": "Schema name"},
                },
                "required": ["table_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "execute_query",
            "description": "Execute a read-only SELECT SQL query against the database.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sql": {
                        "type": "string",
                        "description": "SELECT SQL statement to execute",
                    },
                    "limit": {"type": "integer", "description": "Max rows limit"},
                },
                "required": ["sql"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_s3_objects",
            "description": "List objects in the S3 bucket by prefix.",
            "parameters": {
                "type": "object",
                "properties": {
                    "prefix": {"type": "string", "description": "S3 prefix/folder path"},
                    "delimiter": {"type": "string", "description": "Delimiter (default '/')"},
                    "max_keys": {"type": "integer", "description": "Max objects to list"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_s3_object_metadata",
            "description": "Get metadata (size, content type, ETag, last modified) for an S3 object.",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": {"type": "string", "description": "S3 object key"},
                },
                "required": ["key"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_s3_object",
            "description": "Read text content of an S3 object.",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": {"type": "string", "description": "S3 object key"},
                },
                "required": ["key"],
            },
        },
    },
]


async def _call_mcp_tool_sse(name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Invoke tool on remote FastMCP server over Server-Sent Events (SSE)."""
    async with sse_client(MCP_SERVER_URL) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool(name, arguments=args)
            if getattr(result, "isError", False):
                err_text = "; ".join(c.text for c in result.content if hasattr(c, "text"))
                raise RuntimeError(err_text or f"Tool call failed for {name}")
            for c in result.content:
                if hasattr(c, "text"):
                    try:
                        return json.loads(c.text)
                    except Exception:
                        return {"result": c.text}
            return {"content": [getattr(c, "text", str(c)) for c in result.content]}


def _local_tool_dispatch(name: str, args: dict) -> dict:
    if name == "search_uniprot":
        return search_uniprot(
            query=args.get("query"),
            accession=args.get("accession"),
            taxid=args.get("taxid"),
            limit=args.get("limit", 50),
        )
    if name == "search_bioproject":
        return search_bioproject(
            query=args.get("query"),
            accession=args.get("accession"),
            taxid=args.get("taxid"),
            limit=args.get("limit", 50),
        )
    if name == "get_bioproject_publications":
        return get_bioproject_publications(
            accession=args.get("accession"),
            pubmed_id=args.get("pubmed_id"),
            limit=args.get("limit", 50),
        )
    if name == "get_uniprot_cross_references":
        return get_uniprot_cross_references(
            accession=args.get("accession"),
            database_type=args.get("database_type"),
            limit=args.get("limit", 50),
        )
    if name == "list_views":
        return list_views(schema_name=args.get("schema_name", "public"))
    if name == "query_view":
        return query_view(
            view_name=args["view_name"],
            schema_name=args.get("schema_name", "public"),
            limit=args.get("limit", 100),
            offset=args.get("offset", 0),
        )
    if name == "list_tables":
        return list_tables(schema_name=args.get("schema_name", "public"))
    if name == "describe_table":
        return describe_table(
            table_name=args["table_name"],
            schema_name=args.get("schema_name", "public"),
        )
    if name == "execute_query":
        return execute_query(sql=args["sql"], limit=args.get("limit", 100))
    if name == "list_s3_objects":
        return list_s3_objects(
            prefix=args.get("prefix", ""),
            delimiter=args.get("delimiter", "/"),
            max_keys=args.get("max_keys", 100),
        )
    if name == "get_s3_object_metadata":
        return get_s3_object_metadata(key=args["key"])
    if name == "read_s3_object":
        return read_s3_object(key=args["key"])
    return {"error": f"Unknown tool: {name}"}


def handle_tool_call(name: str, args: dict) -> dict:
    if MCP_SERVER_URL:
        try:
            return asyncio.run(_call_mcp_tool_sse(name, args))
        except Exception as sse_exc:
            print(f"⚠️ SSE MCP call to {MCP_SERVER_URL} failed ({sse_exc}); using local/GraphQL fallback.")
    try:
        return _local_tool_dispatch(name, args)
    except Exception as exc:
        return {"error": str(exc)}


def process_chat(
    llm_url: str, model_name: str, api_key: str, messages: list[dict]
) -> dict:
    key_status = "[PROVIDED]" if api_key else "[NOT SET]"
    print(
        f"\n💬 Processing request with LLM ({llm_url}, model={model_name}, key={key_status})..."
    )
    system_msg = {
        "role": "system",
        "content": (
            "You are an expert biomedical AI assistant connected to PostgreSQL (with UniProt and BioProject schemas) "
            "and MinIO/S3 object storage via unified FastMCP tools. "
            "Use the provided tools to query materialized views (mv_uniprot_entry_overview, mv_bioproject_overview), "
            "cross-references, publications, tables, and S3 objects to accurately answer user inquiries."
        ),
    }

    full_messages = [system_msg] + [m for m in messages if m["role"] != "system"]

    payload = {
        "model": model_name or "default",
        "messages": full_messages,
        "tools": TOOLS_SCHEMA,
    }

    auth_header = f"Bearer {api_key}" if api_key else "Bearer dummy"
    headers = {
        "Content-Type": "application/json",
        "Authorization": auth_header,
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
    }

    api_endpoint = f"{llm_url.rstrip('/')}/chat/completions"
    req = Request(
        api_endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
    )

    try:
        with urlopen(req, timeout=180) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        err_msg = str(exc)
        if hasattr(exc, "read"):
            try:
                err_body = exc.read().decode("utf-8")
                err_msg = f"{exc} - Body: {err_body}"
            except Exception:
                pass
        print(f"❌ Error connecting to LLM at {api_endpoint}: {err_msg}")
        return {"error": f"Error connecting to LLM at {api_endpoint}: {err_msg}"}

    choices = res_data.get("choices", [])
    if not choices:
        return {"error": "No response choices returned by LLM."}

    msg = choices[0].get("message", {})
    tool_calls = msg.get("tool_calls", [])

    if not tool_calls:
        print("✅ Received direct response from LLM.")
        return {"reply": msg.get("content", ""), "tool_execution": None}

    # Process tool calls
    executed_tools = []
    full_messages.append(msg)

    for call in tool_calls:
        fn = call.get("function", {})
        tool_name = fn.get("name")
        raw_args = fn.get("arguments", "{}")
        tool_args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args

        print(f"⚙️  Executing tool: {tool_name}({tool_args})")
        result = handle_tool_call(tool_name, tool_args)
        executed_tools.append({"tool": tool_name, "args": tool_args, "result": result})

        full_messages.append(
            {
                "role": "tool",
                "tool_call_id": call.get("id", "call_1"),
                "content": json.dumps(result),
            }
        )

    # Follow up with LLM for final synthesis
    payload["messages"] = full_messages
    req2 = Request(
        api_endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
    )

    try:
        with urlopen(req2, timeout=180) as resp:
            final_res = json.loads(resp.read().decode("utf-8"))
            final_msg = (
                final_res.get("choices", [{}])[0].get("message", {}).get("content", "")
            )
            print("✅ Received final response from LLM after tool execution.")
            return {"reply": final_msg, "tool_execution": executed_tools}
    except Exception as exc:
        err_msg = str(exc)
        if hasattr(exc, "read"):
            try:
                err_body = exc.read().decode("utf-8")
                err_msg = f"{exc} - Body: {err_body}"
            except Exception:
                pass
        print(f"⚠️ Error in follow-up request to LLM: {err_msg}")
        return {
            "reply": "Executed tool successfully.",
            "tool_execution": executed_tools,
            "error": err_msg,
        }


HTML_PAGE = r"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Biomed Unified MCP & GraphQL Inspector</title>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        :root {
            --bg: #0b0f19;
            --surface: #131b2e;
            --card: #1e293b;
            --card-border: #334155;
            --text: #f8fafc;
            --muted: #94a3b8;
            --accent: #38bdf8;
            --accent-hover: #0284c7;
            --accent-green: #34d399;
            --user-msg: #1e3a8a;
            --ai-msg: #1e293b;
            --code-bg: #070a13;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background-color: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

        header { background: var(--surface); border-bottom: 1px solid var(--card-border); padding: 0.8rem 1.5rem; display: flex; justify-content: space-between; align-items: center; }
        h1 { font-size: 1.15rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; color: var(--accent); }
        .badge { background: #0369a1; color: #fff; font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 9999px; font-weight: 500; }

        .settings-bar { display: flex; gap: 0.6rem; align-items: center; }
        .settings-bar input, .settings-bar select { background: var(--bg); border: 1px solid var(--card-border); color: var(--text); padding: 0.35rem 0.6rem; border-radius: 6px; font-size: 0.85rem; }

        main { flex: 1; display: flex; overflow: hidden; }

        .sidebar { width: 340px; background: var(--surface); border-right: 1px solid var(--card-border); display: flex; flex-direction: column; }
        .sidebar-header { padding: 0.75rem 1rem; border-bottom: 1px solid var(--card-border); display: flex; gap: 0.5rem; align-items: center; }
        .sidebar-tabs { display: flex; background: var(--bg); border-radius: 6px; padding: 2px; }
        .sidebar-tab { flex: 1; border: none; background: transparent; color: var(--muted); padding: 0.35rem 0.5rem; font-size: 0.8rem; cursor: pointer; border-radius: 4px; text-align: center; font-weight: 500; }
        .sidebar-tab.active { background: var(--card); color: var(--accent); }

        .sidebar-content { flex: 1; overflow-y: auto; padding: 0.85rem; }
        .sidebar-content h3 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin: 0.75rem 0 0.4rem 0; }

        .item-card { margin-bottom: 0.5rem; padding: 0.5rem 0.65rem; background: var(--card); border: 1px solid var(--card-border); border-radius: 6px; font-size: 0.85rem; cursor: pointer; transition: 0.15s; }
        .item-card:hover { border-color: var(--accent); }
        .item-card.view-card { border-left: 3px solid var(--accent); }
        .item-card.s3-card { border-left: 3px solid var(--accent-green); }

        .chat-container { flex: 1; display: flex; flex-direction: column; background: var(--bg); }
        .messages { flex: 1; overflow-y: auto; padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

        .message { max-width: 82%; padding: 0.85rem 1.1rem; border-radius: 10px; line-height: 1.5; font-size: 0.95rem; }
        .message.user { align-self: flex-end; background: var(--user-msg); border-bottom-right-radius: 2px; }
        .message.assistant { align-self: flex-start; background: var(--ai-msg); border-bottom-left-radius: 2px; border: 1px solid var(--card-border); }
        .message.assistant p { margin-bottom: 0.5rem; }
        .message.assistant ul, .message.assistant ol { margin-left: 1.2rem; margin-bottom: 0.5rem; }

        .tool-box { background: var(--code-bg); border: 1px solid #0284c7; border-radius: 6px; padding: 0.75rem; margin: 0.5rem 0; font-family: monospace; font-size: 0.82rem; }
        .tool-title { color: var(--accent); font-weight: bold; margin-bottom: 0.25rem; display: flex; justify-content: space-between; align-items: center; }

        .quick-runner { padding: 0.6rem 1rem; background: var(--surface); border-top: 1px solid var(--card-border); display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .chip { background: var(--card); border: 1px solid var(--card-border); color: var(--muted); font-size: 0.75rem; padding: 0.25rem 0.6rem; border-radius: 9999px; cursor: pointer; transition: 0.15s; }
        .chip:hover { color: var(--accent); border-color: var(--accent); }
        .chip.chip-active { background: var(--accent); color: #000; font-weight: 600; border-color: var(--accent); }

        .input-area { padding: 0.85rem 1rem; background: var(--surface); border-top: 1px solid var(--card-border); display: flex; gap: 0.75rem; }
        .input-area input { flex: 1; background: var(--bg); border: 1px solid var(--card-border); color: var(--text); padding: 0.65rem 1rem; border-radius: 8px; font-size: 0.95rem; }
        .input-area button { background: var(--accent); color: #000; font-weight: 600; border: none; padding: 0.65rem 1.25rem; border-radius: 8px; cursor: pointer; transition: 0.2s; }
        .input-area button:hover { background: var(--accent-hover); color: #fff; }

        .btn-sm { background: var(--card-border); color: var(--text); border: none; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer; }
        .btn-sm:hover { background: var(--accent); color: #000; }
        pre { white-space: pre-wrap; word-break: break-all; }
    </style>
</head>
<body>
    <header>
        <h1>🧬 Biomed Unified MCP Inspector <span class="badge">FastMCP + GraphQL</span></h1>
        <div class="settings-bar">
            <label style="font-size:0.8rem; color:var(--muted);">Schema:</label>
            <select id="schemaSelect" onchange="fetchCurrentTab()">
                <option value="bioproject" selected>bioproject</option>
                <option value="uniprot">uniprot</option>
                <option value="_ingest_metadata">_ingest_metadata</option>
                <option value="public">public</option>
            </select>
            <label style="font-size:0.8rem; color:var(--muted); margin-left:0.5rem;">LLM:</label>
            <input type="text" id="llmUrl" value="https://api.mammouth.ai/v1/" style="width: 170px;">
            <input type="text" id="modelName" value="gpt-5.4-nano" style="width: 100px;">
            <input type="password" id="apiKey" placeholder="API Key" style="width: 90px;">
        </div>
    </header>
    <main>
        <div class="sidebar">
            <div class="sidebar-header">
                <div class="sidebar-tabs" style="width: 100%;">
                    <button class="sidebar-tab active" id="tabDbBtn" onclick="switchTab('db')">PostgreSQL</button>
                    <button class="sidebar-tab" id="tabS3Btn" onclick="switchTab('s3')">MinIO / S3</button>
                </div>
            </div>
            <div class="sidebar-content" id="sidebarContent">
                <!-- Populated dynamically -->
            </div>
        </div>
        <div class="chat-container">
            <div class="messages" id="messages">
                <div class="message assistant">
                    👋 <b>Biomed Unified MCP Inspector</b> is connected to PostgreSQL and MinIO/S3.
                    <br><br>
                    Try asking questions across your datasets:
                    <ul style="margin-left: 1.2rem; margin-top: 0.4rem;">
                        <li>"Search UniProt for African swine fever virus proteins"</li>
                        <li>"Find UniProt entry P0C9F0 and list its PDB cross-references"</li>
                        <li>"Search BioProjects related to ASFV or cow genome"</li>
                        <li>"List publications associated with BioProject PRJNA10719"</li>
                        <li>"List files in the S3 bucket under downloader-files/"</li>
                    </ul>
                </div>
            </div>
            <div class="quick-runner">
                <span style="font-size:0.75rem; color:var(--muted); display:flex; align-items:center;">Quick Queries:</span>
                <span class="chip" onclick="quickSend('Search UniProt for African swine fever virus')">UniProt: ASFV</span>
                <span class="chip" onclick="quickSend('Get cross references for UniProt entry P0C9F0')">UniProt: P0C9F0 Xrefs</span>
                <span class="chip" onclick="quickSend('Search BioProject for Bos taurus')">BioProject: Bos taurus</span>
                <span class="chip" onclick="quickSend('List files in S3 bucket prefix downloader-files/')">S3: downloader-files/</span>
            </div>
            <div class="input-area">
                <input type="text" id="userInput" placeholder="Ask anything about UniProt, BioProject, or S3 files..." onkeydown="if(event.key==='Enter') sendMessage()">
                <button onclick="sendMessage()">Send</button>
            </div>
        </div>
    </main>

    <script>
        let currentTab = 'db';
        const conversation = [];

        function switchTab(tab) {
            currentTab = tab;
            document.getElementById('tabDbBtn').classList.toggle('active', tab === 'db');
            document.getElementById('tabS3Btn').classList.toggle('active', tab === 's3');
            fetchCurrentTab();
        }

        function fetchCurrentTab() {
            if (currentTab === 'db') {
                fetchDatabaseData();
            } else {
                fetchS3Data();
            }
        }

        function formatMarkdown(text) {
            if (!text) return "";
            if (typeof marked !== "undefined" && typeof marked.parse === "function") {
                return marked.parse(text);
            }
            return text.replace(/\n/g, '<br>');
        }

        function selectSchema(schemaName) {
            document.getElementById("schemaSelect").value = schemaName;
            fetchDatabaseData();
        }

        async function fetchDatabaseData() {
            const schema = document.getElementById("schemaSelect").value;
            const content = document.getElementById("sidebarContent");
            content.innerHTML = '<div style="color:var(--muted); padding:0.5rem;">Loading schema metadata...</div>';

            try {
                const [viewsRes, tablesRes] = await Promise.all([
                    fetch(`/api/views?schema=${encodeURIComponent(schema)}`),
                    fetch(`/api/tables?schema=${encodeURIComponent(schema)}`)
                ]);
                const viewsData = await viewsRes.json();
                const tablesData = await tablesRes.json();

                const schemas = ['bioproject', 'uniprot', '_ingest_metadata', 'public'];
                let schemaButtons = `<div style="display:flex; gap:0.35rem; margin-bottom:0.75rem; flex-wrap:wrap;">`;
                schemas.forEach(s => {
                    const activeCls = s === schema ? 'chip-active' : '';
                    schemaButtons += `<span class="chip ${activeCls}" onclick="selectSchema('${s}')">${s}</span>`;
                });
                schemaButtons += `</div>`;

                let html = schemaButtons;
                html += `<h3>Materialized Views (${viewsData.views ? viewsData.views.length : 0})</h3>`;
                if (viewsData.views && viewsData.views.length > 0) {
                    viewsData.views.forEach(v => {
                        const name = v.viewName || v.view_name;
                        const cols = v.columnCount ?? v.column_count ?? 0;
                        html += `<div class="item-card view-card" onclick="quickSend('Query view ${name} in schema ${schema} limit 5')">
                            <b style="color:var(--accent);">${name}</b><br>
                            <span style="color:var(--muted); font-size:0.75rem;">Columns: ${cols}</span>
                        </div>`;
                    });
                } else {
                    html += `<div style="color:var(--muted); font-size:0.8rem; margin-bottom:0.5rem;">No views in this schema</div>`;
                }

                html += `<h3>Tables (${tablesData.tables ? tablesData.tables.length : 0})</h3>`;
                if (tablesData.tables && tablesData.tables.length > 0) {
                    tablesData.tables.forEach(t => {
                        const name = t.tableName || t.table_name;
                        const cols = t.columnCount ?? t.column_count ?? 0;
                        const rows = t.rowCount ?? t.row_count ?? 'N/A';
                        html += `<div class="item-card" onclick="quickSend('Describe table ${name} in schema ${schema}')">
                            <b>${name}</b><br>
                            <span style="color:var(--muted); font-size:0.75rem;">Columns: ${cols} | Rows: ${rows}</span>
                        </div>`;
                    });
                } else {
                    html += `<div style="color:var(--muted); font-size:0.8rem;">No tables in this schema</div>`;
                }

                content.innerHTML = html;
            } catch (err) {
                content.innerHTML = `<div style="color:#ef4444; padding:0.5rem;">Error loading schema: ${err.message}</div>`;
            }
        }

        async function fetchS3Data() {
            const content = document.getElementById("sidebarContent");
            content.innerHTML = '<div style="color:var(--muted); padding:0.5rem;">Listing S3 objects in biomed-data...</div>';

            try {
                const res = await fetch('/api/s3/objects?prefix=downloader-files/');
                const data = await res.json();

                let html = `<h3>S3 Objects (${data.count || 0})</h3>`;
                if (data.objects && data.objects.length > 0) {
                    data.objects.forEach(obj => {
                        const sizeMb = (obj.size / (1024 * 1024)).toFixed(2);
                        const mod = obj.lastModified || obj.last_modified || 'N/A';
                        html += `<div class="item-card s3-card" onclick="quickSend('Get metadata for S3 object ${obj.key}')">
                            <b style="color:var(--accent-green); word-break:break-all;">${obj.key}</b><br>
                            <span style="color:var(--muted); font-size:0.75rem;">Size: ${sizeMb} MB | Modified: ${mod}</span>
                        </div>`;
                    });
                } else {
                    html += `<div style="color:var(--muted); font-size:0.8rem;">No objects found</div>`;
                }
                content.innerHTML = html;
            } catch (err) {
                content.innerHTML = `<div style="color:#ef4444; padding:0.5rem;">Error loading S3 objects: ${err.message}</div>`;
            }
        }

        function quickSend(queryText) {
            document.getElementById("userInput").value = queryText;
            sendMessage();
        }

        async function sendMessage() {
            const input = document.getElementById("userInput");
            const text = input.value.trim();
            if (!text) return;

            input.value = "";
            appendMessage("user", text);

            conversation.push({ role: "user", content: text });

            const llmUrl = document.getElementById("llmUrl").value;
            const modelName = document.getElementById("modelName").value;
            const apiKey = document.getElementById("apiKey").value;

            const loadingId = appendMessage("assistant", "Querying unified MCP tools & processing...");

            try {
                const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ llm_url: llmUrl, model: modelName, api_key: apiKey, messages: conversation })
                });

                const data = await res.json();
                const loadingEl = document.getElementById(loadingId);
                if (loadingEl) loadingEl.remove();

                if (data.error) {
                    appendMessage("assistant", "⚠️ " + data.error);
                    return;
                }

                let html = "";
                if (data.tool_execution) {
                    data.tool_execution.forEach(t => {
                        html += `<div class="tool-box">
                            <div class="tool-title">
                                <span>⚙️ MCP Tool: <b>${t.tool}</b></span>
                            </div>
                            <div style="color:var(--muted); margin-bottom:0.25rem;">Args: ${JSON.stringify(t.args)}</div>
                            <button class="btn-sm" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display==='none'?'block':'none'">Toggle Result</button>
                            <pre style="display:none; margin-top:0.4rem; background:rgba(0,0,0,0.5); padding:0.4rem; border-radius:4px;">${JSON.stringify(t.result, null, 2)}</pre>
                        </div>`;
                    });
                }

                html += formatMarkdown(data.reply);
                appendMessage("assistant", html);
                conversation.push({ role: "assistant", content: data.reply });

            } catch (err) {
                const loadingEl = document.getElementById(loadingId);
                if (loadingEl) loadingEl.remove();
                appendMessage("assistant", "⚠️ Error: " + err.message);
            }
        }

        function appendMessage(role, htmlContent) {
            const container = document.getElementById("messages");
            const div = document.createElement("div");
            div.className = `message ${role}`;
            div.id = "msg-" + Date.now();
            div.innerHTML = htmlContent;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
            return div.id;
        }

        fetchCurrentTab();
    </script>
</body>
</html>
"""


class WebUIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)

        if parsed.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_PAGE.encode("utf-8"))
        elif parsed.path == "/api/tables":
            schema_name = qs.get("schema", ["public"])[0]
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            try:
                tables = handle_tool_call("list_tables", {"schema_name": schema_name})
            except Exception as exc:
                tables = {"error": str(exc), "tables": []}
            self.wfile.write(json.dumps(tables).encode("utf-8"))
        elif parsed.path == "/api/views":
            schema_name = qs.get("schema", ["public"])[0]
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            try:
                views = handle_tool_call("list_views", {"schema_name": schema_name})
            except Exception as exc:
                views = {"error": str(exc), "views": []}
            self.wfile.write(json.dumps(views).encode("utf-8"))
        elif parsed.path == "/api/s3/objects":
            prefix = qs.get("prefix", [""])[0]
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            try:
                objects = handle_tool_call("list_s3_objects", {"prefix": prefix})
            except Exception as exc:
                objects = {"error": str(exc), "objects": []}
            self.wfile.write(json.dumps(objects).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/api/chat":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            req_json = json.loads(body.decode("utf-8"))

            llm_url = req_json.get("llm_url", "http://localhost:8000/v1")
            model_name = req_json.get("model", "default")
            raw_key = (req_json.get("api_key") or "").strip()
            env_key = (
                os.getenv("LLM_API_KEY")
                or os.getenv("MAMMOUTH_API_KEY")
                or os.getenv("OPENAI_API_KEY")
                or ""
            ).strip()
            api_key = raw_key if raw_key else env_key
            messages = req_json.get("messages", [])

            result = process_chat(llm_url, model_name, api_key, messages)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))
        elif self.path == "/api/tool":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            req_json = json.loads(body.decode("utf-8"))
            tool_name = req_json.get("tool")
            tool_args = req_json.get("args", {})
            result = handle_tool_call(tool_name, tool_args)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()


def run():
    server = HTTPServer(("127.0.0.1", PORT), WebUIHandler)
    print(
        f"\n🚀 Biomed Unified MCP Web Inspector running at: http://127.0.0.1:{PORT}"
    )
    print("Supports: UniProt, BioProject, S3/MinIO, and PostgreSQL Materialized Views\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Web Inspector...")


if __name__ == "__main__":
    run()
