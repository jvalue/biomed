"""Common data models for crawler applications."""

from datetime import datetime, timezone
from typing import Optional, Protocol, TYPE_CHECKING

from pydantic import BaseModel, field_serializer, HttpUrl
from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    Boolean,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import DeclarativeBase, relationship, Mapped, mapped_column

if TYPE_CHECKING:
    from crawler_common.ftp_node import FTPNode


class Base(DeclarativeBase):
    pass


class FTPNodeProtocol(Protocol):
    """Protocol defining the common interface for FTP node-like objects."""

    name: str
    is_dir: bool
    path: str
    size: int | None
    modified: datetime | None


class CrawlRequest(BaseModel):
    """Request model for crawling a URL."""

    url: HttpUrl
    method: str = "GET"
    headers: Optional[dict[str, str]] = None
    timeout: int = 30


class CrawlResponse(BaseModel):
    """Response model from a crawl operation."""

    url: str
    status_code: int
    content: str
    content_type: Optional[str] = None
    timestamp: datetime = datetime.now(timezone.utc)
    duration_ms: float

    @field_serializer("timestamp")
    def serialize_timestamp(self, value: datetime) -> str:
        """Serialize timestamp to ISO format."""
        return value.isoformat()


# SQLAlchemy ORM Models for FTP Discovery Results
class FTPDiscoveryRun(Base):
    """Represents a single FTP discovery run."""

    __tablename__ = "ftp_discovery_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ftp_url: Mapped[str] = mapped_column(String(255), nullable=False)
    max_depth: Mapped[int] = mapped_column(Integer, default=3)
    entries: Mapped[list["FTPDiscoveryEntry"]] = relationship(
        "FTPDiscoveryEntry", back_populates="run"
    )


class FTPDiscoveryEntry(Base):
    """Represents a single file or directory discovered in FTP."""

    __tablename__ = "ftp_discovery_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("ftp_discovery_runs.id"), nullable=False
    )
    path: Mapped[str] = mapped_column(String(2048), nullable=False)
    is_dir: Mapped[bool] = mapped_column(Boolean, nullable=False)
    size: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    modified: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    depth: Mapped[int] = mapped_column(Integer, nullable=False)
    discovered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    run: Mapped["FTPDiscoveryRun"] = relationship(
        "FTPDiscoveryRun", back_populates="entries"
    )

    @classmethod
    def from_ftp_node(
        cls, node: "FTPNode", run_id: int, depth: int
    ) -> "FTPDiscoveryEntry":
        """Create a FTPDiscoveryEntry from a FTPNode.

        Args:
            node: FTPNode to convert.
            run_id: The FTPDiscoveryRun ID.
            depth: Current depth in the tree.

        Returns:
            A new FTPDiscoveryEntry instance.
        """
        return cls(
            run_id=int(run_id),
            path=str(node.path),
            name=str(node.name),
            is_dir=bool(node.is_dir),
            size=int(node.size) if node.size is not None else None,
            modified=node.modified,
            depth=int(depth),
        )
