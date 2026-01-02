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