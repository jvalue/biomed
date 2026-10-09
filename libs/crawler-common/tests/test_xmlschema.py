from pathlib import Path

from crawler_common.database import get_session, init_database
from crawler_common.xmlschema import (
    build_sqlalchemy_metadata,
    create_sqlalchemy_schema,
    parse_xsd_schema,
    process_s3_prefix_ingestion,
    record_ingested_file,
    stream_xml_to_database,
)
from sqlalchemy import select

XSD_SOURCE = """<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">
  <xs:element name="library">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="book" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="title" type="xs:string"/>
              <xs:element name="year" type="xs:int"/>
              <xs:element name="author" type="xs:string" maxOccurs="unbounded"/>
            </xs:sequence>
            <xs:attribute name="isbn" type="xs:string" use="required"/>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
"""

XML_SOURCE = """<?xml version="1.0" encoding="UTF-8"?>
<library>
  <book isbn="978-1">
    <title>First Book</title>
    <year>2024</year>
    <author>Alice</author>
    <author>Bob</author>
  </book>
  <book isbn="978-2">
    <title>Second Book</title>
    <year>2025</year>
    <author>Carol</author>
  </book>
</library>
"""


def test_parse_xsd_schema_creates_expected_table_plan() -> None:
    schema_plan = parse_xsd_schema(XSD_SOURCE)

    assert set(schema_plan.tables_by_name) == {
        "library",
        "library_book",
        "library_book_author",
    }

    book_table = schema_plan.tables_by_name["library_book"]
    assert "title" in {column.column_name for column in book_table.columns}
    assert "year" in {column.column_name for column in book_table.columns}
    assert "isbn" in {column.column_name for column in book_table.columns}
    assert "author" in book_table.child_tables


def test_stream_xml_to_database_materializes_rows() -> None:
    schema_plan = parse_xsd_schema(XSD_SOURCE)
    engine = init_database("sqlite+pysqlite:///:memory:")
    metadata = create_sqlalchemy_schema(engine, schema_plan)

    session = get_session(engine)
    try:
        counts = stream_xml_to_database(session, XML_SOURCE, schema_plan, metadata)
        session.commit()

        assert counts == {
            "library": 1,
            "library_book": 2,
            "library_book_author": 3,
        }

        library_rows = session.execute(select(metadata.tables["library"])).all()
        book_rows = session.execute(select(metadata.tables["library_book"])).all()
        author_rows = session.execute(
            select(metadata.tables["library_book_author"])
        ).all()

        assert len(library_rows) == 1
        assert len(book_rows) == 2
        assert len(author_rows) == 3

        first_book = book_rows[0]._mapping
        second_book = book_rows[1]._mapping
        assert first_book["isbn"] == "978-1"
        assert first_book["title"] == "First Book"
        assert first_book["year"] == 2024
        assert second_book["isbn"] == "978-2"
        assert second_book["title"] == "Second Book"
        assert second_book["year"] == 2025

        author_values = [row._mapping["value"] for row in author_rows]
        assert author_values == ["Alice", "Bob", "Carol"]
    finally:
        session.close()


def test_parse_xsd_schema_builds_sqlalchemy_metadata() -> None:
    schema_plan = parse_xsd_schema(XSD_SOURCE)
    metadata = build_sqlalchemy_metadata(schema_plan)

    assert "library" in metadata.tables
    assert "library_book" in metadata.tables
    assert "library_book_author" in metadata.tables


def test_parse_xsd_schema_resolves_include_and_import(tmp_path: Path) -> None:
    included_xsd = tmp_path / "included.xsd"
    imported_xsd = tmp_path / "imported.xsd"
    main_xsd = tmp_path / "main.xsd"

    included_xsd.write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">
  <xs:complexType name="IncludedContactType">
    <xs:sequence>
      <xs:element name="email" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>
""",
        encoding="utf-8",
    )

    imported_xsd.write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
<xs:schema
  xmlns:xs="http://www.w3.org/2001/XMLSchema"
  xmlns:common="http://example.com/common"
  targetNamespace="http://example.com/common"
  elementFormDefault="qualified">
  <xs:complexType name="AddressType">
    <xs:sequence>
      <xs:element name="street" type="xs:string"/>
      <xs:element name="city" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>
""",
        encoding="utf-8",
    )

    main_xsd.write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
<xs:schema
  xmlns:xs="http://www.w3.org/2001/XMLSchema"
  xmlns:common="http://example.com/common"
  elementFormDefault="qualified">
  <xs:include schemaLocation="included.xsd"/>
  <xs:import namespace="http://example.com/common" schemaLocation="imported.xsd"/>
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="fullName" type="xs:string"/>
        <xs:element name="contact" type="IncludedContactType"/>
        <xs:element name="address" type="common:AddressType"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
