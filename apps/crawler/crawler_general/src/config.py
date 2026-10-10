"""Configuration models and environment loading for crawler_general."""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

from crawler_common.database import get_database_url_from_env
from crawler_common.ftp import ftp_conf
from sqlalchemy.engine import URL

logger = logging.getLogger(__name__)

DEFAULT_ENTRY_BATCH_SIZE = 500
# Treat small timestamp differences (FTP servers/MLSD/MDTM jitter) as unchanged
DEFAULT_MODIFIED_TOLERANCE_SECONDS = 60


def derive_crawl_db_name(ftp_url: str, explicit_db_name: str | None = None) -> str:
    """Determine db_name for this run.

    Prefers explicit_db_name (e.g. from CRAWL_DB_NAME env var). If not provided,
    derives a short, safe name from the FTP URL hostname/path so downstream
    downloaders can use it as a prefix.
    """
    if explicit_db_name:
        return explicit_db_name

    parsed = urlparse(ftp_url)
    candidate = parsed.netloc or parsed.path.lstrip("/").split("/")[0] or "crawl"
    # sanitize: keep alphanumerics and replace others with '-'
    sanitized = re.sub(r"[^A-Za-z0-9]+", "-", candidate).strip("-")[:255]
    return sanitized if sanitized else "crawl"


@dataclass(frozen=True)
class CrawlerConfig:
    """Runtime configuration for crawler_general."""

    ftp_url: str
    ftp_user: str
    ftp_password: str
    ftp_max_depth: int
    rabbitmq_url: str
    rabbitmq_queue: str
    crawl_db_name: str
    database_url: URL | str
    batch_size: int = DEFAULT_ENTRY_BATCH_SIZE
    tolerance_seconds: int = DEFAULT_MODIFIED_TOLERANCE_SECONDS

    @classmethod
    def from_env(cls, env_path: Path | str | None = None) -> CrawlerConfig:
        """Load configuration from environment variables and optional .env file."""
        resolved_env_path = (
            Path(env_path)
            if env_path
            else Path(__file__).resolve().parent.parent / ".env"
        )

        ftp_url, ftp_user, ftp_password, ftp_max_depth = ftp_conf.load_env_vars(
            resolved_env_path
        )
        logger.info(f"FTP Config: ({ftp_url}, {ftp_user}, '****')")

        rabbitmq_url = os.getenv("RABBITMQ_URL", "")
        rabbitmq_queue = os.getenv("RABBITMQ_QUEUE", "download-urls")
        logger.info(f"RabbitMQ Config: URL={rabbitmq_url}, Queue={rabbitmq_queue}")

        database_url = get_database_url_from_env(resolved_env_path)
        if hasattr(database_url, "render_as_string"):
            db_repr = database_url.render_as_string(hide_password=True)
        else:
            db_repr = str(database_url)
        logger.info(f"Database URL: {db_repr}")

        explicit_crawl_db_name = os.getenv("CRAWL_DB_NAME")
        crawl_db_name = derive_crawl_db_name(ftp_url, explicit_crawl_db_name)

        return cls(
            ftp_url=ftp_url,
            ftp_user=ftp_user,
            ftp_password=ftp_password,
            ftp_max_depth=ftp_max_depth,
            rabbitmq_url=rabbitmq_url,
            rabbitmq_queue=rabbitmq_queue,
            crawl_db_name=crawl_db_name,
            database_url=database_url,
            batch_size=DEFAULT_ENTRY_BATCH_SIZE,
            tolerance_seconds=DEFAULT_MODIFIED_TOLERANCE_SECONDS,
        )
