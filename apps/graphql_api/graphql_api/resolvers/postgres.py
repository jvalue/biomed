"""PostgreSQL resolvers — delegates to the existing PostgresService."""

from __future__ import annotations

from graphql_api.schema.types import (
    BioProjectEntry,
    BioProjectPublication,
    ColumnInfo,
    ForeignKeyInfo,
    IndexInfo,
    QueryResult,
    TableDetail,
    TableInfo,
    UniprotCrossReference,
    UniprotEntry,
    ViewInfo,
    ViewQueryResult,
    ViewRow,
)
from graphql_api.services.postgres import (
    PostgresService,
    load_settings,
)

# ---------------------------------------------------------------------------
# Service factory (lazy singleton)
# ---------------------------------------------------------------------------

_service: PostgresService | None = None


def _get_service() -> PostgresService:
    """Return a shared PostgresService instance, created on first call.

    We defer import-time side-effects (DB connection) so the module can be
    imported in tests without requiring a live database.
    """
    global _service
    if _service is None:
        settings = load_settings()
        _service = PostgresService(settings)
    return _service


def set_service(service: PostgresService | None) -> None:
    """Override the shared service instance (useful for testing)."""
    global _service
    _service = service


# ---------------------------------------------------------------------------
# Resolver functions
# ---------------------------------------------------------------------------


def resolve_tables(schema_name: str = "public") -> list[TableInfo]:
    """List all tables in the given schema."""
    result = _get_service().list_tables(schema_name=schema_name)
    return [
        TableInfo(
            table_name=t["table_name"],
            schema_name=t["schema"],
            column_count=t["column_count"],
            primary_key=t.get("primary_key", []),
            row_count=t.get("row_count"),
        )
        for t in result["tables"]
    ]


def resolve_table_detail(table_name: str, schema_name: str = "public") -> TableDetail:
    """Describe a single table's schema in detail."""
    result = _get_service().describe_table(table_name, schema_name=schema_name)
    return TableDetail(
        table_name=result["table_name"],
        schema_name=result["schema"],
        primary_key=result.get("primary_key", []),
        columns=[
            ColumnInfo(
                name=c["name"],
                type=c["type"],
                nullable=c.get("nullable", True),
                default=c.get("default"),
                autoincrement=c.get("autoincrement", False),
            )
            for c in result["columns"]
        ],
        foreign_keys=[
            ForeignKeyInfo(
                constrained_columns=fk.get("constrained_columns", []),
                referred_schema=fk.get("referred_schema", schema_name),
                referred_table=fk.get("referred_table", ""),
                referred_columns=fk.get("referred_columns", []),
            )
            for fk in result.get("foreign_keys", [])
        ],
        indexes=[
            IndexInfo(
                name=idx.get("name"),
                column_names=idx.get("column_names", []),
                unique=idx.get("unique", False),
            )
            for idx in result.get("indexes", [])
        ],
    )


def resolve_views(schema_name: str = "public") -> list[ViewInfo]:
    """List all views in the given schema."""
    result = _get_service().list_views(schema_name=schema_name)
    return [
        ViewInfo(
            view_name=v["view_name"],
            schema_name=v["schema"],
            column_count=v["column_count"],
            columns=v.get("columns", []),
        )
        for v in result["views"]
    ]


def resolve_view_query(
    view_name: str,
    schema_name: str = "public",
    limit: int = 100,
    offset: int = 0,
) -> ViewQueryResult:
    """Query rows from a database view with pagination."""
    result = _get_service().query_view(
        view_name, schema_name=schema_name, limit=limit, offset=offset
    )
    return ViewQueryResult(
        view_name=result["view_name"],
        schema_name=result["schema"],
        limit=result["limit"],
        offset=result["offset"],
        count=result["count"],
        rows=[ViewRow(data=row) for row in result["rows"]],
    )


