"""FastAPI application with Strawberry GraphQL endpoint."""

from __future__ import annotations

from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter

from graphql_api.schema.query import schema

app = FastAPI(
    title="Biomed GraphQL API",
    description=(
        "Unified GraphQL interface for querying biomedical data stored in "
        "PostgreSQL (views, tables, UniProt entries) and S3 (raw XML, archives)."
    ),
    version="0.1.0",
)

graphql_app = GraphQLRouter(schema)
app.include_router(graphql_app, prefix="/graphql")


@app.get("/health")
def health_check() -> dict[str, str]:
    """Simple liveness probe."""
    return {"status": "ok"}