""",
        encoding="utf-8",
    )

    schema_plan = parse_xsd_schema(main_xsd)

    assert set(schema_plan.tables_by_name) == {
        "person",
        "person_contact",
        "person_address",
    }
    assert "email" in {
        column.column_name
        for column in schema_plan.tables_by_name["person_contact"].columns
    }
    assert "street" in {
        column.column_name
        for column in schema_plan.tables_by_name["person_address"].columns
    }
    assert "city" in {
        column.column_name
        for column in schema_plan.tables_by_name["person_address"].columns
    }


def test_parse_xsd_schema_uses_table_aliases() -> None:
    schema_plan = parse_xsd_schema(
        """<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:biomed="urn:biomed:xmlschema">
  <xs:element name="Project">
    <xs:annotation>
      <xs:appinfo>
        <biomed:table name="project"/>
      </xs:appinfo>
    </xs:annotation>
    <xs:complexType>
      <xs:sequence>
        <xs:element name="ProjectDescr">
          <xs:annotation>
            <xs:appinfo>
              <biomed:table name="descr"/>
            </xs:appinfo>
          </xs:annotation>
          <xs:complexType>
            <xs:sequence>
              <xs:element name="Publication" maxOccurs="unbounded">
                <xs:annotation>
                  <xs:appinfo>
                    <biomed:table name="pub"/>
                  </xs:appinfo>
                </xs:annotation>
                <xs:complexType>
                  <xs:sequence>
                    <xs:element name="StructuredCitation">
                      <xs:annotation>
                        <xs:appinfo>
                          <biomed:table name="citation"/>
                        </xs:appinfo>
                      </xs:annotation>
                      <xs:complexType>
                        <xs:sequence>
                          <xs:element name="AuthorSet">
                            <xs:annotation>
                              <xs:appinfo>
                                <biomed:table name="authors"/>
                              </xs:appinfo>
                            </xs:annotation>
                            <xs:complexType>
                              <xs:sequence>
                                <xs:element name="Author" maxOccurs="unbounded">
                                  <xs:annotation>
                                    <xs:appinfo>
                                      <biomed:table name="author"/>
                                    </xs:appinfo>
                                  </xs:annotation>
                                  <xs:complexType>
                                    <xs:sequence>
                                      <xs:element name="First" type="xs:string"/>
                                      <xs:element name="Last" type="xs:string"/>
                                    </xs:sequence>
                                  </xs:complexType>
                                </xs:element>
                              </xs:sequence>
                            </xs:complexType>
                          </xs:element>
                        </xs:sequence>
                      </xs:complexType>
                    </xs:element>
                  </xs:sequence>
                </xs:complexType>
              </xs:element>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
"""
    )

    assert set(schema_plan.tables_by_name) == {
        "project",
        "project_descr",
        "project_descr_pub",
        "project_descr_pub_citation",
        "project_descr_pub_citation_authors",
        "project_descr_pub_citation_authors_author",
    }


def test_parse_xsd_schema_shortens_long_identifiers() -> None:
    schema_plan = parse_xsd_schema(
        """<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">
  <xs:element name="project_projectdescr_publication_structuredcitation_authorset">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="author" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="name" type="xs:string"/>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
"""
    )

    table_name = schema_plan.tables_by_name[
        "project_projectdescr_publication_structuredcitation_authorset"
    ].table_name
    child_table_name = schema_plan.tables_by_name[
        next(
            name
            for name in schema_plan.tables_by_name
            if name != "project_projectdescr_publication_structuredcitation_authorset"
        )
    ].table_name

    assert len(table_name) <= 63
    assert len(child_table_name) <= 63


def test_stream_xml_to_database_keeps_xml_id_out_of_primary_key() -> None:
    schema_plan = parse_xsd_schema(
        """<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">
  <xs:element name="items">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="item" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="name" type="xs:string"/>
            </xs:sequence>
            <xs:attribute name="id" type="xs:string" use="required"/>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
"""
    )

    engine = init_database("sqlite+pysqlite:///:memory:")
    metadata = create_sqlalchemy_schema(engine, schema_plan)
    session = get_session(engine)

    try:
        counts = stream_xml_to_database(
            session,
            """<?xml version="1.0" encoding="UTF-8"?>
<items>
  <item id="12910271"><name>first</name></item>
  <item id="12910271"><name>second</name></item>
</items>
""",
            schema_plan,
            metadata,
        )
        session.commit()

        rows = session.execute(select(metadata.tables["items_item"])).all()
        assert counts == {"items": 1, "items_item": 2}
        assert [row._mapping["id_value"] for row in rows] == ["12910271", "12910271"]
        assert rows[0]._mapping["id"] != rows[1]._mapping["id"]
    finally:
        session.close()


def test_stream_xml_to_database_commits_completed_top_level_children() -> None:
    schema_plan = parse_xsd_schema(
        """<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">
  <xs:element name="items">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="item" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="name" type="xs:string"/>
            </xs:sequence>
            <xs:attribute name="id" type="xs:string" use="required"/>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
