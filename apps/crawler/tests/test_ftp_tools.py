"""Tests for crawler main entrypoint."""

import importlib
from pathlib import Path

from crawler_common.ftp.ftp_node import FTPNode

crawler_main = importlib.import_module("crawler_general.main")


def test_main_persists_ftp_structure(monkeypatch):
    """Ensure main streams FTP data and persists entries to the database."""

    monkeypatch.setattr(
        crawler_main.ftp_conf,
        "load_env_vars",
        lambda *_: ("ftp.example.com", "user", "pass", 5),
    )

    class FakeUrl:
        """Minimal URL-like object used by logging in main."""

        def render_as_string(self, hide_password=True) -> str:
            return "postgresql://user:****@db.example.com/biomed"

    monkeypatch.setattr(
        "crawler_general.src.main.get_database_url_from_env",
        lambda *_: FakeUrl(),
    )

    fake_engine = object()
    monkeypatch.setattr(
        "crawler_general.src.main.init_database",
        lambda *_args, **_kwargs: fake_engine,
    )

    created_tables_for = []
    monkeypatch.setattr(
        "crawler_general.src.main.Base.metadata.create_all",
        lambda engine: created_tables_for.append(engine),
    )

    fake_root = FTPNode(name="/", is_dir=True, path="/")
    fake_file = FTPNode(name="file.txt", is_dir=False, path="/file.txt")
    monkeypatch.setattr(
        crawler_main.ftp_tools,
        "iter_ftp_nodes",
        lambda *_, **__: iter([(fake_root, 0), (fake_file, 1)]),
    )

    class FakeRun:
        """Minimal run model used by the session stub."""

        def __init__(self, ftp_url: str, max_depth: int, started_at):
            self.id = None
            self.ftp_url = ftp_url
            self.max_depth = max_depth
            self.started_at = started_at
            self.completed_at = None

    monkeypatch.setattr("crawler_general.src.main.FTPDiscoveryRun", FakeRun)

    class FakeSession:
        """Session stub to capture DB interactions."""

        def __init__(self):
            self.added = []
            self.added_batches = []
            self.flushed = False
            self.commits = 0
            self.rolled_back = False
            self.closed = False

        def add(self, obj) -> None:
            self.added.append(obj)
            obj.id = 99

        def flush(self) -> None:
            self.flushed = True

        def add_all(self, objects) -> None:
            self.added_batches.append(list(objects))

        def execute(self, _statement):
            """Return empty history so all streamed entries are treated as changed."""

            class FakeScalars:
                def all(self):
                    return []

            class FakeExecuteResult:
                def scalars(self):
                    return FakeScalars()

            return FakeExecuteResult()

        def commit(self) -> None:
            self.commits += 1

        def rollback(self) -> None:
            self.rolled_back = True

        def close(self) -> None:
            self.closed = True

    session = FakeSession()
    monkeypatch.setattr(
        "crawler_general.src.main.get_session",
        lambda _engine: session,
    )

    monkeypatch.setattr(
        "crawler_general.src.main.publish_to_rabbitmq",
        lambda *_args, **_kwargs: 1,
    )

    crawler_main.main()

    assert created_tables_for == [fake_engine]
    assert len(session.added) == 1
    assert len(session.added_batches) == 1
    assert len(session.added_batches[0]) == 2
    assert session.flushed is True
    assert session.commits >= 2
    assert session.rolled_back is False
    assert session.closed is True
    assert session.added[0].completed_at is not None

