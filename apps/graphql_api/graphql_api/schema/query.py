"""Root GraphQL Query type combining all resolvers."""

from __future__ import annotations

import strawberry

from graphql_api.resolvers.postgres import (
    resolve_execute_query,
    resolve_table_detail,
    resolve_tables,
    resolve_uniprot_entries,
    resolve_view_query,
    resolve_views,
)
from graphql_api.resolvers.s3 import (
    resolve_s3_object_content,
    resolve_s3_object_metadata,
    resolve_s3_objects,
)
from graphql_api.schema.types import (
    QueryResult,
    S3ListResult,
    S3ObjectContent,
    S3ObjectMetadata,
    TableDetail,
    TableInfo,
    UniprotEntry,
    ViewInfo,
    ViewQueryResult,
)


@strawberry.type(description="Root query for the Biomed GraphQL API.")
class Query:
    # ----- PostgreSQL: schema introspection -----------------------------------

    @strawberry.field(description="List all tables in a database schema.")
    def tables(self, schema_name: str = "public") -> list[TableInfo]:
        return resolve_tables(schema_name=schema_name)

    @strawberry.field(description="Detailed schema description for a single table.")
    def table_detail(
        self, table_name: str, schema_name: str = "public"
    ) -> TableDetail:
        return resolve_table_detail(table_name, schema_name=schema_name)

    @strawberry.field(description="List all views in a database schema.")
    def views(self, schema_name: str = "public") -> list[ViewInfo]:
        return resolve_views(schema_name=schema_name)

    @strawberry.field(description="Query rows from a database view with pagination.")
    def view_query(
        self,
        view_name: str,
        schema_name: str = "public",
        limit: int = 100,
        offset: int = 0,
    ) -> ViewQueryResult:
        return resolve_view_query(
            view_name, schema_name=schema_name, limit=limit, offset=offset
        )

    # ----- PostgreSQL: domain-specific ----------------------------------------

    @strawberry.field(
        description="Search or list UniProt protein entry summaries."
    )
    def uniprot_entries(
        self,
        query: str | None = None,
        limit: int = 50,
    ) -> list[UniprotEntry]:
        return resolve_uniprot_entries(query=query, limit=limit)

    # ----- PostgreSQL: raw SQL ------------------------------------------------

    @strawberry.field(
        description="Execute a read-only SQL query against the database."
    )
    def execute_query(
        self,
        sql: str,
        limit: int = 100,
    ) -> QueryResult:
        return resolve_execute_query(sql=sql, limit=limit)

    # ----- S3 -----------------------------------------------------------------

    @strawberry.field(description="List objects in the S3 bucket by prefix.")
    def s3_objects(
        self,
        prefix: str = "",
        delimiter: str = "/",
        max_keys: int = 100,
    ) -> S3ListResult:
        return resolve_s3_objects(
            prefix=prefix, delimiter=delimiter, max_keys=max_keys
        )

    @strawberry.field(description="Get metadata for a single S3 object.")
    def s3_object_metadata(self, key: str) -> S3ObjectMetadata:
        return resolve_s3_object_metadata(key=key)

    @strawberry.field(
        description="Read the content of an S3 object (text-based objects only)."
    )
    def s3_object_content(self, key: str) -> S3ObjectContent:
        return resolve_s3_object_content(key=key)


schema = strawberry.Schema(query=Query)