"""
    )

    engine = init_database("sqlite+pysqlite:///:memory:")
    metadata = create_sqlalchemy_schema(engine, schema_plan)
    session = get_session(engine)

    commit_calls: list[None] = []
    original_commit = session.commit

    def tracking_commit() -> None:
        commit_calls.append(None)
        original_commit()

    session.commit = tracking_commit  # type: ignore[method-assign]

    try:
        stream_xml_to_database(
            session,
            """<?xml version="1.0" encoding="UTF-8"?>
<items>
  <item id="1"><name>first</name></item>
  <item id="2"><name>second</name></item>
</items>
""",
            schema_plan,
            metadata,
            commit_every=1,
        )

        assert len(commit_calls) >= 2

    finally:
        session.close()


def test_stream_xml_to_database_logs_progress(caplog) -> None:
    schema_plan = parse_xsd_schema(
        """<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">
  <xs:element name="items">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="item" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="name" type="xs:string"/>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
"""
    )

    engine = init_database("sqlite+pysqlite:///:memory:")
    metadata = create_sqlalchemy_schema(engine, schema_plan)
    session = get_session(engine)

    caplog.set_level("INFO", logger="crawler_common.xmlschema")

    try:
        stream_xml_to_database(
            session,
            """<?xml version="1.0" encoding="UTF-8"?>
<items>
  <item><name>first</name></item>
  <item><name>second</name></item>
</items>
""",
            schema_plan,
            metadata,
            progress_log_every=1,
            progress_log_seconds=0.0,
        )

        messages = [record.message for record in caplog.records]
        assert any("Starting XML stream ingest" in message for message in messages)
        assert any("XML ingest progress:" in message for message in messages)
        assert any("Completed XML stream ingest:" in message for message in messages)
    finally:
        session.close()


def test_stream_xml_to_database_respects_commit_every_batch_size() -> None:
    schema_plan = parse_xsd_schema(
        """<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">
  <xs:element name="items">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="item" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="name" type="xs:string"/>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
"""
    )

    engine = init_database("sqlite+pysqlite:///:memory:")
    metadata = create_sqlalchemy_schema(engine, schema_plan)
    session = get_session(engine)

    commit_calls: list[None] = []
    original_commit = session.commit

    def tracking_commit() -> None:
        commit_calls.append(None)
        original_commit()

    session.commit = tracking_commit  # type: ignore[method-assign]

    try:
        stream_xml_to_database(
            session,
            """<?xml version="1.0" encoding="UTF-8"?>
<items>
  <item><name>first</name></item>
  <item><name>second</name></item>
  <item><name>third</name></item>
</items>
""",
            schema_plan,
            metadata,
            commit_every=2,
        )

        # 1 commit when batch size 2 reached + 1 final completion commit
        assert len(commit_calls) == 2
    finally:
        session.close()


def test_parse_xsd_schema_applies_table_prefix() -> None:
    schema_plan = parse_xsd_schema(XSD_SOURCE, table_prefix="pm")

    assert set(schema_plan.tables_by_name) == {
        "pm_library",
        "pm_library_book",
        "pm_library_book_author",
    }

    engine = init_database("sqlite+pysqlite:///:memory:")
    metadata = create_sqlalchemy_schema(engine, schema_plan)
    session = get_session(engine)

    try:
        counts = stream_xml_to_database(session, XML_SOURCE, schema_plan, metadata)
        session.commit()

        assert counts == {
            "pm_library": 1,
            "pm_library_book": 2,
            "pm_library_book_author": 3,
        }

        library_rows = session.execute(select(metadata.tables["pm_library"])).all()
        book_rows = session.execute(select(metadata.tables["pm_library_book"])).all()
        author_rows = session.execute(
            select(metadata.tables["pm_library_book_author"])
        ).all()

        assert len(library_rows) == 1
        assert len(book_rows) == 2
        assert len(author_rows) == 3

        # Foreign key column check
        first_author = author_rows[0]._mapping
        assert "pm_library_book_id" in first_author
    finally:
        session.close()


def test_stream_xml_to_database_deduplicates_by_hash() -> None:
    schema_plan = parse_xsd_schema(XSD_SOURCE)
    engine = init_database("sqlite+pysqlite:///:memory:")
    metadata = create_sqlalchemy_schema(engine, schema_plan)
    session = get_session(engine)

    try:
        # First ingest
        counts_1 = stream_xml_to_database(
            session, XML_SOURCE, schema_plan, metadata, deduplicate_by_hash=True
        )
        session.commit()
        assert counts_1["library_book"] == 2

        # Second ingest with identical XML
        counts_2 = stream_xml_to_database(
            session, XML_SOURCE, schema_plan, metadata, deduplicate_by_hash=True
        )
        session.commit()
        # Unchanged books should be skipped
        assert counts_2["library_book"] == 0

        # Total rows in DB should still be 2
        book_rows = session.execute(select(metadata.tables["library_book"])).all()
        assert len(book_rows) == 2
    finally:
        session.close()


def test_create_sqlalchemy_schema_auto_migrates_new_columns() -> None:
    initial_xsd = """<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="item">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="title" type="xs:string"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
