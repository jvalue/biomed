"""Change detection and historical delta querying for crawler entries."""

from __future__ import annotations

from typing import TYPE_CHECKING

from crawler_common.models.db import FTPDiscoveryEntry
from sqlalchemy import func, select

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


def entry_has_changed(
    current: FTPDiscoveryEntry,
    previous: FTPDiscoveryEntry | None,
    tolerance_seconds: int = 60,
) -> bool:
    """Return True if an entry is new or differs from latest historical state."""
    if previous is None:
        return True
    if current.is_dir != previous.is_dir:
        return True
    if current.size != previous.size:
        return True

    # Treat small differences in modification times as unchanged (FTP timestamp jitter)
    if current.modified is None and previous.modified is None:
        return False
    if (current.modified is None) != (previous.modified is None):
        return True

    # Both are non-None datetime values
    delta = abs((current.modified - previous.modified).total_seconds())
    return delta > tolerance_seconds


def get_latest_entries_by_path(
    session: Session,
    paths: list[str],
) -> dict[str, FTPDiscoveryEntry]:
    """Load the most recent known entry for each path across all previous runs."""
    if not paths:
        return {}

    latest_ids = (
        select(
            FTPDiscoveryEntry.path,
            func.max(FTPDiscoveryEntry.id).label("max_id"),
        )
        .where(FTPDiscoveryEntry.path.in_(paths))
        .group_by(FTPDiscoveryEntry.path)
        .subquery()
    )

    rows = (
        session.execute(
            select(FTPDiscoveryEntry).join(
                latest_ids,
                FTPDiscoveryEntry.id == latest_ids.c.max_id,
            )
        )
        .scalars()
        .all()
    )
    return {row.path: row for row in rows}
