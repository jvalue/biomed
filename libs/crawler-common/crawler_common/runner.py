"""Crawler runner that uses SourceAdapter implementations to discover and persist nodes."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

from sqlalchemy.orm import Session

from crawler_common.database.database import insert_ftp_nodes_to_database
from crawler_common.ftp.ftp_node import SourceNode
from crawler_common.source_adapter import SourceAdapter


class CrawlerRunner:
    """Orchestrates discovery using a `SourceAdapter` and persists results.

    The runner constructs an in-memory tree from adapter node listings and
    delegates persistence to `insert_ftp_nodes_to_database`.
    """

    def __init__(self, adapter: SourceAdapter, session: Session, run_id: int) -> None:
        self.adapter = adapter
        self.session = session
        self.run_id = run_id

    def _build_tree_from_nodes(
        self, nodes: Iterator[tuple[SourceNode, int]]
    ) -> SourceNode:
        """Build a hierarchical tree of `FTPNode` instances from flat `(node, depth)` pairs.

        This uses path-based parent detection: the parent of `/a/b/c` is `/a/b`.
        For non-slash paths (e.g. S3 keys) a leading slash is inserted for
        consistent parent lookup.
        """
        node_map: dict[str, SourceNode] = {}

        def normalize_path(p: str) -> str:
            return p if p.startswith("/") else f"/{p}"

        root = SourceNode(name="/", is_dir=True, path="/")
        node_map[root.path] = root

        for node, _depth in nodes:
            path = normalize_path(node.path)

            # If this node is the root path, update root metadata and continue
            if path == root.path:
                root.name = node.name or root.name
                root.is_dir = node.is_dir or root.is_dir
                root.size = node.size
                root.modified = node.modified
                node_map[path] = root
                continue

            # clone node but ensure no children (we'll attach via map)
            cloned = SourceNode(
                name=node.name,
                is_dir=node.is_dir,
                path=path,
                size=node.size,
                modified=node.modified,
            )
            node_map[path] = cloned

            # determine parent
            parent_path = str(Path(path).parent)
            if parent_path == ".":
                parent_path = "/"
            parent_path = normalize_path(parent_path)

            parent = node_map.get(parent_path)
            if parent is None:
                # create missing intermediate nodes as directories
                parent = SourceNode(
                    name=Path(parent_path).name or "/", is_dir=True, path=parent_path
                )
                node_map[parent_path] = parent

            if parent is not cloned:
                parent.children.append(cloned)

        return root

    def run(
        self,
        root: str | None = None,
        max_depth: int = 3,
        batch_size: int = 500,
        only_changed: bool = True,
    ) -> None:
        """Run discovery and persist results.

        Args:
            root: Optional adapter-specific root identifier.
            max_depth: How deep to traverse.
            batch_size: Batch size passed to persistence helper.
            only_changed: Pass-through to persistence helper.
        """
        nodes_iter = self.adapter.iter_nodes(root=root, max_depth=max_depth)
        tree_root = self._build_tree_from_nodes(nodes_iter)

        insert_ftp_nodes_to_database(
            node=tree_root,
            run_id=self.run_id,
            session=self.session,
            current_depth=0,
            batch_size=batch_size,
            only_changed=only_changed,
        )
