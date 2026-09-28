"""Tests for downloader_general main entrypoint."""

import importlib

downloader_main = importlib.import_module("downloader_general.src.main")


def test_main_limits_downloads_per_folder(monkeypatch):
    """Ensure the debug folder cap skips extra files in the same folder only."""

    monkeypatch.setattr("downloader_general.src.main.load_dotenv", lambda *_: None)
    monkeypatch.setattr(
        "downloader_general.src.main.get_database_url_from_env",
        lambda *_: object(),
    )
    monkeypatch.setattr(
        "downloader_general.src.main.init_database",
        lambda *_args, **_kwargs: object(),
    )

    class FakeScalars:
        def first(self):
            return None

    class FakeExecuteResult:
        def scalars(self):
            return FakeScalars()

    class FakeSession:
        def execute(self, _statement):
            return FakeExecuteResult()

        def commit(self):
            return None

        def close(self):
            return None

    class FakeS3Client:
        def put_object(self, **_kwargs):
            return None

    monkeypatch.setattr(
        "downloader_general.src.main.get_session",
        lambda _engine: FakeSession(),
    )

    class FakeResponse:
        def __init__(self):
            self.headers = {"Content-Length": "4"}
            self._reads = [b"test", b""]

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def read(self, _size):
            return self._reads.pop(0)

    requested_urls: list[str] = []

    def fake_urlopen(url, timeout):
        requested_urls.append(url)
        return FakeResponse()

    monkeypatch.setattr("downloader_general.src.main.urlopen", fake_urlopen)
    monkeypatch.setattr(
        "downloader_general.src.main.create_s3_client",
        lambda **_kwargs: FakeS3Client(),
    )
    monkeypatch.setattr(
        downloader_main,
        "consume_download_urls",
        lambda **kwargs: (
            kwargs["on_download_url"]("ftp://example.com/folder-a/file-1.txt", 1),
            kwargs["on_download_url"]("ftp://example.com/folder-a/file-2.txt", 1),
            kwargs["on_download_url"]("ftp://example.com/folder-b/file-3.txt", 1),
        ),
    )
    monkeypatch.setenv("DOWNLOAD_DEBUG_MAX_FILES_PER_FOLDER", "1")

    downloader_main.main()

    assert requested_urls == [
        "ftp://example.com/folder-a/file-1.txt",
        "ftp://example.com/folder-b/file-3.txt",
    ]
