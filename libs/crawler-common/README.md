# crawler-common

Shared utilities and models for crawler applications.

## Features

- HTTP client wrapper with retry logic
- Common data models (URLs, responses)
- Parsing utilities
- Error handling

## Usage

Install as a dependency in your crawler app:

```toml
[tool.uv.sources]
crawler-common = { path = "../../libs/crawler-common", editable = true }
```

Then import:

```python
from crawler_common.http_client import HttpClient
from crawler_common.models import CrawlRequest
```

Quickstart
----------

Install the package into your environment (editable install while developing):

```bash
python -m pip install -e .[dev]
```

Run the simple HTTP example:

```bash
python -m examples.quickstart_http
```

Examples
--------

See the `examples/` folder for small runnable examples demonstrating common
workflows:

- `examples/quickstart_http.py`: fetch a URL using `HttpClient` and `CrawlRequest`.
- `examples/quickstart_ftp.py`: load FTP credentials with `load_env_vars` and
	walk the FTP tree using `get_ftp_structure`.
- `examples/quickstart_db.py`: initialize an in-memory database, create tables,
	and demonstrate `insert_ftp_nodes_to_database` using a small `FTPNode` tree.

Public API
----------

The package exposes the following primary helpers (import from `crawler_common`):

- `HttpClient`, `CrawlRequest`, `CrawlResponse` — HTTP convenience wrapper.
- `get_ftp_structure`, `get_root_folders`, `load_env_vars`, `FTPNode` — FTP helpers.
- `crawler_common.database` — helpers to build URLs, init engines, sessions and
	insert FTP discovery entries.

Notes
-----

- Examples assume you have network or service access where relevant (FTP/S3/DB).
- For the FTP examples, set environment variables (`FTP_URL`, `FTP_USER`,
	`FTP_PASSWORD`, optionally `FTP_MAX_DEPTH`) or pass a `.env` path to
	`load_env_vars()` as shown in `examples/quickstart_ftp.py`.

Contributing
------------

Contributions are welcome. Please add tests for new behavior and keep changes
backward-compatible for existing callers.

## Testing

```bash
nx test crawler-common
```

**FTP configuration**
- The FTP helpers live in the shared library `libs/crawler-common` (`crawler_common.ftp_tools` and `crawler_common.ftp_conf`).
- Place your credentials in `apps/crawler/crawler_general/.env` (loaded automatically):
	```bash
	FTP_URL=ftp.example.com
	FTP_USER=anonymous
	FTP_PASSWORD=anonymous
	FTP_MAX_DEPTH=3
	```
- `load_env_vars()` accepts an optional path; the app passes the local `.env` so you can override per-environment.
- `FTP_MAX_DEPTH` controls how deep into nested directories the FTP crawler will traverse. Set it to an integer (e.g., `1`, `3`, `5`) to limit the maximum directory depth.