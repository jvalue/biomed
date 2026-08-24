from pathlib import Path

from xml_ingestor import main as app_main


def test_run_ingest_wires_parser_and_database(monkeypatch):
    calls: list[tuple[str, object]] = []

    def fake_parse_xsd_schema(xsd_path: Path, **kwargs: object):
        calls.append(("parse_xsd_schema", xsd_path, kwargs))
        return "schema-plan"


    def fake_init_database(database_url: str, echo: bool = False):
        calls.append(("init_database", database_url, echo))
        return "engine"

    def fake_create_sqlalchemy_schema(engine: object, schema_plan: object):
        calls.append(("create_sqlalchemy_schema", engine, schema_plan))
        return "metadata"

    class FakeSession:
        def commit(self):
            calls.append(("commit",))

        def rollback(self):
            calls.append(("rollback",))

        def close(self):
            calls.append(("close",))

    def fake_get_session(engine: object):
        calls.append(("get_session", engine))
        return FakeSession()

    def fake_stream_xml_to_database(
        session: object,
        xml_path: Path,
        schema_plan: object,
        metadata: object,
        **kwargs: object,
    ):
        calls.append(("stream_xml_to_database", session, xml_path, schema_plan, metadata, kwargs))
        return {"root": 1}

    monkeypatch.setattr(app_main, "parse_xsd_schema", fake_parse_xsd_schema)
    monkeypatch.setattr(app_main, "init_database", fake_init_database)
    monkeypatch.setattr(app_main, "create_sqlalchemy_schema", fake_create_sqlalchemy_schema)
    monkeypatch.setattr(app_main, "get_session", fake_get_session)
    monkeypatch.setattr(app_main, "stream_xml_to_database", fake_stream_xml_to_database)

    counts = app_main.run_ingest(
        Path("schema.xsd"),
        Path("data.xml"),
        "postgresql://user:pass@localhost/db",
    )

    assert counts == {"root": 1}
    assert calls[0][0] == "parse_xsd_schema"
    assert calls[1] == ("init_database", "postgresql://user:pass@localhost/db", False)
    assert calls[2] == ("create_sqlalchemy_schema", "engine", "schema-plan")
    assert calls[3] == ("get_session", "engine")
    assert calls[4][0] == "stream_xml_to_database"
    assert calls[-2] == ("commit",)
    assert calls[-1] == ("close",)


def test_build_parser_accepts_optional_inputs():
    parser = app_main.build_parser()
    namespace = parser.parse_args(
        ["--commit-every", "5000", "--table-prefix", "pm"]
    )

    assert namespace.xsd is None
    assert namespace.xml is None
    assert namespace.database_url is None
    assert namespace.commit_every == 5000
    assert namespace.table_prefix == "pm"


def test_main_resolves_values_from_env(monkeypatch):
    monkeypatch.setenv("XML_INGESTOR_XSD", "schema.xsd")
    monkeypatch.setenv("XML_INGESTOR_XML", "data.xml")
    monkeypatch.setenv("XML_INGESTOR_DATABASE_URL", "postgresql://user:pass@localhost/db")
    monkeypatch.setenv("XML_INGESTOR_ECHO_SQL", "true")
    monkeypatch.setenv("XML_INGESTOR_COMMIT_EVERY", "2500")
    monkeypatch.setenv("XML_INGESTOR_TABLE_PREFIX", "medline")

    resolved = {}

    def fake_run_ingest(xsd_path, xml_path, database_url, echo_sql=False, commit_every=1000, table_prefix=None):
        resolved["xsd_path"] = xsd_path
        resolved["xml_path"] = xml_path
        resolved["database_url"] = database_url
        resolved["echo_sql"] = echo_sql
        resolved["commit_every"] = commit_every
        resolved["table_prefix"] = table_prefix
        return {"root": 1}

    monkeypatch.setattr(app_main, "run_ingest", fake_run_ingest)

    exit_code = app_main.main([])

    assert exit_code == 0
    assert resolved["xsd_path"] == Path("schema.xsd")
    assert resolved["xml_path"] == Path("data.xml")
    assert resolved["database_url"] == "postgresql://user:pass@localhost/db"
    assert resolved["echo_sql"] is True
    assert resolved["commit_every"] == 2500
    assert resolved["table_prefix"] == "medline"