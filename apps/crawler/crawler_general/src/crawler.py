"""FTP crawler orchestration and streaming discovery."""

from __future__ import annotations

import contextlib
import logging
from collections.abc import Callable
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from crawler_common.ftp import ftp_tools
from crawler_common.models.db import FTPDiscoveryEntry, FTPDiscoveryRun

from .config import CrawlerConfig
from .publisher import flush_discovery_batch
from .urls import build_download_url

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def create_discovery_run(
    session: Session,
    ftp_url: str,
    max_depth: int,
    crawl_db_name: str | None = None,
    run_model_cls: type[FTPDiscoveryRun] = FTPDiscoveryRun,
) -> FTPDiscoveryRun:
    """Create and persist a new FTPDiscoveryRun record with fallback for test stubs."""
    run_params = {
        "ftp_url": ftp_url,
        "max_depth": max_depth,
        "started_at": datetime.now(UTC),
    }

    try:
        ftp_run = run_model_cls(**{**run_params, "db_name": crawl_db_name})
    except TypeError:
        # Fallback for stubs or constructors that do not accept db_name
        ftp_run = run_model_cls(**run_params)
        with contextlib.suppress(Exception):
            ftp_run.db_name = crawl_db_name

    session.add(ftp_run)
    session.flush()  # Ensure ID is generated before processing child entries
    return ftp_run


def stream_and_persist_nodes(
    session: Session,
    config: CrawlerConfig,
    ftp_run_id: int,
    iter_nodes_fn: Callable = ftp_tools.iter_ftp_nodes,
    flush_batch_fn: Callable = flush_discovery_batch,
) -> tuple[int, int, int]:
    """Iterate through FTP nodes, accumulating and flushing batches to DB and queue."""
    discovery_batch: list[tuple[FTPDiscoveryEntry, str | None]] = []
    total_inserted = 0
    total_published = 0
    total_skipped = 0

    def _flush() -> None:
        nonlocal total_inserted, total_published, total_skipped
        if not discovery_batch:
            return
        inserted, published, skipped = flush_batch_fn(
            session=session,
            rabbitmq_url=config.rabbitmq_url,
            rabbitmq_queue=config.rabbitmq_queue,
            batch=discovery_batch,
            crawl_db_name=config.crawl_db_name,
            tolerance_seconds=config.tolerance_seconds,
        )
        total_inserted += inserted
        total_published += published
        total_skipped += skipped

    for node, depth in iter_nodes_fn(
        config.ftp_url,
        config.ftp_user,
        config.ftp_password,
        max_depth=config.ftp_max_depth,
    ):
        entry = FTPDiscoveryEntry.from_ftp_node(node, ftp_run_id, depth)
        file_url = (
            None if node.is_dir else build_download_url(config.ftp_url, node.path)
        )
        discovery_batch.append((entry, file_url))

        if len(discovery_batch) >= config.batch_size:
            _flush()

    # Flush any remaining items in the last batch
    _flush()

    return total_inserted, total_published, total_skipped


def crawl_ftp(
    session: Session,
    config: CrawlerConfig,
    iter_nodes_fn: Callable = ftp_tools.iter_ftp_nodes,
    flush_batch_fn: Callable = flush_discovery_batch,
    run_model_cls: type[FTPDiscoveryRun] = FTPDiscoveryRun,
) -> FTPDiscoveryRun:
    """Execute FTP crawl run, streaming and persisting discovered items."""
    logger.info("Starting streaming FTP discovery...")
    ftp_run = create_discovery_run(
        session=session,
        ftp_url=config.ftp_url,
        max_depth=config.ftp_max_depth,
        crawl_db_name=config.crawl_db_name,
        run_model_cls=run_model_cls,
    )

    inserted, published, skipped = stream_and_persist_nodes(
        session=session,
        config=config,
        ftp_run_id=ftp_run.id,
        iter_nodes_fn=iter_nodes_fn,
        flush_batch_fn=flush_batch_fn,
    )

    ftp_run.completed_at = datetime.now(UTC)
    session.commit()
    logger.info(
        f"FTP streaming discovery saved to database (Run ID: {ftp_run.id}, "
        f"Max Depth: {config.ftp_max_depth}, Inserted: {inserted}, "
        f"Skipped unchanged: {skipped})"
    )

    if config.rabbitmq_url:
        logger.info(
            f"Published {published} tasks to queue '{config.rabbitmq_queue}' "
            f"(FTP run ID: {ftp_run.id})"
        )
    else:
        logger.warning("RabbitMQ URL not configured - skipping queue publishing")

    return ftp_run
