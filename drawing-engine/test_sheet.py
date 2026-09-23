from pathlib import Path
import re

import pytest

from cad_drawing.bounds import calculate_bounding_box
from cad_drawing.model import DrawingModel
from cad_drawing.pdf import create_pdf
from cad_drawing.scale import calculate_automatic_scale
from cad_drawing.sheet import Sheet
from cad_drawing.step import import_step
from cad_drawing.views import export_views


STEP_FILE = Path(r"C:\Users\mlvnv\Downloads\800000182_1.stp")


@pytest.mark.parametrize(
    ("paper_size", "orientation", "expected"),
    [
        ("A4", "portrait", (210, 297)),
        ("A4", "landscape", (297, 210)),
        ("A3", "portrait", (297, 420)),
        ("A2", "portrait", (420, 594)),
        ("A1", "portrait", (594, 841)),
    ],
)
def test_sheet_dimensions(paper_size: str, orientation: str, expected: tuple[int, int]) -> None:
    sheet = Sheet(paper_size=paper_size, orientation=orientation)

    assert (sheet.width_mm, sheet.height_mm) == expected


def test_sheet_rejects_invalid_paper_size() -> None:
    with pytest.raises(ValueError, match="Unsupported paper size"):
        Sheet(paper_size="A0")


def test_sheet_rejects_invalid_orientation() -> None:
    with pytest.raises(ValueError, match="Unsupported orientation"):
        Sheet(orientation="diagonal")


def test_drawing_model_defaults_to_a4_portrait() -> None:
    model = import_step(STEP_FILE)
    scale = calculate_automatic_scale(
        calculate_bounding_box(model),
        Sheet().drawing_area,
    )

    assert DrawingModel(scale=scale).sheet == Sheet()


def test_scale_can_use_oriented_sheet_dimensions() -> None:
    model = import_step(STEP_FILE)
    bounding_box = calculate_bounding_box(model)
    sheet = Sheet(paper_size="A4", orientation="landscape")

    scale = calculate_automatic_scale(bounding_box, sheet.drawing_area)

    assert scale.factor > 0
    assert scale.x_length <= sheet.width_mm
    assert scale.y_length <= sheet.height_mm


def test_default_sheet_generates_pdf_from_real_step(tmp_path: Path) -> None:
    model = import_step(STEP_FILE)
    views = export_views(model, tmp_path / "views")
    drawing_model = DrawingModel(
        scale=calculate_automatic_scale(
            calculate_bounding_box(model),
            Sheet().drawing_area,
        ),
    )
    pdf_file = tmp_path / "drawing.pdf"

    create_pdf(views, pdf_file, "800000182_1", drawing_model)

    assert pdf_file.exists()
    assert pdf_file.stat().st_size > 0


@pytest.mark.parametrize(
    ("sheet", "expected_dimensions"),
    [
        (Sheet(), (210, 297)),
        (Sheet(paper_size="A3", orientation="landscape"), (420, 297)),
    ],
)
def test_pdf_page_dimensions_follow_selected_sheet(
    tmp_path: Path,
    sheet: Sheet,
    expected_dimensions: tuple[int, int],
) -> None:
    svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm"><rect width="10" height="10" /></svg>'
    views = {}
    for name in ("front", "top", "right"):
        view_file = tmp_path / f"{name}.svg"
        view_file.write_text(svg, encoding="utf-8")
        views[name] = view_file

    imported_model = import_step(STEP_FILE)
    model = DrawingModel(
        scale=calculate_automatic_scale(
            calculate_bounding_box(imported_model),
            Sheet().drawing_area,
        ),
        sheet=sheet,
    )
    pdf_file = tmp_path / "drawing.pdf"
    create_pdf(views, pdf_file, "part", model)

    pdf_text = pdf_file.read_bytes().decode("latin-1")
    media_box = re.search(
        r"/MediaBox\s+\[\s+0\s+0\s+([\d.]+)\s+([\d.]+)\s+\]",
        pdf_text,
    )
    assert media_box is not None
    page_width, page_height = (float(value) for value in media_box.groups())
    expected_width = expected_dimensions[0] * 72 / 25.4
    expected_height = expected_dimensions[1] * 72 / 25.4
    assert page_width == pytest.approx(expected_width, abs=0.01)
    assert page_height == pytest.approx(expected_height, abs=0.01)