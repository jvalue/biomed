"""Tests for the CrawlerRunner using a dummy adapter."""

from crawler_common.ftp.ftp_node import FTPNode
from crawler_common.source_adapter import SourceAdapter
from crawler_common.runner import CrawlerRunner
from crawler_common.database import init_database, get_session
from crawler_common.models.db import Base, FTPDiscoveryEntry
from sqlalchemy import select
from typing import Iterator, Tuple


class DummyAdapter:
    def __init__(self, tree_root: FTPNode):
        self.tree_root = tree_root

    def list_roots(self):
        return [self.tree_root.path]

    def iter_nodes(self, root=None, max_depth: int = 3) -> Iterator[Tuple[FTPNode, int]]:
        # yield nodes in pre-order
        def walk(node: FTPNode, depth: int):
            yield node, depth
            for child in node.children:
                yield from walk(child, depth + 1)

        yield from walk(self.tree_root, 0)

    def download(self, node, dest):
        return False

    def fetch_metadata(self, node):
        return node


def test_runner_inserts_tree_into_db():
    engine = init_database("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = get_session(engine)

    root = FTPNode(name="/", is_dir=True, path="/")
    a = FTPNode(name="a", is_dir=True, path="/a")
    f1 = FTPNode(name="file1", is_dir=False, path="/a/file1", size=10)
    a.children.append(f1)
    root.children.append(a)

    adapter = DummyAdapter(root)
    runner = CrawlerRunner(adapter=adapter, session=session, run_id=7)
    runner.run()
    session.commit()

    rows = session.execute(select(FTPDiscoveryEntry)).scalars().all()
    paths = sorted(r.path for r in rows)
    assert "/" in paths
    assert "/a" in paths
    assert "/a/file1" in paths
