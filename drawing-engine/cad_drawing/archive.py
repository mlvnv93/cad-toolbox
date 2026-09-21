from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


SUPPORTED_CAD_SUFFIXES = {".step", ".stp"}


@dataclass(frozen=True)
class CadConversionResult:
    input_file: Path
    output_file: Path | None
    success: bool
    error: str | None = None


def compress_cad_file(
    input_file: str | Path,
    output_file: str | Path | None = None,
) -> Path:
    """Compress a STEP/STP file into a ZIP archive without changing its bytes."""
    source = Path(input_file)

    if not source.exists():
        raise FileNotFoundError(f"CAD file not found: {source}")
    if not source.is_file():
        raise ValueError(f"CAD input is not a file: {source}")
    if source.suffix.lower() not in SUPPORTED_CAD_SUFFIXES:
        raise ValueError("Only STEP and STP files are supported.")

    archive = Path(output_file) if output_file is not None else source.with_suffix(".zip")
    archive.parent.mkdir(parents=True, exist_ok=True)

    archive_entry = ZipInfo(source.name, date_time=(1980, 1, 1, 0, 0, 0))
    archive_entry.compress_type = ZIP_DEFLATED
    archive_entry.create_system = 3
    archive_entry.external_attr = 0o600 << 16

    with ZipFile(archive, mode="w", compression=ZIP_DEFLATED) as zip_file:
        zip_file.writestr(archive_entry, source.read_bytes())

    return archive


def compress_cad_files(
    input_files: Iterable[str | Path],
    output_dir: str | Path,
) -> list[CadConversionResult]:
    """Compress supported CAD files independently and report each result."""
    destination = Path(output_dir)
    destination.mkdir(parents=True, exist_ok=True)
    used_names: set[str] = set()
    results: list[CadConversionResult] = []

    for input_file in input_files:
        source = Path(input_file)
        output_name = f"{source.stem}.zip"
        suffix = 2
        while output_name in used_names:
            output_name = f"{source.stem}_{suffix}.zip"
            suffix += 1
        used_names.add(output_name)
        output_file = destination / output_name

        try:
            archive = compress_cad_file(source, output_file)
        except Exception as exc:
            results.append(
                CadConversionResult(
                    input_file=source,
                    output_file=None,
                    success=False,
                    error=str(exc),
                )
            )
        else:
            results.append(
                CadConversionResult(
                    input_file=source,
                    output_file=archive,
                    success=True,
                )
            )

    return results