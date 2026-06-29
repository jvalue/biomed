"""Tests for database configuration, helpers, and persistence logic."""

from datetime import datetime, timezone

import pytest
from sqlalchemy import select

from crawler_common.database import (
    ensure_crawler_schema,
    create_postgres_url,
    get_database_url_from_env,
    get_engine,
    get_session,
    init_database,
    insert_ftp_nodes_to_database,
    load_database_config,
    set_engine,
)
from crawler_common.database import database as database_module
from crawler_common.ftp.ftp_node import FTPNode
from crawler_common.models.db import Base, FTPDiscoveryEntry


def test_create_postgres_url_builds_expected_url() -> None:
    """Create PostgreSQL URL with all provided parts."""

    database_url = create_postgres_url(
        host="localhost",
        port=5432,
        database="biomed",
        user="dbuser",
        password="secret",
    )

    assert database_url.drivername == "postgresql+psycopg2"
    assert database_url.host == "localhost"
    assert database_url.port == 5432
    assert database_url.database == "biomed"
    assert database_url.username == "dbuser"


def test_load_database_config_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Load DB config from process environment variables."""

    monkeypatch.setenv("DB_HOST", "db.example.com")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("DB_NAME", "biomed")
    monkeypatch.setenv("DB_USER", "crawler")
    monkeypatch.setenv("DB_PASSWORD", "secret")

    config = load_database_config()

    assert config == {
        "host": "db.example.com",
        "port": 5432,
        "database": "biomed",
        "user": "crawler",
        "password": "secret",
    }


def test_get_database_url_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Build SQLAlchemy URL from DB environment variables."""

    monkeypatch.setenv("DB_HOST", "db.example.com")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("DB_NAME", "biomed")
    monkeypatch.setenv("DB_USER", "crawler")
    monkeypatch.setenv("DB_PASSWORD", "secret")

    database_url = get_database_url_from_env()

    assert database_url.drivername == "postgresql+psycopg2"
    assert database_url.host == "db.example.com"
    assert database_url.port == 5432
    assert database_url.database == "biomed"
    assert database_url.username == "crawler"


def test_get_database_url_from_env_supports_sqlite(monkeypatch: pytest.MonkeyPatch) -> None:
    """Support a simple SQLite mode via DB_ENGINE=sqlite and DB_SQLITE_PATH."""
    monkeypatch.setenv("DB_ENGINE", "sqlite")
    monkeypatch.setenv("DB_SQLITE_PATH", ":memory:")

    database_url = get_database_url_from_env()

    assert database_url.drivername == "sqlite+pysqlite"
    assert database_url.database == ":memory:"


def test_get_engine_requires_initialization(monkeypatch: pytest.MonkeyPatch) -> None:
    """Raise when global engine is requested before set_engine."""

    monkeypatch.setattr(database_module, "_engine", None)

    with pytest.raises(RuntimeError, match="Database engine not initialized"):
        get_engine()


