from __future__ import annotations

import argparse
import logging
import os
from pathlib import Path

from crawler_common.database import get_session, init_database
from crawler_common.xmlschema import (
    create_sqlalchemy_schema,
    parse_xsd_schema,
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

    if env_file is None:
        env_candidates = [APP_DIR / ".env", APP_DIR / ".env.example"]
    else:
        env_candidates = [env_file]

    for candidate in env_candidates:
        if candidate.exists():
            load_dotenv(dotenv_path=candidate)
            return


def _resolve_path(value: str | Path | None, env_var: str) -> Path:
    if value is not None:
        return Path(value)

    env_value = os.getenv(env_var)
    if not env_value:
        raise ValueError(f"Missing required configuration: {env_var}")

    return Path(env_value)


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
    parser.add_argument("--xsd", type=Path, help="Path to the XSD file")
    parser.add_argument("--xml", type=Path, help="Path to the XML file")
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
    return parser


def run_ingest(
    xsd_path: Path,
    xml_path: Path,
    database_url: str,
    echo_sql: bool = False,
    commit_every: int = 1000,
    table_prefix: str | None = None,
) -> dict[str, int]:
    schema_plan = parse_xsd_schema(xsd_path, table_prefix=table_prefix)
    engine = init_database(database_url, echo=echo_sql)
    metadata = create_sqlalchemy_schema(engine, schema_plan)

    session = get_session(engine)
    try:
        counts = stream_xml_to_database(
            session, xml_path, schema_plan, metadata, commit_every=commit_every
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
        echo_sql = args.echo_sql or os.getenv("XML_INGESTOR_ECHO_SQL", "false").strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        raw_commit_every = args.commit_every or os.getenv("XML_INGESTOR_COMMIT_EVERY", "1000")
        try:
            commit_every = int(raw_commit_every)
        except ValueError:
            commit_every = 1000

        table_prefix = args.table_prefix or os.getenv("XML_INGESTOR_TABLE_PREFIX")

        counts = run_ingest(
            xsd_path,
            xml_path,
            database_url,
            echo_sql=echo_sql,
            commit_every=commit_every,
            table_prefix=table_prefix,
        )
        logger.info("Ingestion complete: %s", counts)
        return 0

    except ValueError as exc:
        logger.error(
            "%s. Provide --env-file, --xsd, --xml, and --database-url or set XML_INGESTOR_* env vars.",
            exc,
        )
        return 2