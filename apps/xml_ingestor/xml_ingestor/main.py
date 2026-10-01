from __future__ import annotations

import argparse
import logging
import os
from pathlib import Path

from crawler_common.database import get_session, init_database
from crawler_common.xmlschema import (
    create_sqlalchemy_schema,
    parse_xsd_schema,
    process_s3_prefix_ingestion,
    stream_xml_to_database,
)
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


APP_DIR = Path(__file__).resolve().parents[1]


def _load_local_env(env_file: Path | None = None) -> None:
    """Load configuration from a local .env file if present."""

    if env_file is not None:
        if env_file.exists():
            load_dotenv(dotenv_path=env_file)
        return

    local_env = APP_DIR / ".env"
    if local_env.exists():
        load_dotenv(dotenv_path=local_env)


def _resolve_path(value: str | Path | None, env_var: str) -> Path | str:
    if value is not None:
        str_val = str(value)
        return str_val if str_val.startswith("s3://") else Path(value)

    env_value = os.getenv(env_var)
    if env_value:
        return env_value if env_value.startswith("s3://") else Path(env_value)

    if env_var == "XML_INGESTOR_XSD":
        s3_bucket = os.getenv("S3_BUCKET")
        xsd_key = os.getenv("XSD_KEY") or os.getenv("XML_INGESTOR_XSD_KEY")
        if s3_bucket and xsd_key:
            return f"s3://{s3_bucket}/{xsd_key.lstrip('/')}"

    if env_var == "XML_INGESTOR_XML":
        s3_bucket = os.getenv("S3_BUCKET")
        s3_key = os.getenv("S3_KEY") or os.getenv("S3_UPLOAD_PREFIX")
        if s3_bucket and s3_key:
            prefix = s3_key.strip("/")
            if not any(prefix.lower().endswith(ext) for ext in (".xml", ".gz", ".zip")):
                return f"s3://{s3_bucket}/{prefix}/"
            return f"s3://{s3_bucket}/{prefix}"

    raise ValueError(f"Missing required configuration: {env_var}")


def _resolve_string(value: str | None, env_var: str) -> str:
    if value:
        return value

    env_value = os.getenv(env_var)
    if not env_value:
        raise ValueError(f"Missing required configuration: {env_var}")

    return env_value


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Parse an XSD schema, create the matching tables, and stream XML data into PostgreSQL."
    )
    parser.add_argument("--env-file", type=Path, help="Optional path to a .env file")
    parser.add_argument("--xsd", help="Path to local XSD file or s3:// URI")
    parser.add_argument("--xml", help="Path to local XML file or s3:// URI")
    parser.add_argument(
        "--database-url",
        help="SQLAlchemy PostgreSQL connection URL",
    )
    parser.add_argument(
        "--echo-sql",
        action="store_true",
        help="Enable SQLAlchemy SQL logging",
    )
    parser.add_argument(
        "--commit-every",
        type=int,
        help="Number of top-level records to commit in a single database transaction (default: 1000)",
    )
    parser.add_argument(
        "--table-prefix",
        help="Optional prefix for generated database table names (e.g. 'pm' for 'pm_table_name')",
    )
    parser.add_argument(
        "--deduplicate-by-hash",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Enable domain-agnostic content hash deduplication for top-level records (default: True)",
    )
    parser.add_argument(
        "--auto-migrate",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Automatically add missing columns to existing database tables when XSD changes (default: True)",
    )
    return parser


def run_ingest(
    xsd_path: Path | str,
    xml_path: Path | str,
    database_url: str,
    echo_sql: bool = False,
    commit_every: int = 1000,
    table_prefix: str | None = None,
    deduplicate_by_hash: bool = True,
    auto_migrate: bool = True,
) -> dict[str, int]:
    schema_plan = parse_xsd_schema(xsd_path, table_prefix=table_prefix)
    engine = init_database(database_url, echo=echo_sql)
    metadata = create_sqlalchemy_schema(engine, schema_plan, auto_migrate=auto_migrate)

    xml_str = str(xml_path)
    session = get_session(engine)
    if (
        hasattr(engine, "dialect")
        and getattr(engine.dialect, "name", None) == "postgresql"
    ):
        try:
            from sqlalchemy import text

            session.execute(text("SET synchronous_commit = 'off'"))
        except Exception as exc:
            logger.debug("Failed setting synchronous_commit = 'off': %s", exc)
    try:
        if xml_str.startswith("s3://") and (
            xml_str.endswith("/")
            or not any(xml_str.lower().endswith(ext) for ext in (".xml", ".gz", ".zip"))
        ):
            counts = process_s3_prefix_ingestion(
                session,
                xml_str,
                schema_plan,
                metadata,
                commit_every=commit_every,
                deduplicate_by_hash=deduplicate_by_hash,
            )
        else:
            counts = stream_xml_to_database(
                session,
                xml_path,
                schema_plan,
                metadata,
                commit_every=commit_every,
                deduplicate_by_hash=deduplicate_by_hash,
            )
        session.commit()
        return counts
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    _load_local_env(args.env_file)

    try:
        xsd_path = _resolve_path(args.xsd, "XML_INGESTOR_XSD")
        xml_path = _resolve_path(args.xml, "XML_INGESTOR_XML")
        database_url = _resolve_string(args.database_url, "XML_INGESTOR_DATABASE_URL")
        echo_sql = args.echo_sql or os.getenv(
            "XML_INGESTOR_ECHO_SQL", "false"
        ).strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        raw_commit_every = args.commit_every or os.getenv(
            "XML_INGESTOR_COMMIT_EVERY", "1000"
        )
        try:
            commit_every = int(raw_commit_every)
        except ValueError:
            commit_every = 1000

        table_prefix = args.table_prefix or os.getenv("XML_INGESTOR_TABLE_PREFIX")

        env_dedup = os.getenv("XML_INGESTOR_DEDUPLICATE_BY_HASH")
        deduplicate_by_hash = (
            env_dedup.strip().lower() in {"1", "true", "yes", "on"}
            if env_dedup is not None
            else args.deduplicate_by_hash
        )

        env_migrate = os.getenv("XML_INGESTOR_AUTO_MIGRATE")
        auto_migrate = (
            env_migrate.strip().lower() in {"1", "true", "yes", "on"}
            if env_migrate is not None
            else args.auto_migrate
        )

        counts = run_ingest(
            xsd_path,
            xml_path,
            database_url,
            echo_sql=echo_sql,
            commit_every=commit_every,
            table_prefix=table_prefix,
            deduplicate_by_hash=deduplicate_by_hash,
            auto_migrate=auto_migrate,
        )
        logger.info("Ingestion complete: %s", counts)
        return 0

    except ValueError as exc:
        logger.error(
            "%s. Provide --env-file, --xsd, --xml, and --database-url or set XML_INGESTOR_* env vars.",
            exc,
        )
        return 2


if __name__ == "__main__":
    import sys

    sys.exit(main())
