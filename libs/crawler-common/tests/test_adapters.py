import io
from pathlib import Path

from crawler_common.adapters.s3_adapter import S3Adapter
from crawler_common.ftp.ftp_node import SourceNode


class DummyBody:
    def __init__(self, data: bytes):
        self._data = data

    def read(self):
        return self._data


class DummyClient:
    def __init__(self, data: bytes):
        self._data = data

    def get_object(self, Bucket, Key):
        return {"Body": DummyBody(self._data)}

    def copy_object(self, CopySource, Bucket, Key):
        # pretend success
        return True

    def put_object(self, Bucket, Key, Body):
        # store somewhere if needed; for test just succeed
        return True


def test_s3adapter_download_to_file(tmp_path: Path, monkeypatch):
    data = b"hello world"
    client = DummyClient(data)
    adapter = S3Adapter(endpoint_url="http://example", bucket="src-b", prefix="")
    # inject dummy client
    adapter.client = client

    node = SourceNode(name="file.txt", is_dir=False, path="/file.txt")
    dest = tmp_path / "out.txt"
    res = adapter.download_to_uri(node, f"file://{dest}")
    assert res is True
    assert dest.read_bytes() == data
