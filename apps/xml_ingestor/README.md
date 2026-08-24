# XML Ingestor

This app reads an XSD schema file, a large XML file, and a PostgreSQL connection URL. It translates the schema into relational tables, creates those tables in the target database, then streams the XML into Postgres without loading the full document into memory.

The app can read those values from a local env file at `apps/xml_ingestor/.env` or from explicit CLI flags.
If the entrypoint XSD uses `xs:include` or `xs:import`, place the referenced schema files next to it or update the paths in the XSD so the parser can resolve them.
If `apps/xml_ingestor/.env` is missing, the app falls back to `apps/xml_ingestor/.env.example`.
You can also give important XSD elements clean physical table names by adding an appinfo alias:

```xml
<xs:annotation>
  <xs:appinfo>
    <table name="project_descr"/>
  </xs:appinfo>
</xs:annotation>
```

If no alias is provided, the generator still falls back to the sanitized XML path.

## Inputs

- `XML_INGESTOR_XSD`: path to the XSD file
- `XML_INGESTOR_XML`: path to the XML file
- `XML_INGESTOR_DATABASE_URL`: SQLAlchemy PostgreSQL URL, for example `postgresql+psycopg2://user:pass@localhost:5432/biomed`
- `XML_INGESTOR_ECHO_SQL`: optional boolean flag to print SQL emitted by SQLAlchemy
- `XML_INGESTOR_COMMIT_EVERY`: optional batch size for transaction commits (default: 1000)
- `XML_INGESTOR_TABLE_PREFIX`: optional prefix prepended to all generated SQL table names (e.g. `pm` -> `pm_table_name`)
- `--env-file`: optional path to a `.env` file to load before resolving settings
- `--xsd`, `--xml`, `--database-url`, `--echo-sql`, `--commit-every`, `--table-prefix`: CLI overrides for the env values

Example `.env`:

```bash
XML_INGESTOR_XSD=/data/schema.xsd
XML_INGESTOR_XML=/data/input.xml
XML_INGESTOR_DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/biomed
XML_INGESTOR_ECHO_SQL=false
XML_INGESTOR_COMMIT_EVERY=1000
XML_INGESTOR_TABLE_PREFIX=pm
```



If you want to keep real credentials out of version control, copy this file to `apps/xml_ingestor/.env` and edit the copy.

## Run

From the repository root:

```bash
uv run apps/xml_ingestor/main.py
```

Or with explicit overrides:

```bash
uv run apps/xml_ingestor/main.py \
  --xsd path/to/schema.xsd \
  --xml path/to/data.xml \
  --database-url postgresql+psycopg2://user:pass@localhost:5432/biomed
```

The app will:

1. Parse the XSD into a schema plan.
2. Create the translated tables in the target PostgreSQL database.
3. Stream the XML document with incremental parsing and insert rows as elements close.

## Notes

- The parser is designed for large XML files and uses incremental streaming instead of loading the full document.
- The generated schema currently focuses on elements, attributes, and simple nested structures.
- If you need to ingest multiple XML files with the same schema, point them at the same database URL after the first run has created the tables.

## Tests

```bash
uv run pytest apps/xml_ingestor/tests
```