def test_set_engine_then_get_engine(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return same engine object after it is set globally."""

    monkeypatch.setattr(database_module, "_engine", None)
    engine = init_database("sqlite+pysqlite:///:memory:")

    set_engine(engine)

    assert get_engine() is engine


def test_get_session_returns_working_session() -> None:
    """Create a SQLAlchemy session bound to the provided engine."""

    engine = init_database("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    session = get_session(engine)
    try:
        assert session.bind is engine
    finally:
        session.close()


def test_get_session_reuses_sessionmaker_for_same_engine(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reuse sessionmaker factory for repeated calls with the same engine."""

    engine = init_database("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    monkeypatch.setattr(database_module, "_session_factory", None)
    monkeypatch.setattr(database_module, "_session_factory_engine", None)

    original_sessionmaker = database_module.sessionmaker
    calls: list[object] = []

    def tracking_sessionmaker(*args, **kwargs):
        calls.append(object())
        return original_sessionmaker(*args, **kwargs)

    monkeypatch.setattr(database_module, "sessionmaker", tracking_sessionmaker)

    first = get_session(engine)
    second = get_session(engine)
    try:
        assert first.bind is engine
        assert second.bind is engine
    finally:
        first.close()
        second.close()

    assert len(calls) == 1


def test_model_from_ftp_node_converts_values() -> None:
    """Convert FTPNode into FTPDiscoveryEntry with run and depth metadata."""

    modified_at = datetime.now(timezone.utc)
    node = FTPNode(
        name="file.txt",
        is_dir=False,
        path="/data/file.txt",
        size=123,
        modified=modified_at,
    )

    entry = FTPDiscoveryEntry.from_ftp_node(node, run_id=42, depth=3)

    assert entry.run_id == 42
    assert entry.path == "/data/file.txt"
    assert entry.is_dir is False
    assert entry.size == 123
    assert entry.modified == modified_at
    assert entry.depth == 3


def test_ensure_crawler_schema_adds_missing_columns() -> None:
    """Backfill missing crawler columns on an existing database."""

    engine = init_database("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with engine.begin() as connection:
        connection.exec_driver_sql("ALTER TABLE ftp_discovery_entries RENAME TO ftp_discovery_entries_old")
        connection.exec_driver_sql(
            """
            CREATE TABLE ftp_discovery_entries (
                id INTEGER NOT NULL PRIMARY KEY,
                run_id INTEGER NOT NULL,
                path VARCHAR(2048) NOT NULL,
                is_dir BOOLEAN NOT NULL,
                size BIGINT,
                modified DATETIME,
                depth INTEGER NOT NULL,
                discovered_at DATETIME NOT NULL
            )
            """
        )
        connection.exec_driver_sql(
            """
            INSERT INTO ftp_discovery_entries (
                id, run_id, path, is_dir, size, modified, depth, discovered_at
            )
            SELECT id, run_id, path, is_dir, size, modified, depth, discovered_at
            FROM ftp_discovery_entries_old
            """
        )
        connection.exec_driver_sql("DROP TABLE ftp_discovery_entries_old")

    ensure_crawler_schema(engine)

    with engine.connect() as connection:
        columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(ftp_discovery_entries)")}

    assert "downloaded" in columns


def test_insert_ftp_nodes_to_database_traverses_and_batches() -> None:
    """Insert nested FTP tree with expected depth values across batches."""

    engine = init_database("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = get_session(engine)

    root = FTPNode(name="/", is_dir=True, path="/")
    child_dir = FTPNode(name="a", is_dir=True, path="/a")
    nested_file = FTPNode(name="file1", is_dir=False, path="/a/file1", size=10)
    sibling_file = FTPNode(name="b.txt", is_dir=False, path="/b.txt", size=20)
    child_dir.children = [nested_file]
    root.children = [child_dir, sibling_file]

    insert_ftp_nodes_to_database(
        node=root,
        run_id=1,
        session=session,
        current_depth=1,
        batch_size=2,
        only_changed=False,
    )
    session.commit()

    rows = session.execute(select(FTPDiscoveryEntry)).scalars().all()
    depth_by_path = {row.path: row.depth for row in rows}

    assert len(rows) == 4
    assert depth_by_path == {
        "/": 1,
        "/a": 2,
        "/a/file1": 3,
        "/b.txt": 2,
    }

    session.close()


def test_insert_ftp_nodes_to_database_deduplicates_when_only_changed() -> None:
    """Skip unchanged records and insert changed records for matching paths."""

    engine = init_database("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = get_session(engine)

    root = FTPNode(name="/", is_dir=True, path="/")
    file_node = FTPNode(
        name="file.txt",
        is_dir=False,
        path="/file.txt",
        size=10,
        modified=None,
    )
    root.children = [file_node]

    insert_ftp_nodes_to_database(root, run_id=1, session=session, only_changed=True)
    session.commit()
    first_count = session.execute(select(FTPDiscoveryEntry)).scalars().all()
    assert len(first_count) == 2

    same_root = FTPNode(name="/", is_dir=True, path="/")
    same_file = FTPNode(
        name="file.txt",
        is_dir=False,
        path="/file.txt",
        size=10,
        modified=None,
    )
    same_root.children = [same_file]

    insert_ftp_nodes_to_database(same_root, run_id=1, session=session, only_changed=True)
    session.commit()
    second_count = session.execute(select(FTPDiscoveryEntry)).scalars().all()
    assert len(second_count) == 2

    changed_root = FTPNode(name="/", is_dir=True, path="/")
    changed_file = FTPNode(
        name="file.txt",
        is_dir=False,
        path="/file.txt",
        size=99,
        modified=None,
    )
    changed_root.children = [changed_file]

    insert_ftp_nodes_to_database(
        changed_root,
        run_id=1,
        session=session,
        only_changed=True,
    )
    session.commit()

    final_rows = session.execute(select(FTPDiscoveryEntry)).scalars().all()
    assert len(final_rows) == 3

    session.close()


def test_insert_ftp_nodes_to_database_only_changed_is_scoped_by_run() -> None:
    """Deduplication should not suppress inserts for a different discovery run."""

    engine = init_database("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = get_session(engine)

    root = FTPNode(name="/", is_dir=True, path="/")
    file_node = FTPNode(
        name="file.txt",
        is_dir=False,
        path="/file.txt",
        size=10,
        modified=None,
    )
    root.children = [file_node]

    insert_ftp_nodes_to_database(root, run_id=1, session=session, only_changed=True)
    session.commit()

    insert_ftp_nodes_to_database(root, run_id=2, session=session, only_changed=True)
    session.commit()

    rows = session.execute(select(FTPDiscoveryEntry)).scalars().all()
    assert len(rows) == 4
    run_ids = sorted(row.run_id for row in rows)
    assert run_ids == [1, 1, 2, 2]

    session.close()
