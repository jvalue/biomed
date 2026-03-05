"""Tests for crawler main entrypoint."""

from crawler_common.ftp.ftp_node import FTPNode
from crawler_general.src.main import main


def test_main_persists_ftp_structure(monkeypatch):
    """Ensure main crawls FTP data and persists it to the database."""

    monkeypatch.setattr(
        "crawler_general.src.main.ftp_conf.load_env_vars",
        lambda *_: ("ftp.example.com", "user", "pass"),
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
    monkeypatch.setattr(
        "crawler_general.src.main.ftp_tools.get_ftp_structure",
        lambda *_, **__: fake_root,
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
            self.flushed = False
            self.committed = False
            self.rolled_back = False
            self.closed = False

        def add(self, obj) -> None:
            self.added.append(obj)
            obj.id = 99

        def flush(self) -> None:
            self.flushed = True

        def commit(self) -> None:
            self.committed = True

        def rollback(self) -> None:
            self.rolled_back = True

        def close(self) -> None:
            self.closed = True

    session = FakeSession()
    monkeypatch.setattr(
        "crawler_general.src.main.get_session",
        lambda _engine: session,
    )

    inserted = []
    monkeypatch.setattr(
        "crawler_general.src.main.insert_ftp_nodes_to_database",
        lambda node, run_id, sess: inserted.append((node, run_id, sess)),
    )

    monkeypatch.setenv("FTP_MAX_DEPTH", "5")

    main()

    assert created_tables_for == [fake_engine]
    assert len(session.added) == 1
    assert session.flushed is True
    assert session.committed is True
    assert session.rolled_back is False
    assert session.closed is True
    assert inserted == [(fake_root, 99, session)]
    assert session.added[0].completed_at is not None
