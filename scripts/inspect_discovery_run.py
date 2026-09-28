#!/usr/bin/env python3
"""Inspect FTP discovery entries for a given run and compare with latest entries."""

from __future__ import annotations

import sys
from pathlib import Path

from crawler_common.database import (
    get_database_url_from_env,
    get_session,
    init_database,
)
from crawler_common.models.db import FTPDiscoveryEntry
from sqlalchemy import func, select


def main():
    if len(sys.argv) < 3:
        print("Usage: inspect_discovery_run.py <run_id> <env_path>")
        sys.exit(2)
    run_id = int(sys.argv[1])
    env_path = Path(sys.argv[2])

    url = get_database_url_from_env(env_path)
    print("Using DB:", url.render_as_string(hide_password=True))
    engine = init_database(url, echo=False)
    session = get_session(engine)

    # Get paths for this run
    stmt = select(FTPDiscoveryEntry).where(FTPDiscoveryEntry.run_id == run_id)
    rows = session.execute(stmt).scalars().all()
    print(f"Entries for run {run_id}: {len(rows)}")
    for e in rows:
        print(
            f"id={e.id} run={e.run_id} path={e.path!r} is_dir={e.is_dir} size={e.size} modified={e.modified} downloaded={e.downloaded}"
        )

    paths = [e.path for e in rows]
    if not paths:
        print("No paths for given run")
        return

    # For these paths, show latest entries across all runs
    latest_ids = (
        select(
            FTPDiscoveryEntry.path,
            func.max(FTPDiscoveryEntry.id).label("max_id"),
        )
        .where(FTPDiscoveryEntry.path.in_(paths))
        .group_by(FTPDiscoveryEntry.path)
        .subquery()
    )

    latest_rows = (
        session.execute(
            select(FTPDiscoveryEntry).join(
                latest_ids,
                FTPDiscoveryEntry.id == latest_ids.c.max_id,
            )
        )
        .scalars()
        .all()
    )

    print("\nLatest entries for those paths:")
    for e in latest_rows:
        print(
            f"id={e.id} run={e.run_id} path={e.path!r} is_dir={e.is_dir} size={e.size} modified={e.modified} downloaded={e.downloaded}"
        )

    session.close()


if __name__ == "__main__":
    main()
