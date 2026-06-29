"""Database (SQLAlchemy) models for crawler persistence."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from crawler_common.ftp.ftp_node import FTPNode


class Base(DeclarativeBase):
    pass


class FTPDiscoveryRun(Base):
    """Represents a single FTP discovery run."""

    __tablename__ = "ftp_discovery_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ftp_url: Mapped[str] = mapped_column(String(255), nullable=False)
    db_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    max_depth: Mapped[int] = mapped_column(Integer, default=3)
    entries: Mapped[list["FTPDiscoveryEntry"]] = relationship(
        "FTPDiscoveryEntry", back_populates="run", cascade="all, delete-orphan"
    )


class FTPDiscoveryEntry(Base):
    """Represents a single file or directory discovered in FTP."""

    __tablename__ = "ftp_discovery_entries"
    __table_args__ = (
        Index("ix_ftp_discovery_entries_run_path", "run_id", "path", "is_dir"),
    )

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
    downloaded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
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
            is_dir=bool(node.is_dir),
            size=int(node.size) if node.size is not None else None,
            modified=node.modified,
            depth=int(depth),
            downloaded=False,
        )
