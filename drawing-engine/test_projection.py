from pathlib import Path

import pytest

from cad_drawing.bounds import calculate_bounding_box
from cad_drawing.model import DrawingModel
from cad_drawing.pdf import create_pdf
from cad_drawing.projection import ProjectionType, orthographic_view_positions
from cad_drawing.scale import calculate_automatic_scale
from cad_drawing.sheet import Sheet
from cad_drawing.step import import_step
from cad_drawing.views import export_views


STEP_FILE = Path(r"C:\Users\mlvnv\Downloads\800000182_1.stp")


def test_drawing_model_defaults_to_third_angle() -> None:
    model = import_step(STEP_FILE)
    scale = calculate_automatic_scale(
        calculate_bounding_box(model),
        Sheet().drawing_area,
    )

    assert DrawingModel(scale=scale).projection_type == ProjectionType.THIRD_ANGLE


@pytest.mark.parametrize("projection_type", ProjectionType)
def test_drawing_model_accepts_supported_projection_types(
    projection_type: ProjectionType,
) -> None:
    model = import_step(STEP_FILE)
    scale = calculate_automatic_scale(
        calculate_bounding_box(model),
        Sheet().drawing_area,
    )

    assert DrawingModel(scale=scale, projection_type=projection_type).projection_type == projection_type


def test_drawing_model_rejects_invalid_projection_type() -> None:
    model = import_step(STEP_FILE)
    scale = calculate_automatic_scale(
        calculate_bounding_box(model),
        Sheet().drawing_area,
    )

    with pytest.raises(ValueError, match="Unsupported projection type"):
        DrawingModel(scale=scale, projection_type="SECOND_ANGLE")  # type: ignore[arg-type]


def test_projection_types_reverse_orthographic_arrangement() -> None:
    sheet = Sheet()
    third = orthographic_view_positions(sheet, ProjectionType.THIRD_ANGLE)
    first = orthographic_view_positions(sheet, ProjectionType.FIRST_ANGLE)

    assert third["top"][1] > third["front"][1]
    assert third["right"][0] > third["front"][0]
    assert first["top"][1] < first["front"][1]
    assert first["right"][0] < first["front"][0]


def test_first_angle_pdf_generation_succeeds(tmp_path: Path) -> None:
    model = import_step(STEP_FILE)
    views = export_views(model, tmp_path / "views")
    drawing_model = DrawingModel(
        scale=calculate_automatic_scale(
            calculate_bounding_box(model),
            Sheet().drawing_area,
        ),
        projection_type=ProjectionType.FIRST_ANGLE,
    )
    pdf_file = tmp_path / "first-angle.pdf"

    create_pdf(views, pdf_file, "800000182_1", drawing_model)

    assert pdf_file.exists()
    assert pdf_file.stat().st_size > 0