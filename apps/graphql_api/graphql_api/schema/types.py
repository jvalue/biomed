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


@strawberry.type(description="UniProt protein entry summary from v_uniprot_entry_summary.")
class UniprotEntry:
    primary_accession: str
    entry_name: str | None = None
    organism_name: str | None = None
    gene_names: list[str] | None = None
    keywords: list[str] | None = None
    # Additional fields are captured in extra_fields for forward compatibility
    extra_fields: strawberry.scalars.JSON | None = None


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
