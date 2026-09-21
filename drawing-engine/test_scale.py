from pathlib import Path

from cad_drawing.bounds import calculate_bounding_box
from cad_drawing.scale import DrawingArea, calculate_automatic_scale
from cad_drawing.step import import_step


STEP_FILE = Path(r"C:\Users\mlvnv\Downloads\800000182_1.stp")


def test_scale_from_imported_step_fits_drawing_area() -> None:
    model = import_step(STEP_FILE)
    bounding_box = calculate_bounding_box(model)

    result = calculate_automatic_scale(
        bounding_box,
        DrawingArea(width=250, height=180),
    )

    assert result.label in {"1:1", "1:2", "1:5", "1:10", "2:1", "5:1"}
    scaled_dimensions = sorted(
        (result.x_length, result.y_length, result.z_length),
        reverse=True,
    )
    assert scaled_dimensions[0] <= 250
    assert scaled_dimensions[1] <= 180


def test_scale_adapts_to_smaller_and_larger_areas() -> None:
    model = import_step(STEP_FILE)
    bounding_box = calculate_bounding_box(model)

    small = calculate_automatic_scale(
        bounding_box,
        DrawingArea(width=100, height=80),
    )
    large = calculate_automatic_scale(
        bounding_box,
        DrawingArea(width=1000, height=800),
    )

    assert small.factor <= large.factor