"""
    updated_xsd = """<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="item">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="title" type="xs:string"/>
        <xs:element name="publisher" type="xs:string"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
"""
    engine = init_database("sqlite+pysqlite:///:memory:")

    # Initial schema creation
    plan_1 = parse_xsd_schema(initial_xsd)
    create_sqlalchemy_schema(engine, plan_1)

    # Updated schema creation with auto_migrate
    plan_2 = parse_xsd_schema(updated_xsd)
    metadata_2 = create_sqlalchemy_schema(engine, plan_2, auto_migrate=True)

    session = get_session(engine)
    try:
        stream_xml_to_database(
            session,
            """<item><title>Book 1</title><publisher>Acme Press</publisher></item>""",
            plan_2,
            metadata_2,
        )
        session.commit()

        rows = session.execute(select(metadata_2.tables["item"])).all()
        assert len(rows) == 1
        assert rows[0]._mapping["publisher"] == "Acme Press"
    finally:
        session.close()


def test_stream_xml_to_database_from_s3_uri(monkeypatch, tmp_path: Path) -> None:
    schema_plan = parse_xsd_schema(XSD_SOURCE)
    engine = init_database("sqlite+pysqlite:///:memory:")
    metadata = create_sqlalchemy_schema(engine, schema_plan)
    session = get_session(engine)

    class FakeS3Client:
        def download_file(self, bucket: str, key: str, filename: str) -> None:
            assert bucket == "biomed-data"
            assert key == "downloader-files/data.xml"
            Path(filename).write_text(XML_SOURCE, encoding="utf-8")

    def fake_create_s3_client(endpoint_url: str, timeout_seconds: int):
        return FakeS3Client()

    monkeypatch.setattr(
        "crawler_common.s3.client.create_s3_client", fake_create_s3_client
    )

    try:
        counts = stream_xml_to_database(
            session,
            "s3://biomed-data/downloader-files/data.xml",
            schema_plan,
            metadata,
        )
        session.commit()

        assert counts == {
            "library": 1,
            "library_book": 2,
            "library_book_author": 3,
        }
    finally:
        session.close()


def test_process_s3_prefix_ingestion_skips_processed_files(monkeypatch) -> None:
    from crawler_common.xmlschema import process_s3_prefix_ingestion

    schema_plan = parse_xsd_schema(XSD_SOURCE)
    engine = init_database("sqlite+pysqlite:///:memory:")
    metadata = create_sqlalchemy_schema(engine, schema_plan)
    session = get_session(engine)

    class FakeS3Client:
        def list_objects_v2(self, Bucket: str, Prefix: str):
            return {
                "Contents": [
                    {
                        "Key": "downloader-files/batch1.xml",
                        "ETag": '"etag1"',
                        "Size": 100,
                    },
                ]
            }

        def download_file(self, bucket: str, key: str, filename: str) -> None:
            Path(filename).write_text(XML_SOURCE, encoding="utf-8")

    monkeypatch.setattr(
        "crawler_common.s3.client.create_s3_client",
        lambda endpoint_url, timeout_seconds: FakeS3Client(),
    )

    try:
        # First run processes new file
        counts_1 = process_s3_prefix_ingestion(
            session,
            "s3://biomed-data/downloader-files/",
            schema_plan,
            metadata,
        )
        assert counts_1["library_book"] == 2

        # Second run sees no new unprocessed files and does nothing
        counts_2 = process_s3_prefix_ingestion(
            session,
            "s3://biomed-data/downloader-files/",
            schema_plan,
            metadata,
        )
        assert counts_2 == {}
    finally:
        session.close()


def test_ingested_files_isolated_in_metadata_schema() -> None:
    schema_plan = parse_xsd_schema(XSD_SOURCE)
    metadata = build_sqlalchemy_metadata(schema_plan)

    ingested_table = metadata.tables.get("_ingest_metadata._ingested_files")
    assert ingested_table is not None
    assert ingested_table.schema == "_ingest_metadata"


def test_stream_xml_deduplication_differentiates_distinct_text_contents() -> None:
    schema_plan = parse_xsd_schema(XSD_SOURCE)
    engine = init_database("sqlite+pysqlite:///:memory:")
    metadata = create_sqlalchemy_schema(engine, schema_plan)
    session = get_session(engine)

    xml_1 = """<?xml version="1.0" encoding="UTF-8"?>