def resolve_uniprot_entries(
    query: str | None = None,
    accession: str | None = None,
    taxid: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[UniprotEntry]:
    """Search or list UniProt entry summaries."""
    result = _get_service().get_uniprot_summary(
        query=query, accession=accession, taxid=taxid, limit=limit, offset=offset
    )
    entries: list[UniprotEntry] = []
    known_keys = {
        "entry_id",
        "primary_accession",
        "entry_name",
        "dataset",
        "protein_name",
        "gene_names",
        "organism_name",
        "taxid",
        "sequence_length",
        "sequence",
        "version",
        "created",
        "modified",
        "keywords",
    }
    for row in result["rows"]:
        extra = {k: v for k, v in row.items() if k not in known_keys}
        gene_names_val = row.get("gene_names")
        if isinstance(gene_names_val, list):
            gene_names_val = ", ".join(str(g) for g in gene_names_val)

        entries.append(
            UniprotEntry(
                primary_accession=row.get("primary_accession", ""),
                entry_id=row.get("entry_id"),
                entry_name=row.get("entry_name"),
                dataset=row.get("dataset"),
                protein_name=row.get("protein_name"),
                gene_names=gene_names_val,
                organism_name=row.get("organism_name"),
                taxid=str(row.get("taxid")) if row.get("taxid") is not None else None,
                sequence_length=row.get("sequence_length"),
                sequence=row.get("sequence"),
                version=row.get("version"),
                created=str(row.get("created")) if row.get("created") else None,
                modified=str(row.get("modified")) if row.get("modified") else None,
                keywords=row.get("keywords")
                if isinstance(row.get("keywords"), list)
                else None,
                extra_fields=extra if extra else None,
            )
        )
    return entries


def resolve_bioproject_entries(
    query: str | None = None,
    accession: str | None = None,
    taxid: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[BioProjectEntry]:
    """Search or list BioProject project summaries."""
    result = _get_service().get_bioproject_summary(
        query=query, accession=accession, taxid=taxid, limit=limit, offset=offset
    )
    entries: list[BioProjectEntry] = []
    known_keys = {
        "accession",
        "archive",
        "archive_project_id",
        "project_name",
        "project_title",
        "project_description",
        "taxid",
        "species_taxid",
        "organism_name",
        "strain",
        "isolate_name",
        "supergroup",
        "project_type",
        "publication_count",
        "external_link_count",
    }
    for row in result["rows"]:
        extra = {k: v for k, v in row.items() if k not in known_keys}
        entries.append(
            BioProjectEntry(
                accession=row.get("accession", ""),
                archive=row.get("archive"),
                archive_project_id=str(row.get("archive_project_id"))
                if row.get("archive_project_id") is not None
                else None,
                project_name=row.get("project_name"),
                project_title=row.get("project_title"),
                project_description=row.get("project_description"),
                taxid=str(row.get("taxid")) if row.get("taxid") is not None else None,
                species_taxid=str(row.get("species_taxid"))
                if row.get("species_taxid") is not None
                else None,
                organism_name=row.get("organism_name"),
                strain=row.get("strain"),
                isolate_name=row.get("isolate_name"),
                supergroup=row.get("supergroup"),
                project_type=row.get("project_type"),
                publication_count=int(row.get("publication_count", 0)),
                external_link_count=int(row.get("external_link_count", 0)),
                extra_fields=extra if extra else None,
            )
        )
    return entries


def resolve_bioproject_publications(
    accession: str | None = None,
    pubmed_id: str | None = None,
    limit: int = 50,
) -> list[BioProjectPublication]:
    """Query BioProject publications."""
    result = _get_service().get_bioproject_publications(
        accession=accession, pubmed_id=pubmed_id, limit=limit
    )
    return [
        BioProjectPublication(
            accession=row.get("accession", ""),
            pubmed_id=str(row.get("pubmed_id"))
            if row.get("pubmed_id") is not None
            else None,
            publication_date=str(row.get("publication_date"))
            if row.get("publication_date")
            else None,
            publication_status=row.get("publication_status"),
            article_title=row.get("article_title"),
            journal_title=row.get("journal_title"),
            publication_year=str(row.get("publication_year"))
            if row.get("publication_year") is not None
            else None,
            authors=row.get("authors"),
        )
        for row in result["rows"]
    ]


def resolve_uniprot_cross_references(
    accession: str | None = None,
    database_type: str | None = None,
    limit: int = 50,
) -> list[UniprotCrossReference]:
    """Query UniProt cross-references."""
    result = _get_service().get_uniprot_cross_references(
        accession=accession, database_type=database_type, limit=limit
    )
    return [
        UniprotCrossReference(
            database_type=row.get("database_type", ""),
            database_id=str(row.get("database_id", "")),
            primary_accession=row.get("primary_accession"),
            entry_id=row.get("entry_id"),
        )
        for row in result["rows"]
    ]


def resolve_execute_query(
    sql: str,
    limit: int = 100,
) -> QueryResult:
    """Execute a read-only SQL query."""
    result = _get_service().execute_query(sql, limit=limit)
    return QueryResult(
        count=result["count"],
        rows=[ViewRow(data=row) for row in result["rows"]],
    )
