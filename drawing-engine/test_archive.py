import hashlib
import os
from pathlib import Path
from zipfile import ZipFile

import pytest

from cad_drawing.archive import compress_cad_file, compress_cad_files


REAL_FIXTURE = os.environ.get("CAD_TEST_FIXTURE")


def test_compress_step_preserves_filename_and_bytes(tmp_path: Path) -> None:
    source = tmp_path / "sample.step"
    source_bytes = b"ISO-10303-21;\nexample CAD content\n"
    source.write_bytes(source_bytes)

    archive = compress_cad_file(source, tmp_path / "sample.zip")

    assert archive.exists()
    with ZipFile(archive) as zip_file:
        assert zip_file.namelist() == [source.name]
        assert zip_file.read(source.name) == source_bytes


def test_compress_defaults_to_zip_beside_source(tmp_path: Path) -> None:
    source = tmp_path / "part.stp"
    source.write_bytes(b"part")

    assert compress_cad_file(source) == tmp_path / "part.zip"


def test_missing_input_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        compress_cad_file(tmp_path / "missing.step")


def test_unsupported_input_is_rejected(tmp_path: Path) -> None:
    source = tmp_path / "part.iges"
    source.write_bytes(b"not supported")

    with pytest.raises(ValueError, match="Only STEP and STP"):
        compress_cad_file(source)


def test_compress_cad_files_returns_one_result_per_input(tmp_path: Path) -> None:
    first = tmp_path / "bracket.step"
    second = tmp_path / "plate.stp"
    invalid = tmp_path / "notes.iges"
    first.write_bytes(b"bracket")
    second.write_bytes(b"plate")
    invalid.write_bytes(b"unsupported")

    results = compress_cad_files([first, invalid, second], tmp_path / "batch")

    assert [result.input_file for result in results] == [first, invalid, second]
    assert [result.success for result in results] == [True, False, True]
    assert results[0].output_file == tmp_path / "batch" / "bracket.zip"
    assert results[1].output_file is None
    assert results[1].error == "Only STEP and STP files are supported."
    assert results[2].output_file == tmp_path / "batch" / "plate.zip"


def test_compress_cad_files_is_deterministic(tmp_path: Path) -> None:
    source = tmp_path / "part.step"
    source.write_bytes(b"deterministic CAD content")

    first = compress_cad_files([source], tmp_path / "first")[0]
    second = compress_cad_files([source], tmp_path / "second")[0]

    assert first.output_file is not None
    assert second.output_file is not None
    assert first.output_file.read_bytes() == second.output_file.read_bytes()


def test_real_fixture_compresses_and_round_trips(tmp_path: Path) -> None:
    if not REAL_FIXTURE:
        pytest.skip("CAD_TEST_FIXTURE is not set")

    source = Path(REAL_FIXTURE)
    if not source.exists():
        pytest.skip(f"CAD_TEST_FIXTURE does not exist: {source}")

    archive = compress_cad_file(source, tmp_path / "fixture.zip")
    with ZipFile(archive) as zip_file:
        assert zip_file.namelist() == [source.name]
        extracted = zip_file.read(source.name)

    original = source.read_bytes()
    assert extracted == original
    assert hashlib.sha256(extracted).digest() == hashlib.sha256(original).digest()