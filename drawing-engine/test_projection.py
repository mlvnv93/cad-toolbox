from pathlib import Path

import pytest

from cad_drawing.bounds import calculate_bounding_box
from cad_drawing.model import DrawingModel
from cad_drawing.pdf import create_pdf
from cad_drawing.drawing_ir import DrawingBounds
from cad_drawing.drawing_views import drawing_views_from_files
from cad_drawing.scale import ScaleResult
from cad_drawing.projection import ProjectionType, calculate_view_placements
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
    bounds = {
        "front": DrawingBounds(0, 0, 40, 30),
        "top": DrawingBounds(0, 0, 30, 20),
        "bottom": DrawingBounds(0, 0, 35, 18),
        "left": DrawingBounds(0, 0, 25, 22),
        "right": DrawingBounds(0, 0, 28, 24),
    }
    third = calculate_view_placements(bounds, sheet, ProjectionType.THIRD_ANGLE)
    first = calculate_view_placements(bounds, sheet, ProjectionType.FIRST_ANGLE)

    assert third["top"].x == third["front"].x
    assert third["right"].y == third["front"].y
    assert third["top"].y > third["front"].y
    assert third["right"].x > third["front"].x
    assert first["bottom"].x == first["front"].x
    assert first["left"].y == first["front"].y
    assert first["bottom"].y > first["front"].y
    assert first["left"].x > first["front"].x


def test_projection_spacing_uses_actual_view_bounds() -> None:
    bounds = {
        "front": DrawingBounds(0, 0, 100, 20),
        "right": DrawingBounds(0, 0, 12, 20),
    }

    positions = calculate_view_placements(bounds, Sheet(), ProjectionType.THIRD_ANGLE)

    assert positions["right"].x - positions["front"].x == pytest.approx(66)
    assert positions["right"].y == positions["front"].y


def test_generated_view_bounds_are_scaled_and_aligned_from_geometry(tmp_path: Path) -> None:
    svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L100 0L100 50Z" /></svg>'
    views = {}
    for name in ("front", "top", "right"):
        path = tmp_path / f"{name}.svg"
        path.write_text(svg, encoding="utf-8")
        views[name] = path

    drawing_views = drawing_views_from_files(
        views,
        DrawingModel(
            scale=ScaleResult(1, 2, 0.5, "1:2", 50, 25, 0, "MM"),
            sheet=Sheet(paper_size="A3", orientation="landscape"),
        ),
    )

    assert drawing_views["front"].bounds.width == pytest.approx(50)
    assert drawing_views["front"].bounds.height == pytest.approx(25)
    assert drawing_views["top"].position.x == pytest.approx(drawing_views["front"].position.x)
    assert drawing_views["right"].position.y == pytest.approx(drawing_views["front"].position.y)


def test_selected_scale_rejects_views_that_do_not_fit() -> None:
    bounds = {"front": DrawingBounds(0, 0, 300, 300)}

    with pytest.raises(ValueError, match="do not fit"):
        calculate_view_placements(bounds, Sheet(), ProjectionType.THIRD_ANGLE)


def test_export_views_returns_all_supported_view_keys(tmp_path: Path) -> None:
    model = import_step(STEP_FILE)

    views = export_views(model, tmp_path / "views")

    assert set(views) == {"front", "back", "left", "right", "top", "bottom", "isometric"}
    assert all(path.exists() and path.stat().st_size > 0 for path in views.values())


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