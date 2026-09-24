# ruff: noqa: E501
from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.request import Request, urlopen

from dotenv import load_dotenv

APP_DIR = Path(__file__).resolve().parent
load_dotenv(APP_DIR / ".env")
load_dotenv(APP_DIR.parent.parent / ".env")

sys.path.insert(0, str(APP_DIR))

from postgres_mcp.server import service  # noqa: E402

PORT = int(os.getenv("WEB_UI_PORT", "5050"))

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "list_tables",
            "description": "List all tables in the PostgreSQL database along with row counts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "schema_name": {
                        "type": "string",
                        "description": "Database schema name (default: public)",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "describe_table",
            "description": "Get table schema metadata (columns, types, keys, indexes).",
            "parameters": {
                "type": "object",
                "properties": {
                    "table_name": {"type": "string", "description": "Table name"},
                    "schema_name": {
                        "type": "string",
                        "description": "Database schema name (default: public)",
                    },
                },
                "required": ["table_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_table",
            "description": "Read rows from a table with pagination.",
            "parameters": {
                "type": "object",
                "properties": {
                    "table_name": {"type": "string", "description": "Table name"},
                    "schema_name": {"type": "string", "description": "Schema name"},
                    "limit": {"type": "integer", "description": "Max rows to return"},
                    "offset": {"type": "integer", "description": "Row offset"},
                },
                "required": ["table_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "execute_query",
            "description": "Execute a read-only SELECT query on the database.",
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
            "name": "list_views",
            "description": "List all PostgreSQL views (e.g. v_uniprot_entry_summary, v_uniprot_entry_organism, v_uniprot_entry_xrefs, v_uniprot_entry_publications).",
            "parameters": {
                "type": "object",
                "properties": {
                    "schema_name": {
                        "type": "string",
                        "description": "Database schema name (default: public)",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_view",
            "description": "Query rows from any database view (e.g. v_uniprot_entry_summary, v_uniprot_entry_organism, v_uniprot_entry_xrefs, v_uniprot_entry_publications).",
            "parameters": {
                "type": "object",
                "properties": {
                    "view_name": {
                        "type": "string",
                        "description": "View name to query",
                    },
                    "schema_name": {"type": "string", "description": "Schema name"},
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
            "name": "get_uniprot_summary",
            "description": "Search or list UniProt protein entry summaries from v_uniprot_entry_summary by accession, gene name, organism, or keyword.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search keyword (e.g. 'kinase', 'P12345', 'Human', 'TP53')",
                    },
                    "limit": {"type": "integer", "description": "Max entries limit"},
                },
            },
        },
    },
]


def handle_tool_call(name: str, args: dict) -> dict:
    try:
        if name == "list_tables":
            return service.list_tables(schema_name=args.get("schema_name"))
        if name == "list_views":
            return service.list_views(schema_name=args.get("schema_name"))
        if name == "describe_table":
            table_name = args.get("table_name")
            if not table_name:
                return {
                    "error": "Missing required parameter 'table_name' for describe_table. Use list_tables first to discover table names."
                }
            return service.describe_table(
                table_name=table_name, schema_name=args.get("schema_name")
            )
        if name == "read_table":
            table_name = args.get("table_name")
            if not table_name:
                return {
                    "error": "Missing required parameter 'table_name' for read_table."
                }
            return service.read_table(
                table_name=table_name,
                schema_name=args.get("schema_name"),
                limit=args.get("limit", 100),
                offset=args.get("offset", 0),
            )
        if name == "query_view":
            view_name = args.get("view_name")
            if not view_name:
                return {
                    "error": "Missing required parameter 'view_name' for query_view."
                }
            return service.query_view(
                view_name=view_name,
                schema_name=args.get("schema_name"),
                limit=args.get("limit", 100),
                offset=args.get("offset", 0),
            )
        if name == "get_uniprot_summary":
            return service.get_uniprot_summary(
                query=args.get("query"),
                limit=args.get("limit", 50),
            )
        if name == "execute_query":
            sql = args.get("sql")
            if not sql:
                return {"error": "Missing required parameter 'sql' for execute_query."}
            return service.execute_query(sql=sql, limit=args.get("limit", 100))
        return {"error": f"Unknown tool: {name}"}
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
            "You are a helpful assistant connected to a PostgreSQL database. "
            "Use the provided tools to inspect tables, describe schemas, and query data to answer user questions."
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

    # Process tool call
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

    # Follow up with LLM for final response
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


HTML_PAGE = r"""<!DOCTYPE html>  # noqa: E501

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PostgreSQL MCP Web Inspector & Chat</title>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        :root {
            --bg: #0f172a;
            --card: #1e293b;
            --card-border: #334155;
            --text: #f8fafc;
            --muted: #94a3b8;
            --accent: #38bdf8;
            --accent-hover: #0284c7;
            --user-msg: #1e3a8a;
            --ai-msg: #334155;
            --code-bg: #090d16;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background-color: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; }

        header { background: var(--card); border-bottom: 1px solid var(--card-border); padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; }
        h1 { font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; color: var(--accent); }

        .settings-bar { display: flex; gap: 0.75rem; align-items: center; }
        .settings-bar input { background: var(--bg); border: 1px solid var(--card-border); color: var(--text); padding: 0.4rem 0.75rem; border-radius: 6px; font-size: 0.875rem; }

        main { flex: 1; display: flex; overflow: hidden; }

        .sidebar { width: 320px; background: var(--card); border-right: 1px solid var(--card-border); padding: 1rem; overflow-y: auto; }
        .sidebar h2 { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 0.75rem; }

        .chat-container { flex: 1; display: flex; flex-direction: column; background: var(--bg); }
        .messages { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

        .message { max-width: 80%; padding: 0.85rem 1.1rem; border-radius: 10px; line-height: 1.5; font-size: 0.95rem; }
        .message.user { align-self: flex-end; background: var(--user-msg); border-bottom-right-radius: 2px; }
        .message.assistant { align-self: flex-start; background: var(--ai-msg); border-bottom-left-radius: 2px; }
        .message.assistant p { margin-bottom: 0.5rem; }
        .message.assistant ul, .message.assistant ol { margin-left: 1.2rem; margin-bottom: 0.5rem; }

        .tool-box { background: var(--code-bg); border: 1px solid #0284c7; border-radius: 6px; padding: 0.75rem; margin-top: 0.5rem; font-family: monospace; font-size: 0.85rem; }
        .tool-title { color: var(--accent); font-weight: bold; margin-bottom: 0.25rem; }

        .input-area { padding: 1rem; background: var(--card); border-top: 1px solid var(--card-border); display: flex; gap: 0.75rem; }
        .input-area input { flex: 1; background: var(--bg); border: 1px solid var(--card-border); color: var(--text); padding: 0.75rem 1rem; border-radius: 8px; font-size: 1rem; }
        .input-area button { background: var(--accent); color: #000; font-weight: 600; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; transition: 0.2s; }
        .input-area button:hover { background: var(--accent-hover); color: #fff; }

        .btn-sm { background: var(--card-border); color: var(--text); border: none; padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer; margin-top: 0.5rem; }
        .btn-sm:hover { background: var(--accent); color: #000; }
        pre { white-space: pre-wrap; word-break: break-all; }
    </style>
</head>
<body>
    <header>
        <h1>🐘 PostgreSQL MCP Inspector & Local LLM Chat</h1>
        <div class="settings-bar">
            <label>LLM API URL:</label>
            <input type="text" id="llmUrl" value="https://api.mammouth.ai/v1/" style="width: 220px;">
            <label>Model:</label>
            <input type="text" id="modelName" value="gpt-5.4-nano" style="width: 110px;">
            <label>API Key:</label>
            <input type="password" id="apiKey" placeholder="Optional" style="width: 120px;">
        </div>
    </header>
    <main>
        <div class="sidebar">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <h2 style="margin:0;">Database Views</h2>
                <button class="btn-sm" onclick="fetchSchema()" style="margin:0;">🔄 Refresh</button>
            </div>
            <div id="viewsList" style="margin-bottom: 1.5rem;">Loading views...</div>
            <h2>Database Tables</h2>
            <div id="tablesList">Loading tables...</div>
        </div>
        <div class="chat-container">
            <div class="messages" id="messages">
                <div class="message assistant">
                    Hello! I am connected to your PostgreSQL database at <b>localhost:5433/xml-data</b> via <b>postgres_mcp</b>.
                    <br><br>
                    Ask me anything! For example:
                    <ul style="margin-left: 1.2rem; margin-top: 0.4rem;">
                        <li>"Search entries in v_uniprot_entry_summary for kinase"</li>
                        <li>"Show me publication details from v_uniprot_entry_publications"</li>
                        <li>"Query organisms from v_uniprot_entry_organism"</li>
                        <li>"What external database IDs exist in v_uniprot_entry_xrefs?"</li>
                    </ul>
                </div>
            </div>
            <div class="input-area">
                <input type="text" id="userInput" placeholder="Ask a question about your PostgreSQL database..." onkeydown="if(event.key==='Enter') sendMessage()">
                <button onclick="sendMessage()">Send</button>
            </div>
        </div>
    </main>

    <script>
        const conversation = [];

        function formatMarkdown(text) {
            if (!text) return "";
            if (typeof marked !== "undefined" && typeof marked.parse === "function") {
                return marked.parse(text);
            }
            return text
                .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                .replace(/```([\s\S]*?)```/g, '<pre style="background:#090d16; padding:0.6rem; border-radius:6px; margin:0.4rem 0;"><code>$1</code></pre>')
                .replace(/`([^`]+)`/g, '<code style="background:#090d16; padding:0.2rem 0.4rem; border-radius:4px; font-family:monospace; color:#38bdf8;">$1</code>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                .replace(/^\s*[-*]\s+(.*)$/gm, '<li style="margin-left: 1.2rem;">$1</li>')
                .replace(/\n/g, '<br>');
        }

        async function fetchSchema() {
            fetchViews();
            fetchTables();
        }

        async function fetchViews() {
            const listEl = document.getElementById("viewsList");
            listEl.innerHTML = "Fetching...";
            try {
                const res = await fetch("/api/views");
                const data = await res.json();
                if (data.views && data.views.length > 0) {
                    listEl.innerHTML = data.views.map(v => 
                        `<div style="margin-bottom: 0.6rem; padding: 0.4rem; background: var(--bg); border: 1px solid var(--accent); border-radius: 4px;">
                            <b style="color: var(--accent);">${v.view_name}</b><br>
                            <span style="color: var(--muted); font-size: 0.8rem;">Columns: ${v.column_count}</span>
                        </div>`
                    ).join("");
                } else {
                    listEl.innerHTML = "No views found.";
                }
            } catch (err) {
                listEl.innerHTML = "<span style='color: #ef4444;'>Error fetching views</span>";
            }
        }

        async function fetchTables() {
            const listEl = document.getElementById("tablesList");
            listEl.innerHTML = "Fetching...";
            try {
                const res = await fetch("/api/tables");
                const data = await res.json();
                if (data.tables) {
                    listEl.innerHTML = data.tables.map(t => 
                        `<div style="margin-bottom: 0.6rem; padding: 0.4rem; background: var(--bg); border-radius: 4px;">
                            <b>${t.table_name}</b><br>
                            <span style="color: var(--muted); font-size: 0.8rem;">Columns: ${t.column_count} | Rows: ${t.row_count ?? 'N/A'}</span>
                        </div>`
                    ).join("");
                } else {
                    listEl.innerHTML = "No tables found.";
                }
            } catch (err) {
                listEl.innerHTML = "<span style='color: #ef4444;'>Error connecting to DB</span>";
            }
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

            const loadingId = appendMessage("assistant", "Thinking & querying database...");

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
                            <div class="tool-title">⚙️ Executed MCP Tool: ${t.tool}</div>
                            <div>Args: ${JSON.stringify(t.args)}</div>
                            <button class="btn-sm" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display==='none'?'block':'none'">Toggle Raw Result</button>
                            <pre style="display:none; margin-top:0.5rem;">${JSON.stringify(t.result, null, 2)}</pre>
                        </div><br>`;
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

        fetchSchema();
    </script>
</body>
</html>
"""


class WebUIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_PAGE.encode("utf-8"))
        elif self.path == "/api/tables":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            try:
                tables = service.list_tables()
            except Exception as exc:
                tables = {"error": str(exc), "tables": []}
            self.wfile.write(json.dumps(tables).encode("utf-8"))
        elif self.path == "/api/views":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            try:
                views = service.list_views()
            except Exception as exc:
                views = {"error": str(exc), "views": []}
            self.wfile.write(json.dumps(views).encode("utf-8"))
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
        else:
            self.send_response(404)
            self.end_headers()


def run():
    server = HTTPServer(("127.0.0.1", PORT), WebUIHandler)
    print(f"\n🚀 PostgreSQL MCP Web Chat Inspector running at: http://127.0.0.1:{PORT}")
    print(f"Connected to Database: {service._settings.database_url}\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Web Inspector...")


if __name__ == "__main__":
    run()
