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
