"""Batch persistence and message publishing for discovered crawler items."""

from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING

from crawler_common.queue import publish_to_queue as default_publish_to_rabbitmq

from .diff import entry_has_changed, get_latest_entries_by_path

if TYPE_CHECKING:
    from crawler_common.models.db import FTPDiscoveryEntry
    from sqlalchemy.orm import Session


def build_queue_messages(
    changed_items: list[tuple[FTPDiscoveryEntry, str | None]],
    crawl_db_name: str | None = None,
) -> list[dict[str, object]]:
    """Construct RabbitMQ payload messages for changed files."""
    messages: list[dict[str, object]] = []
    for entry, file_url in changed_items:
        if file_url is None:
            continue
        msg: dict[str, object] = {
            "url": file_url,
            "ftp_run_id": entry.run_id,
        }
        if crawl_db_name:
            msg["db_name"] = crawl_db_name
        messages.append(msg)
    return messages


def flush_discovery_batch(
    session: Session,
    rabbitmq_url: str,
    rabbitmq_queue: str,
    batch: list[tuple[FTPDiscoveryEntry, str | None]],
    crawl_db_name: str | None = None,
    tolerance_seconds: int = 60,
    publish_fn: Callable[[str, str, list[dict]], int] | None = None,
) -> tuple[int, int, int]:
    """Persist changed entries and publish download tasks for changed files.

    Args:
        session: Active SQLAlchemy session.
        rabbitmq_url: RabbitMQ connection URL.
        rabbitmq_queue: Target RabbitMQ queue name.
        batch: List of (entry, download_url) pairs. Cleared upon processing.
        crawl_db_name: Optional database name identifier for downstream jobs.
        tolerance_seconds: Seconds of timestamp jitter to consider unchanged.
        publish_fn: Callable to publish messages to RabbitMQ.

    Returns:
        Tuple of (inserted_count, published_count, skipped_unchanged_count).
    """
    if not batch:
        return 0, 0, 0

    if publish_fn is None:
        publish_fn = default_publish_to_rabbitmq

    paths = [entry.path for entry, _ in batch]
    previous_by_path = get_latest_entries_by_path(session, paths)

    changed = [
        (entry, file_url)
        for entry, file_url in batch
        if entry_has_changed(
            entry, previous_by_path.get(entry.path), tolerance_seconds=tolerance_seconds
        )
    ]

    skipped_unchanged = len(batch) - len(changed)
    batch.clear()

    if not changed:
        return 0, 0, skipped_unchanged

    changed_entries = [entry for entry, _ in changed]
    session.add_all(changed_entries)
    session.commit()

    published = 0
    if rabbitmq_url:
        messages = build_queue_messages(changed, crawl_db_name=crawl_db_name)
        if messages:
            published = publish_fn(rabbitmq_url, rabbitmq_queue, messages)

    return len(changed_entries), published, skipped_unchanged
