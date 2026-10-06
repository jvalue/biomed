"""Strawberry GraphQL type definitions for the Biomed data domain."""

from __future__ import annotations

import strawberry


# ---------------------------------------------------------------------------
# PostgreSQL domain types
# ---------------------------------------------------------------------------


@strawberry.type(description="Column metadata for a database table or view.")
class ColumnInfo:
    name: str
    type: str
    nullable: bool
    default: str | None = None
    autoincrement: bool = False


@strawberry.type(description="Foreign key constraint metadata.")
class ForeignKeyInfo:
    constrained_columns: list[str]
    referred_schema: str
    referred_table: str
    referred_columns: list[str]


@strawberry.type(description="Index metadata for a database table.")
class IndexInfo:
    name: str | None
    column_names: list[str]
    unique: bool


@strawberry.type(description="Summary information about a database table.")
class TableInfo:
    table_name: str
    schema_name: str
    column_count: int
    primary_key: list[str]
    row_count: int | None = None


@strawberry.type(description="Detailed schema description of a database table.")
class TableDetail:
    table_name: str
    schema_name: str
    primary_key: list[str]
    columns: list[ColumnInfo]
    foreign_keys: list[ForeignKeyInfo]
    indexes: list[IndexInfo]


@strawberry.type(description="Summary information about a database view.")
class ViewInfo:
    view_name: str
    schema_name: str
    column_count: int
    columns: list[str]


@strawberry.type(description="A row of data returned from a view query.")
class ViewRow:
    """Generic key-value representation of a database row.

    Uses a JSON-encoded string to preserve arbitrary column types without
    requiring a fixed GraphQL schema per view.
    """

    data: strawberry.scalars.JSON


@strawberry.type(description="Paginated result set from a view query.")
class ViewQueryResult:
    view_name: str
    schema_name: str
    limit: int
    offset: int
    count: int
    rows: list[ViewRow]


@strawberry.type(description="UniProt protein entry summary from mv_uniprot_entry_overview.")
class UniprotEntry:
    primary_accession: str
    entry_id: int | None = None
    entry_name: str | None = None
    dataset: str | None = None
    protein_name: str | None = None
    gene_names: str | None = None
    organism_name: str | None = None
    taxid: str | None = None
    sequence_length: int | None = None
    sequence: str | None = None
    version: int | None = None
    created: str | None = None
    modified: str | None = None
    keywords: list[str] | None = None
    extra_fields: strawberry.scalars.JSON | None = None


@strawberry.type(description="NCBI BioProject summary from mv_bioproject_overview.")
class BioProjectEntry:
    accession: str
    archive: str | None = None
    archive_project_id: str | None = None
    project_name: str | None = None
    project_title: str | None = None
    project_description: str | None = None
    taxid: str | None = None
    species_taxid: str | None = None
    organism_name: str | None = None
    strain: str | None = None
    isolate_name: str | None = None
    supergroup: str | None = None
    project_type: str | None = None
    publication_count: int = 0
    external_link_count: int = 0
    extra_fields: strawberry.scalars.JSON | None = None


@strawberry.type(description="BioProject publication reference from mv_bioproject_publications.")
class BioProjectPublication:
    accession: str
    pubmed_id: str | None = None
    publication_date: str | None = None
    publication_status: str | None = None
    article_title: str | None = None
    journal_title: str | None = None
    publication_year: str | None = None
    authors: str | None = None


@strawberry.type(description="UniProt external database cross-reference from mv_uniprot_cross_references.")
class UniprotCrossReference:
    database_type: str
    database_id: str
    primary_accession: str | None = None
    entry_id: int | None = None


@strawberry.type(description="Result of a raw SQL query execution.")
class QueryResult:
    count: int
    rows: list[ViewRow]


# ---------------------------------------------------------------------------
# S3 domain types
# ---------------------------------------------------------------------------


@strawberry.type(description="An object stored in S3.")
class S3Object:
    key: str
    size: int
    last_modified: str | None = None
    etag: str | None = None
    content_type: str | None = None


@strawberry.type(description="Result of listing objects in an S3 bucket.")
class S3ListResult:
    bucket: str
    prefix: str
    delimiter: str
    count: int
    objects: list[S3Object]
    prefixes: list[str]
    is_truncated: bool
    next_continuation_token: str | None = None


@strawberry.type(description="S3 object metadata from a HEAD request.")
class S3ObjectMetadata:
    bucket: str
    key: str
    content_length: int | None = None
    content_type: str | None = None
    etag: str | None = None
    last_modified: str | None = None
    metadata: strawberry.scalars.JSON | None = None


@strawberry.type(description="S3 object content (text-based objects only).")
class S3ObjectContent:
    key: str
    content: str | None = None
    is_binary: bool = False
    size: int = 0
