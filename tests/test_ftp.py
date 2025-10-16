"""Tests for FTP crawling utilities."""

from jvalue_biomed.crawlers.ftp import (
    filter_by_extension,
    ftp_path_join,
    is_ftp_directory,
    is_ftp_file,
    parse_ftp_list_item,
)


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


class TestIsFtpDirectory:
    """Tests for is_ftp_directory function."""

    def test_directory_permissions(self) -> None:
        """Test that directory permissions are recognized."""
        assert is_ftp_directory("drwxr-xr-x") is True

    def test_file_permissions(self) -> None:
        """Test that file permissions return False."""
        assert is_ftp_directory("-rw-r--r--") is False

    def test_symlink_permissions(self) -> None:
        """Test that symlink permissions return False."""
        assert is_ftp_directory("lrwxrwxrwx") is False


class TestIsFtpFile:
    """Tests for is_ftp_file function."""

    def test_file_permissions(self) -> None:
        """Test that file permissions are recognized."""
        assert is_ftp_file("-rw-r--r--") is True

    def test_directory_permissions(self) -> None:
        """Test that directory permissions return False."""
        assert is_ftp_file("drwxr-xr-x") is False

    def test_symlink_permissions(self) -> None:
        """Test that symlink permissions return False."""
        assert is_ftp_file("lrwxrwxrwx") is False


class TestFtpPathJoin:
    """Tests for ftp_path_join function."""

    def test_join_regular_paths(self) -> None:
        """Test joining regular paths."""
        assert ftp_path_join("/genbank", "data") == "/genbank/data"

    def test_join_with_root(self) -> None:
        """Test joining with root directory."""
        assert ftp_path_join("/", "genbank") == "/genbank"

    def test_join_nested_path(self) -> None:
        """Test joining nested paths."""
        assert ftp_path_join("/genbank/data", "file.gz") == "/genbank/data/file.gz"

    def test_join_with_trailing_slash(self) -> None:
        """Test that trailing slash is not added when not at root."""
        result = ftp_path_join("/genbank", "subdir")
        assert not result.endswith("//")


class TestFilterByExtension:
    """Tests for filter_by_extension function."""

    def test_single_extension_match(self) -> None:
        """Test filtering with a single extension that matches."""
        filter_fn = filter_by_extension(".seq.gz")
        assert filter_fn("-rw-r--r--", "file.seq.gz", "/genbank/file.seq.gz") is True

    def test_single_extension_no_match(self) -> None:
        """Test filtering with a single extension that doesn't match."""
        filter_fn = filter_by_extension(".seq.gz")
        assert filter_fn("-rw-r--r--", "file.txt", "/genbank/file.txt") is False

    def test_multiple_extensions(self) -> None:
        """Test filtering with multiple extensions."""
        filter_fn = filter_by_extension([".fa", ".fasta", ".gbk"])
        assert filter_fn("-rw-r--r--", "seq.fasta", "/data/seq.fasta") is True
        assert filter_fn("-rw-r--r--", "seq.fa", "/data/seq.fa") is True
        assert filter_fn("-rw-r--r--", "seq.gbk", "/data/seq.gbk") is True
        assert filter_fn("-rw-r--r--", "seq.txt", "/data/seq.txt") is False

    def test_case_insensitive_default(self) -> None:
        """Test that extension matching is case-insensitive by default."""
        filter_fn = filter_by_extension(".GZ")
        assert filter_fn("-rw-r--r--", "file.gz", "/data/file.gz") is True
        assert filter_fn("-rw-r--r--", "file.GZ", "/data/file.GZ") is True

    def test_case_sensitive(self) -> None:
        """Test case-sensitive extension matching."""
        filter_fn = filter_by_extension(".GZ", case_sensitive=True)
        assert filter_fn("-rw-r--r--", "file.GZ", "/data/file.GZ") is True
        assert filter_fn("-rw-r--r--", "file.gz", "/data/file.gz") is False

    def test_filter_ignores_permissions(self) -> None:
        """Test that filter works regardless of permissions."""
        filter_fn = filter_by_extension(".txt")
        assert filter_fn("drwxr-xr-x", "file.txt", "/data/file.txt") is True
        assert filter_fn("-rw-r--r--", "file.txt", "/data/file.txt") is True
        assert filter_fn("lrwxrwxrwx", "file.txt", "/data/file.txt") is True
