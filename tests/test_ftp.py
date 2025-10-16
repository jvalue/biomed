"""Tests for FTP crawling utilities."""

from jvalue_biomed.crawlers.ftp import parse_ftp_list_item


class TestParseFtpListItem:
    """Tests for parse_ftp_list_item function."""

    def test_parse_directory(self) -> None:
        """Test parsing a directory entry."""
        item = "drwxr-xr-x 2 ftp ftp 4096 Jan  1 12:00 genbank"
        result = parse_ftp_list_item(item)

        assert result is not None
        permissions, name = result
        assert permissions == "drwxr-xr-x"
        assert name == "genbank"

    def test_parse_file(self) -> None:
        """Test parsing a file entry."""
        item = "-rw-r--r-- 1 ftp ftp 1234 Jan  1 12:00 file.seq.gz"
        result = parse_ftp_list_item(item)

        assert result is not None
        permissions, name = result
        assert permissions == "-rw-r--r--"
        assert name == "file.seq.gz"

    def test_parse_with_spaces_in_name(self) -> None:
        """Test parsing an entry with spaces in the filename."""
        item = "-rw-r--r-- 1 ftp ftp 5678 Jan  1 12:00 file with spaces.txt"
        result = parse_ftp_list_item(item)

        assert result is not None
        permissions, name = result
        assert permissions == "-rw-r--r--"
        assert name == "file with spaces.txt"

    def test_parse_invalid_entry(self) -> None:
        """Test parsing an invalid entry with too few fields."""
        item = "invalid entry"
        result = parse_ftp_list_item(item)

        assert result is None

    def test_parse_current_directory(self) -> None:
        """Test that current directory (.) is skipped."""
        item = "drwxr-xr-x 2 ftp ftp 4096 Jan  1 12:00 ."
        result = parse_ftp_list_item(item)

        assert result is None

    def test_parse_parent_directory(self) -> None:
        """Test that parent directory (..) is skipped."""
        item = "drwxr-xr-x 2 ftp ftp 4096 Jan  1 12:00 .."
        result = parse_ftp_list_item(item)

        assert result is None

    def test_parse_symlink(self) -> None:
        """Test parsing a symbolic link entry."""
        item = "lrwxrwxrwx 1 ftp ftp 11 Jan  1 12:00 link -> target"
        result = parse_ftp_list_item(item)

        assert result is not None
        permissions, name = result
        assert permissions == "lrwxrwxrwx"
        # Note: The name includes the full "link -> target" part
        assert "link" in name
