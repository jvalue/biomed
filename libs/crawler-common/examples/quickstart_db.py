"""Database quickstart example for crawler-common.

Demonstrates initializing an in-memory SQLite engine, creating tables and
inserting a small FTPNode tree using `insert_ftp_nodes_to_database`.

Run with:

  python -m examples.quickstart_db
"""

from crawler_common.database import init_database, get_session
from crawler_common.models.db import Base
from crawler_common.database.database import insert_ftp_nodes_to_database
from crawler_common.ftp.ftp_node import FTPNode


def main() -> None:  # pragma: no cover - example
    engine = init_database("sqlite+pysqlite:///:memory:")
    # Create tables
    Base.metadata.create_all(engine)

    session = get_session(engine)

    # Build a tiny FTP tree
    root = FTPNode(name="/", is_dir=True, path="/")
    sub = FTPNode(name="a", is_dir=True, path="/a")
    file1 = FTPNode(name="file1.txt", is_dir=False, path="/a/file1.txt", size=123)
    sub.children.append(file1)
    root.children.append(sub)

    insert_ftp_nodes_to_database(node=root, run_id=1, session=session, current_depth=1, only_changed=False)
    session.commit()

    # Inspect rows
    rows = session.execute("SELECT path, depth FROM ftp_discovery_entries").fetchall()
    for path, depth in rows:
        print(path, depth)


if __name__ == "__main__":
    main()
