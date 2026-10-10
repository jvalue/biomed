"""Unified Biomed MCP server — exposes domain tools backed by the GraphQL schema.

This server replaces the separate ``postgres_mcp`` and ``s3_mcp`` servers with
a single FastMCP instance whose tools execute GraphQL queries in-process via
``schema.execute_sync()``.  No HTTP round-trip is needed in the default
(in-process) mode.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

from dotenv import load_dotenv

# Import the Strawberry schema so we can execute queries in-process as fallback.
from graphql_api.schema.query import schema as graphql_schema
from mcp.server.fastmcp import FastMCP

APP_DIR = Path(__file__).resolve().parents[1]
load_dotenv(APP_DIR / ".env")


def _get_graphql_url() -> str:
    return os.getenv("GRAPHQL_API_URL", "")


mcp = FastMCP("Biomed Unified MCP", json_response=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _gql(query: str, variables: dict[str, Any] | None = None) -> dict[str, Any]:
    """Execute a GraphQL query against HTTP service if available, else in-process.

    Raises ``RuntimeError`` if the query produces errors.
    """
    gql_url = _get_graphql_url()
    if gql_url:
        try:
            req = Request(
                gql_url,
                data=json.dumps({"query": query, "variables": variables or {}}).encode(
                    "utf-8"
                ),
                headers={"Content-Type": "application/json"},
            )
            with urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("errors"):
                    messages = "; ".join(
                        str(e.get("message", e)) for e in data["errors"]
                    )
                    raise RuntimeError(f"GraphQL error: {messages}")
                return data["data"]
        except Exception as exc:
            # If connection was refused or endpoint unavailable, fall back to in-process
            if not isinstance(exc, (RuntimeError,)):
                pass
            else:
                raise

    result = graphql_schema.execute_sync(query, variable_values=variables)
    if result.errors:
        messages = "; ".join(str(e) for e in result.errors)
        raise RuntimeError(f"GraphQL query failed: {messages}")
    return result.data


# ---------------------------------------------------------------------------
# MCP Resources
# ---------------------------------------------------------------------------


@mcp.resource("biomed://schema")
def graphql_schema_introspection() -> dict[str, object]:
    """Full GraphQL schema in SDL format for agent reference."""
    from strawberry.printer import print_schema

    return {"sdl": print_schema(graphql_schema)}


# ---------------------------------------------------------------------------
# MCP Tools — PostgreSQL (via GraphQL)
# ---------------------------------------------------------------------------


@mcp.tool()
def list_tables(schema_name: str = "public") -> dict[str, object]:
    """List all tables in the database with column and row counts."""
    data = _gql(
        """
        query ListTables($schema: String!) {
            tables(schemaName: $schema) {
                tableName
                schemaName
                columnCount
                primaryKey
                rowCount
            }
        }
        """,
        {"schema": schema_name},
    )
    return {"tables": data["tables"]}


@mcp.tool()
def describe_table(table_name: str, schema_name: str = "public") -> dict[str, object]:
    """Get detailed schema metadata for a table (columns, keys, indexes)."""
    data = _gql(
        """
        query DescribeTable($table: String!, $schema: String!) {
            tableDetail(tableName: $table, schemaName: $schema) {
                tableName
                schemaName
                primaryKey
                columns { name type nullable default autoincrement }
                foreignKeys { constrainedColumns referredSchema referredTable referredColumns }
                indexes { name columnNames unique }
            }
        }
        """,
        {"table": table_name, "schema": schema_name},
    )
    return data["tableDetail"]


@mcp.tool()
def list_views(schema_name: str = "public") -> dict[str, object]:
    """List all database views in a schema."""
    data = _gql(
        """
        query ListViews($schema: String!) {
            views(schemaName: $schema) {
                viewName
                schemaName
                columnCount
                columns
            }
        }
        """,
        {"schema": schema_name},
    )
    return {"views": data["views"]}


@mcp.tool()
def query_view(
    view_name: str,
    schema_name: str = "public",
    limit: int = 100,
    offset: int = 0,
) -> dict[str, object]:
    """Query rows from a database view with pagination."""
    data = _gql(
        """
        query QueryView($view: String!, $schema: String!, $limit: Int!, $offset: Int!) {
            viewQuery(viewName: $view, schemaName: $schema, limit: $limit, offset: $offset) {
                viewName
                schemaName
                limit
                offset
                count
                rows { data }
            }
        }
        """,
        {"view": view_name, "schema": schema_name, "limit": limit, "offset": offset},
    )
    return data["viewQuery"]


@mcp.tool()
def search_uniprot(
    query: str | None = None,
    accession: str | None = None,
    taxid: str | None = None,
    limit: int = 50,
) -> dict[str, object]:
    """Search UniProt protein entry summaries by query text, accession, or NCBI taxid."""
    data = _gql(
        """
        query SearchUniprot($query: String, $accession: String, $taxid: String, $limit: Int!) {
            uniprotEntries(query: $query, accession: $accession, taxid: $taxid, limit: $limit) {
                primaryAccession
                entryId
                entryName
                dataset
                proteinName
                geneNames
                organismName
                taxid
                sequenceLength
                sequence
                version
                created
                modified
                keywords
                extraFields
            }
        }
        """,
        {"query": query, "accession": accession, "taxid": taxid, "limit": limit},
    )
    return {"count": len(data["uniprotEntries"]), "entries": data["uniprotEntries"]}


@mcp.tool()
def search_bioproject(
    query: str | None = None,
    accession: str | None = None,
    taxid: str | None = None,
    limit: int = 50,
) -> dict[str, object]:
    """Search NCBI BioProject entries by query text, accession, or NCBI taxid."""
    data = _gql(
        """
        query SearchBioProject($query: String, $accession: String, $taxid: String, $limit: Int!) {
            bioprojectEntries(query: $query, accession: $accession, taxid: $taxid, limit: $limit) {
                accession
                archive
                archiveProjectId
                projectName
                projectTitle
                projectDescription
                taxid
                speciesTaxid
                organismName
                strain
                isolateName
                supergroup
                projectType
                publicationCount
                externalLinkCount
                extraFields
            }
        }
        """,
        {"query": query, "accession": accession, "taxid": taxid, "limit": limit},
    )
    return {
        "count": len(data["bioprojectEntries"]),
        "projects": data["bioprojectEntries"],
    }


@mcp.tool()
def get_bioproject_publications(
    accession: str | None = None,
    pubmed_id: str | None = None,
    limit: int = 50,
) -> dict[str, object]:
    """Query publications for a BioProject accession or by PubMed ID."""
    data = _gql(
        """
        query BioProjectPubs($accession: String, $pubmedId: String, $limit: Int!) {
            bioprojectPublications(accession: $accession, pubmedId: $pubmedId, limit: $limit) {
                accession
                pubmedId
                publicationDate
                publicationStatus
                articleTitle
                journalTitle
                publicationYear
                authors
            }
        }
        """,
        {"accession": accession, "pubmedId": pubmed_id, "limit": limit},
    )
    return {
        "count": len(data["bioprojectPublications"]),
        "publications": data["bioprojectPublications"],
    }


@mcp.tool()
def get_uniprot_cross_references(
    accession: str | None = None,
    database_type: str | None = None,
    limit: int = 50,
) -> dict[str, object]:
    """Query external database cross-references (PDB, RefSeq, Ensembl, etc.) for a UniProt accession."""
    data = _gql(
        """
        query UniprotXrefs($accession: String, $databaseType: String, $limit: Int!) {
            uniprotCrossReferences(accession: $accession, databaseType: $databaseType, limit: $limit) {
                databaseType
                databaseId
                primaryAccession
                entryId
            }
        }
        """,
        {"accession": accession, "databaseType": database_type, "limit": limit},
    )
    return {
        "count": len(data["uniprotCrossReferences"]),
        "crossReferences": data["uniprotCrossReferences"],
    }


@mcp.tool()
def execute_query(
    sql: str,
    limit: int = 100,
) -> dict[str, object]:
    """Execute a read-only SQL query against the PostgreSQL database."""
    data = _gql(
        """
        query ExecuteSQL($sql: String!, $limit: Int!) {
            executeQuery(sql: $sql, limit: $limit) {
                count
                rows { data }
            }
        }
        """,
        {"sql": sql, "limit": limit},
    )
    return data["executeQuery"]


# ---------------------------------------------------------------------------
# MCP Tools — S3 (via GraphQL)
# ---------------------------------------------------------------------------


@mcp.tool()
def list_s3_objects(
    prefix: str = "",
    delimiter: str = "/",
    max_keys: int = 100,
) -> dict[str, object]:
    """List objects in the S3 bucket by prefix."""
    data = _gql(
        """
        query ListS3($prefix: String!, $delimiter: String!, $maxKeys: Int!) {
            s3Objects(prefix: $prefix, delimiter: $delimiter, maxKeys: $maxKeys) {
                bucket
                prefix
                count
                objects { key size lastModified contentType }
                prefixes
                isTruncated
            }
        }
        """,
        {"prefix": prefix, "delimiter": delimiter, "maxKeys": max_keys},
    )
    return data["s3Objects"]


@mcp.tool()
def get_s3_object_metadata(key: str) -> dict[str, object]:
    """Get metadata (size, content type, last modified) for a single S3 object."""
    data = _gql(
        """
        query S3Meta($key: String!) {
            s3ObjectMetadata(key: $key) {
                bucket
                key
                contentLength
                contentType
                etag
                lastModified
                metadata
            }
        }
        """,
        {"key": key},
    )
    return data["s3ObjectMetadata"]


@mcp.tool()
def read_s3_object(key: str) -> dict[str, object]:
    """Read the content of an S3 object (text-based objects like XML/JSON)."""
    data = _gql(
        """
        query S3Content($key: String!) {
            s3ObjectContent(key: $key) {
                key
                content
                isBinary
                size
            }
        }
        """,
        {"key": key},
    )
    return data["s3ObjectContent"]


# ---------------------------------------------------------------------------
# Server entry point
# ---------------------------------------------------------------------------


def run() -> None:
    transport = os.getenv("MCP_TRANSPORT", "stdio")
    port_val = int(os.getenv("FASTMCP_PORT") or os.getenv("PORT") or "8004")
    host_val = os.getenv("FASTMCP_HOST") or os.getenv("HOST") or "127.0.0.1"

    mcp.settings.port = port_val
    mcp.settings.host = host_val

    mcp.run(transport=transport)