<library>
  <book isbn="978-1">
    <title>First Book Title</title>
    <year>2024</year>
  </book>
</library>"""

    xml_2 = """<?xml version="1.0" encoding="UTF-8"?>
<library>
  <book isbn="978-1">
    <title>Different Book Title</title>
    <year>2024</year>
  </book>
</library>"""

    try:
        counts_1 = stream_xml_to_database(
            session, xml_1, schema_plan, metadata, deduplicate_by_hash=True
        )
        session.commit()
        assert counts_1["library_book"] == 1

        counts_2 = stream_xml_to_database(
            session, xml_2, schema_plan, metadata, deduplicate_by_hash=True
        )
        session.commit()
        assert counts_2["library_book"] == 1
    finally:
        session.close()


def test_stream_xml_to_database_extracts_tar_gz_archives(tmp_path: Path) -> None:
    import io
    import tarfile

    schema_plan = parse_xsd_schema(XSD_SOURCE)
    engine = init_database("sqlite+pysqlite:///:memory:")
    metadata = create_sqlalchemy_schema(engine, schema_plan)
    session = get_session(engine)

    tar_path = tmp_path / "data.tar.gz"
    xml_data = XML_SOURCE.encode("utf-8")

    with tarfile.open(tar_path, "w:gz") as tar:
        tarinfo = tarfile.TarInfo(name="sample.xml")
        tarinfo.size = len(xml_data)
        tar.addfile(tarinfo, io.BytesIO(xml_data))

    try:
        counts = stream_xml_to_database(session, tar_path, schema_plan, metadata)
        session.commit()

        assert counts == {
            "library": 1,
            "library_book": 2,
            "library_book_author": 3,
        }
    finally:
        session.close()


def test_auto_migrate_schema_quotes_reserved_identifiers() -> None:
    from crawler_common.xmlschema.schema import _auto_migrate_schema
    from sqlalchemy import Column, Integer, MetaData, Table, Text

    engine = init_database("sqlite+pysqlite:///:memory:")

    # Initial table with a reserved name like "order"
    meta_initial = MetaData()
    Table("order", meta_initial, Column("id", Integer, primary_key=True))
    meta_initial.create_all(engine)

    # Updated metadata adding a column named "user" (reserved keyword)
    meta_updated = MetaData()
    tbl = Table(
        "order",
        meta_updated,
        Column("id", Integer, primary_key=True),
        Column("user", Text, nullable=True),
    )

    _auto_migrate_schema(engine, meta_updated)

    from sqlalchemy import inspect

    inspector = inspect(engine)
    cols = {c["name"] for c in inspector.get_columns("order")}
    assert "user" in cols


def test_stream_xml_to_database_synchronizes_late_arriving_ancestor_values() -> None:
    xsd = """<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
      <xs:element name="library">
        <xs:complexType>
          <xs:sequence>
            <xs:element name="name" type="xs:string"/>
            <xs:element name="book" maxOccurs="unbounded">
              <xs:complexType>
                <xs:sequence>
                  <xs:element name="title" type="xs:string"/>
                </xs:sequence>
              </xs:complexType>
            </xs:element>
            <xs:element name="description" type="xs:string" minOccurs="0"/>
          </xs:sequence>
        </xs:complexType>
      </xs:element>
    </xs:schema>"""

    xml = """<library>
      <name>Main Library</name>
      <book><title>Book 1</title></book>
      <book><title>Book 2</title></book>
      <description>End description</description>
    </library>"""

    schema_plan = parse_xsd_schema(xsd)
    engine = init_database("sqlite+pysqlite:///:memory:")
    meta = create_sqlalchemy_schema(engine, schema_plan)
    session = get_session(engine)

    try:
        # commit_every=1 forces book 1 to flush and insert the library row before description is parsed
        counts = stream_xml_to_database(
            session, xml, schema_plan, metadata=meta, commit_every=1
        )
        lib_tbl = meta.tables["library"]
        res = session.execute(select(lib_tbl)).mappings().first()
        assert res is not None
        assert res["name"] == "Main Library"
        assert res["description"] == "End description"
        assert counts["library"] == 1
        assert counts["library_book"] == 2
    finally:
        session.close()


def test_stream_xml_to_database_normalizes_chunk_keys_for_heterogeneous_rows() -> None:
    xsd = """<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
      <xs:element name="catalog">
        <xs:complexType>
          <xs:sequence>
            <xs:element name="item" maxOccurs="unbounded">
              <xs:complexType>
                <xs:sequence>
                  <xs:element name="id_code" type="xs:string"/>
                  <xs:element name="name" type="xs:string" minOccurs="0"/>
                  <xs:element name="price" type="xs:float" minOccurs="0"/>
                  <xs:element name="note" type="xs:string" minOccurs="0"/>
                </xs:sequence>
              </xs:complexType>
            </xs:element>
          </xs:sequence>
        </xs:complexType>
      </xs:element>
    </xs:schema>"""

    # Row 1 has (id_code, name), Row 2 has (id_code, price), Row 3 has (id_code, note)
    xml = """<catalog>
      <item><id_code>A1</id_code><name>Item A</name></item>
      <item><id_code>B2</id_code><price>19.99</price></item>
      <item><id_code>C3</id_code><note>Special note</note></item>
    </catalog>"""

    schema_plan = parse_xsd_schema(xsd)
    engine = init_database("sqlite+pysqlite:///:memory:")
    meta = create_sqlalchemy_schema(engine, schema_plan)
    session = get_session(engine)

    try:
        counts = stream_xml_to_database(
            session, xml, schema_plan, metadata=meta, commit_every=100
        )
        item_tbl = meta.tables["catalog_item"]
        rows = session.execute(select(item_tbl).order_by(item_tbl.c.id)).mappings().all()
        assert len(rows) == 3
        assert rows[0]["id_code"] == "A1"
        assert rows[0]["name"] == "Item A"
        assert rows[0]["price"] is None
        assert rows[0]["note"] is None

        assert rows[1]["id_code"] == "B2"
        assert rows[1]["name"] is None
        assert rows[1]["price"] == 19.99
        assert rows[1]["note"] is None

        assert rows[2]["id_code"] == "C3"
        assert rows[2]["name"] is None
        assert rows[2]["price"] is None
        assert rows[2]["note"] == "Special note"
    finally:
        session.close()


def test_parse_xsd_and_ingest_with_db_schema() -> None:
    xsd = """<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
      <xs:element name="database">
        <xs:complexType>
          <xs:sequence>
            <xs:element name="record" maxOccurs="unbounded">
              <xs:complexType>
                <xs:sequence>
                  <xs:element name="name" type="xs:string"/>
                </xs:sequence>
              </xs:complexType>
            </xs:element>
          </xs:sequence>
        </xs:complexType>
      </xs:element>
    </xs:schema>"""

    xml = """<database>
      <record><name>Rec1</name></record>
      <record><name>Rec2</name></record>
    </database>"""

    schema_plan = parse_xsd_schema(xsd, db_schema="uniprot")
    assert schema_plan.db_schema == "uniprot"

    engine = init_database("sqlite+pysqlite:///:memory:")
    meta = create_sqlalchemy_schema(engine, schema_plan, db_schema="uniprot")
    session = get_session(engine)

    try:
        counts = stream_xml_to_database(session, xml, schema_plan, metadata=meta)
        session.commit()
        assert counts["database_record"] == 2
        tbl = meta.tables["uniprot.database_record"]
        assert tbl.schema == "uniprot"
        rows = session.execute(select(tbl.c.name)).scalars().all()
        assert rows == ["Rec1", "Rec2"]
    finally:
        session.close()


def test_process_s3_prefix_ingestion_scopes_tracking_by_schema(monkeypatch) -> None:
    xsd = """<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
      <xs:element name="catalog">
        <xs:complexType>
          <xs:sequence>
            <xs:element name="item" maxOccurs="unbounded">
              <xs:complexType>
                <xs:sequence>
                  <xs:element name="name" type="xs:string"/>
                </xs:sequence>
              </xs:complexType>
            </xs:element>
          </xs:sequence>
        </xs:complexType>
      </xs:element>
    </xs:schema>"""

    class FakeS3Client:
        def list_objects_v2(self, Bucket, Prefix):
            return {
                "Contents": [
                    {"Key": "files/batch1.xml", "ETag": '"etag1"', "Size": 100}
                ]
            }

    monkeypatch.setattr(
        "crawler_common.s3.client.create_s3_client", lambda **kw: FakeS3Client()
    )

    ingested_uris: list[str] = []

    def fake_stream(session, uri, plan, meta, **kwargs):
        ingested_uris.append(f"{plan.db_schema}::{uri}")
        return {"catalog_item": 1}

    monkeypatch.setattr(
        "crawler_common.xmlschema.ingestor.stream_xml_to_database", fake_stream
    )

    engine = init_database("sqlite+pysqlite:///:memory:")
    plan_public = parse_xsd_schema(xsd, db_schema="public")
    meta_public = create_sqlalchemy_schema(engine, plan_public)

    plan_uniprot = parse_xsd_schema(xsd, db_schema="uniprot")
    meta_uniprot = create_sqlalchemy_schema(engine, plan_uniprot, db_schema="uniprot")

    session = get_session(engine)
    try:
        # 1. Ingest into public schema
        counts1 = process_s3_prefix_ingestion(
            session, "s3://mybucket/files/", plan_public, meta_public
        )
        assert counts1 == {"catalog_item": 1}

        # 2. Second run into public schema should skip (already ingested)
        counts2 = process_s3_prefix_ingestion(
            session, "s3://mybucket/files/", plan_public, meta_public
        )
        assert counts2 == {}

        # 3. Ingest into uniprot schema should NOT be suppressed by public schema record
        counts3 = process_s3_prefix_ingestion(
            session, "s3://mybucket/files/", plan_uniprot, meta_uniprot
        )
        assert counts3 == {"catalog_item": 1}

        assert "public::s3://mybucket/files/batch1.xml" in ingested_uris
        assert "uniprot::s3://mybucket/files/batch1.xml" in ingested_uris
    finally:
        session.close()


def test_create_sqlalchemy_schema_postgres_quotes_schema() -> None:
    from unittest.mock import MagicMock
    from sqlalchemy.dialects import postgresql

    mock_engine = MagicMock()
    mock_engine.dialect.name = "postgresql"

    xsd = """<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
      <xs:element name="item">
        <xs:complexType>
          <xs:sequence>
            <xs:element name="name" type="xs:string"/>
          </xs:sequence>
        </xs:complexType>
      </xs:element>
    </xs:schema>"""

    plan = parse_xsd_schema(xsd, db_schema="UniProt")
    create_sqlalchemy_schema(mock_engine, plan, auto_migrate=False, db_schema="UniProt")

    executed_calls = (
        mock_engine.begin.return_value.__enter__.return_value.execute.call_args_list
    )
    executed_stmts = [call[0][0] for call in executed_calls]

    compiled_stmts = [
        str(stmt.compile(dialect=postgresql.dialect()))
        if hasattr(stmt, "compile")
        else str(stmt)
        for stmt in executed_stmts
    ]
    assert any('CREATE SCHEMA IF NOT EXISTS "_ingest_metadata"' in s or 'CREATE SCHEMA IF NOT EXISTS _ingest_metadata' in s for s in compiled_stmts)
    assert any('CREATE SCHEMA IF NOT EXISTS "UniProt"' in s for s in compiled_stmts)


def test_create_sqlalchemy_schema_sqlite_idempotent_attachment() -> None:
    engine = init_database("sqlite+pysqlite:///:memory:")

    xsd = """<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
      <xs:element name="item">
        <xs:complexType>
          <xs:sequence>
            <xs:element name="name" type="xs:string"/>
          </xs:sequence>
        </xs:complexType>
      </xs:element>
    </xs:schema>"""

    plan1 = parse_xsd_schema(xsd, db_schema="schema_alpha")
    meta1 = create_sqlalchemy_schema(engine, plan1, db_schema="schema_alpha")
    assert meta1 is not None

    plan2 = parse_xsd_schema(xsd, db_schema="schema_beta")
    meta2 = create_sqlalchemy_schema(engine, plan2, db_schema="schema_beta")
    assert meta2 is not None

    with engine.connect() as conn:
        raw_conn = conn.connection
        cursor = raw_conn.cursor()
        cursor.execute("PRAGMA database_list")
        databases = {row[1] for row in cursor.fetchall()}
        cursor.close()

    assert "_ingest_metadata" in databases
    assert "schema_alpha" in databases
    assert "schema_beta" in databases


def test_record_ingested_file_populates_metadata_table() -> None:
    engine = init_database("sqlite+pysqlite:///:memory:")
    xsd = """<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
      <xs:element name="item" type="xs:string"/>
    </xs:schema>"""

    plan = parse_xsd_schema(xsd, db_schema="bioproject")
    metadata = create_sqlalchemy_schema(engine, plan, db_schema="bioproject")
    session = get_session(engine)

    try:
        record_ingested_file(
            session,
            metadata,
            "s3://mybucket/downloads/file.xml",
            target_schema="bioproject",
            file_etag="etag-123",
            file_size=4567,
        )

        table = metadata.tables["_ingest_metadata._ingested_files"]
        rows = session.execute(select(table)).all()
        assert len(rows) == 1
        row = rows[0]
        assert row.target_schema == "bioproject"
        assert row.file_key == "downloads/file.xml"
        assert row.file_etag == "etag-123"
        assert row.file_size == 4567
    finally:
        session.close()


def test_parse_xsd_with_jsonb_annotation() -> None:
    xsd = """<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
      <xs:element name="Sample">
        <xs:complexType>
          <xs:sequence>
            <xs:element name="Accession" type="xs:string"/>
            <xs:element name="Attributes">
              <xs:annotation>
                <xs:appinfo>
                  <jsonb>true</jsonb>
                </xs:appinfo>
              </xs:annotation>
              <xs:complexType>
                <xs:sequence>
                  <xs:element name="Attribute" maxOccurs="unbounded">
                    <xs:complexType>
                      <xs:simpleContent>
                        <xs:extension base="xs:string">
                          <xs:attribute name="name" type="xs:string"/>
                        </xs:extension>
                      </xs:simpleContent>
                    </xs:complexType>
                  </xs:element>
                </xs:sequence>
              </xs:complexType>
            </xs:element>
          </xs:sequence>
        </xs:complexType>
      </xs:element>
    </xs:schema>"""

    plan = parse_xsd_schema(xsd)
    assert len(plan.tables_by_name) == 1
    assert "sample" in plan.tables_by_name
    sample_table = plan.tables_by_name["sample"]
    assert "Attributes" in sample_table.jsonb_children
    assert sample_table.jsonb_children["Attributes"].column_name == "attributes"
    col_names = [col.column_name for col in sample_table.columns]
    assert "accession" in col_names
    assert "attributes" in col_names
    # Child tables should NOT have been generated
    assert len(sample_table.child_tables) == 0


def test_stream_xml_to_database_with_jsonb() -> None:
    xsd = """<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
      <xs:element name="SampleSet">
        <xs:annotation>
          <xs:appinfo><table name="set"/></xs:appinfo>
        </xs:annotation>
        <xs:complexType>
          <xs:sequence>
            <xs:element name="Sample" maxOccurs="unbounded">
              <xs:annotation>
                <xs:appinfo><table name="sample"/></xs:appinfo>
              </xs:annotation>
              <xs:complexType>
                <xs:sequence>
                  <xs:element name="Accession" type="xs:string"/>
                  <xs:element name="Attributes">
                    <xs:annotation>
                      <xs:appinfo>
                        <store_as>jsonb</store_as>
                      </xs:appinfo>
                    </xs:annotation>
                    <xs:complexType>
                      <xs:sequence>
                        <xs:element name="Attribute" maxOccurs="unbounded">
                          <xs:complexType>
                            <xs:simpleContent>
                              <xs:extension base="xs:string">
                                <xs:attribute name="attribute_name" type="xs:string"/>
                                <xs:attribute name="unit" type="xs:string"/>
                              </xs:extension>
                            </xs:simpleContent>
                          </xs:complexType>
                        </xs:element>
                      </xs:sequence>
                    </xs:complexType>
                  </xs:element>
                </xs:sequence>
              </xs:complexType>
            </xs:element>
          </xs:sequence>
        </xs:complexType>
      </xs:element>
    </xs:schema>"""

    xml = """<SampleSet>
      <Sample>
        <Accession>SAMN0001</Accession>
        <Attributes>
          <Attribute attribute_name="tissue" unit="mg">Liver</Attribute>
          <Attribute attribute_name="age">42</Attribute>
        </Attributes>
      </Sample>
      <Sample>
        <Accession>SAMN0002</Accession>
        <Attributes>
          <Attribute attribute_name="organism">Homo sapiens</Attribute>
        </Attributes>
      </Sample>
    </SampleSet>"""

    engine = init_database("sqlite+pysqlite:///:memory:")
    plan = parse_xsd_schema(xsd)
    metadata = create_sqlalchemy_schema(engine, plan)
    session = get_session(engine)

    try:
        counts = stream_xml_to_database(session, xml, plan, metadata=metadata)
        assert counts["set_sample"] == 2
        assert "set_sample_attributes" not in counts

        sample_table = metadata.tables["set_sample"]
        rows = session.execute(select(sample_table).order_by(sample_table.c.id)).mappings().all()
        assert len(rows) == 2

        assert rows[0]["accession"] == "SAMN0001"
        attrs1 = rows[0]["attributes"]
        if isinstance(attrs1, str):
            import json
            attrs1 = json.loads(attrs1)
        assert "Attribute" in attrs1
        assert len(attrs1["Attribute"]) == 2
        assert attrs1["Attribute"][0]["attribute_name"] == "tissue"
        assert attrs1["Attribute"][0]["unit"] == "mg"
        assert attrs1["Attribute"][0]["value"] == "Liver"
        assert attrs1["Attribute"][1]["attribute_name"] == "age"
        assert attrs1["Attribute"][1]["value"] == "42"

        assert rows[1]["accession"] == "SAMN0002"
        attrs2 = rows[1]["attributes"]
        if isinstance(attrs2, str):
            import json
            attrs2 = json.loads(attrs2)
        assert attrs2["Attribute"]["attribute_name"] == "organism"
        assert attrs2["Attribute"]["value"] == "Homo sapiens"
    finally:
        session.close()

