"""Tests for crawler main entrypoint."""

from pathlib import Path

from crawler_common.ftp.ftp_node import FTPNode
from crawler_general.main import main


def test_creates_output_file(tmp_path, monkeypatch):
    """Ensure main writes an output file when invoked."""

    # Configure temp output path via env
    out_file = tmp_path / "ftp_structure.txt"
    monkeypatch.setenv("FTP_STRUCTURE_FILE", str(out_file))

    # Stub env loader to avoid real .env dependency
    monkeypatch.setattr(
        "crawler_general.main.ftp_conf.load_env_vars",
        lambda *_: ("ftp.example.com", "user", "pass"),
    )

    # Stub traversal to avoid network
    fake_root = FTPNode(name="/", is_dir=True, path="/")
    monkeypatch.setattr(
        "crawler_general.main.ftp_tools.get_ftp_structure",
        lambda *_, **__: fake_root,
    )

    # Stub writer to actually create the file
    def fake_write(root: FTPNode, dest: str) -> None:
        Path(dest).write_text("dummy")

    monkeypatch.setattr(
        "crawler_general.main.ftp_tools.write_ftp_structure_to_file",
        fake_write,
    )

    main()

    assert out_file.exists()
