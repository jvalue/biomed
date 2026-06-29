Examples for crawler-common
===========================

Each script demonstrates a focused use-case. Install the package in editable
mode first so imports work from the repository root:

```bash
python -m pip install -e .[dev]
```

Run an example with:

```bash
python -m examples.quickstart_http
python -m examples.quickstart_ftp
python -m examples.quickstart_db
```

Notes:
- `quickstart_ftp` expects FTP credentials in environment variables or a .env file.
- `quickstart_db` uses an in-memory SQLite database and is suitable for local tests.
