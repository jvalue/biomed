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

    def fake_create_sqlalchemy_schema(
        engine: object, schema_plan: object, **kwargs: object
    ):
        calls.append(("create_sqlalchemy_schema", engine, schema_plan, kwargs))
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
        calls.append(
            ("stream_xml_to_database", session, xml_path, schema_plan, metadata, kwargs)
        )
        return {"root": 1}

    def fake_record_ingested_file(
        session: object,
        metadata: object,
        xml_path: Path,
        **kwargs: object,
    ):
        calls.append(
            ("record_ingested_file", session, metadata, xml_path, kwargs)
        )

    monkeypatch.setattr(app_main, "parse_xsd_schema", fake_parse_xsd_schema)
    monkeypatch.setattr(app_main, "init_database", fake_init_database)
    monkeypatch.setattr(
        app_main, "create_sqlalchemy_schema", fake_create_sqlalchemy_schema
    )
    monkeypatch.setattr(app_main, "get_session", fake_get_session)
    monkeypatch.setattr(app_main, "stream_xml_to_database", fake_stream_xml_to_database)
    monkeypatch.setattr(app_main, "record_ingested_file", fake_record_ingested_file)

    counts = app_main.run_ingest(
        Path("schema.xsd"),
        Path("data.xml"),
        "postgresql://user:pass@localhost/db",
    )

    assert counts == {"root": 1}
    assert calls[0][0] == "parse_xsd_schema"
    assert calls[1] == ("init_database", "postgresql://user:pass@localhost/db", False)
    assert calls[2][0] == "create_sqlalchemy_schema"
    assert calls[3] == ("get_session", "engine")
    assert calls[4][0] == "stream_xml_to_database"
    assert calls[5][0] == "record_ingested_file"
    assert calls[-2] == ("commit",)
    assert calls[-1] == ("close",)


def test_build_parser_accepts_optional_inputs():
    parser = app_main.build_parser()
    namespace = parser.parse_args(["--commit-every", "5000", "--table-prefix", "pm"])

    assert namespace.xsd is None
    assert namespace.xml is None
    assert namespace.database_url is None
    assert namespace.commit_every == 5000
    assert namespace.table_prefix == "pm"
    assert namespace.deduplicate_by_hash is True
    assert namespace.auto_migrate is True
    assert namespace.async_commit is False


def test_main_resolves_values_from_env(monkeypatch):
    monkeypatch.setenv("XML_INGESTOR_XSD", "schema.xsd")
    monkeypatch.setenv("XML_INGESTOR_XML", "data.xml")
    monkeypatch.setenv(
        "XML_INGESTOR_DATABASE_URL", "postgresql://user:pass@localhost/db"
    )
    monkeypatch.setenv("XML_INGESTOR_ECHO_SQL", "true")
    monkeypatch.setenv("XML_INGESTOR_COMMIT_EVERY", "2500")
    monkeypatch.setenv("XML_INGESTOR_TABLE_PREFIX", "medline")
    monkeypatch.setenv("XML_INGESTOR_SCHEMA", "uniprot")
    monkeypatch.setenv("XML_INGESTOR_DEDUPLICATE_BY_HASH", "true")
    monkeypatch.setenv("XML_INGESTOR_AUTO_MIGRATE", "true")
    monkeypatch.setenv("XML_INGESTOR_ASYNC_COMMIT", "true")

    resolved = {}

    def fake_run_ingest(
        xsd_path,
        xml_path,
        database_url,
        echo_sql=False,
        commit_every=1000,
        table_prefix=None,
        **kwargs,
    ):
        resolved["xsd_path"] = xsd_path
        resolved["xml_path"] = xml_path
        resolved["database_url"] = database_url
        resolved["echo_sql"] = echo_sql
        resolved["commit_every"] = commit_every
        resolved["table_prefix"] = table_prefix
        resolved["db_schema"] = kwargs.get("db_schema")
        resolved["deduplicate_by_hash"] = kwargs.get("deduplicate_by_hash")
        resolved["auto_migrate"] = kwargs.get("auto_migrate")
        resolved["async_commit"] = kwargs.get("async_commit")
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
    assert resolved["db_schema"] == "uniprot"
    assert resolved["deduplicate_by_hash"] is True
    assert resolved["auto_migrate"] is True
    assert resolved["async_commit"] is True


def test_resolve_path_resolves_s3_prefix_without_appending_data_xml(monkeypatch):
    monkeypatch.setenv("S3_BUCKET", "biomed-data")
    monkeypatch.setenv("S3_UPLOAD_PREFIX", "downloader-files")

    res = app_main._resolve_path(None, "XML_INGESTOR_XML")
    assert res == "s3://biomed-data/downloader-files/"


def test_build_parser_preserves_s3_uri_for_xsd_argument():
    parser = app_main.build_parser()
    args = parser.parse_args(["--xsd", "s3://biomed-data/schemas/test.xsd"])
    res = app_main._resolve_path(args.xsd, "XML_INGESTOR_XSD")
    assert res == "s3://biomed-data/schemas/test.xsd"


def test_run_ingest_rolls_back_when_async_commit_fails(monkeypatch):
    class FakeDialect:
        name = "postgresql"

    class FakeEngine:
        dialect = FakeDialect()

    rolled_back = []

    class FakeSession:
        def execute(self, stmt):
            raise RuntimeError("permission denied or syntax error")

        def rollback(self):
            rolled_back.append(True)

        def commit(self):
            pass

        def close(self):
            pass

    monkeypatch.setattr(app_main, "parse_xsd_schema", lambda *a, **kw: "plan")
    monkeypatch.setattr(app_main, "init_database", lambda *a, **kw: FakeEngine())
    monkeypatch.setattr(app_main, "create_sqlalchemy_schema", lambda *a, **kw: "meta")
    monkeypatch.setattr(app_main, "get_session", lambda *a, **kw: FakeSession())
    monkeypatch.setattr(app_main, "stream_xml_to_database", lambda *a, **kw: {"root": 1})

    counts = app_main.run_ingest(
        Path("schema.xsd"),
        Path("data.xml"),
        "postgresql://localhost/db",
        async_commit=True,
    )
    assert counts == {"root": 1}
    assert rolled_back == [True]

