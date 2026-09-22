from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cadquery as cq

from cad_drawing.step import import_step


@dataclass(frozen=True)
class ConversionFormat:
    id: str
    label: str
    extension: str
    category: str
    description: str
    media_type: str

    def as_dict(self) -> dict[str, str]:
        return {
            "id": self.id,
            "label": self.label,
            "extension": self.extension,
            "category": self.category,
            "description": self.description,
        }


CONVERSION_FORMATS: tuple[ConversionFormat, ...] = (
    ConversionFormat("step", "STEP", ".step", "CAD", "3D B-Rep interchange", "model/step"),
    ConversionFormat("stl", "STL", ".stl", "Mesh", "3D mesh for manufacturing and printing", "model/stl"),
    ConversionFormat("amf", "AMF", ".amf", "Mesh", "Additive manufacturing mesh", "application/amf"),
    ConversionFormat("3mf", "3MF", ".3mf", "Mesh", "3D manufacturing mesh", "model/3mf"),
    ConversionFormat("tjs", "TJS", ".tjs", "Visualization", "Three.js scene mesh", "application/json"),
    ConversionFormat("vrml", "VRML", ".vrml", "Visualization", "Interactive 3D mesh", "model/vrml"),
    ConversionFormat("vtp", "VTP", ".vtp", "Visualization", "VTK polygonal data", "application/xml"),
    ConversionFormat("svg", "SVG", ".svg", "Drawing", "2D projected drawing representation", "image/svg+xml"),
)

_FORMAT_BY_ID = {format_info.id: format_info for format_info in CONVERSION_FORMATS}


class UnsupportedConversionFormat(ValueError):
    pass


def available_formats() -> list[dict[str, str]]:
    return [format_info.as_dict() for format_info in CONVERSION_FORMATS]


def get_conversion_format(output_format: str) -> ConversionFormat:
    format_info = _FORMAT_BY_ID.get(output_format.strip().lower())
    if format_info is None:
        raise UnsupportedConversionFormat(
            f"Output format '{output_format}' is not supported."
        )
    return format_info


def convert_step_file(
    input_file: str | Path,
    output_format: str,
    output_dir: str | Path,
) -> Path:
    source = Path(input_file)
    if source.suffix.lower() not in {".step", ".stp"}:
        raise ValueError("Only STEP/STP files are currently supported.")

    format_info = get_conversion_format(output_format)
    destination = Path(output_dir)
    destination.mkdir(parents=True, exist_ok=True)
    output_file = destination / f"{source.stem}{format_info.extension}"
    model = import_step(source)

    export_options: dict[str, Any] = {}
    if format_info.id in {"stl", "amf", "3mf", "tjs", "vrml", "vtp"}:
        export_options.update(tolerance=0.1, angularTolerance=0.1)

    model.export(str(output_file), **export_options)
    if not output_file.exists() or output_file.stat().st_size == 0:
        raise RuntimeError(f"CadQuery produced an empty {format_info.label} file.")
    return output_file
