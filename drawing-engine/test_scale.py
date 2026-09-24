from pathlib import Path

import pytest

from cad_drawing.bounds import calculate_bounding_box
from cad_drawing.scale import STANDARD_SCALES, DrawingArea, calculate_automatic_scale, scale_definition
from cad_drawing.step import import_step


STEP_FILE = Path(r"C:\Users\mlvnv\Downloads\800000182_1.stp")


def test_standard_scale_table_contains_required_options() -> None:
    assert STANDARD_SCALES == ((1, 1), (1, 2), (1, 3), (2, 1), (1, 10), (1, 15))


def test_scale_from_imported_step_fits_drawing_area() -> None:
    model = import_step(STEP_FILE)
    bounding_box = calculate_bounding_box(model)

    result = calculate_automatic_scale(
        bounding_box,
        DrawingArea(width=250, height=180),
    )

    assert result.label in {"1:1", "1:2", "1:3", "1:10", "1:15", "2:1"}
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


@pytest.mark.parametrize(
    ("label", "expected_factor"),
    [("1:1", 1), ("1:2", 0.5), ("1:3", 1 / 3), ("2:1", 2), ("1:10", 0.1), ("1:15", 1 / 15)],
)
def test_explicit_scale_definitions_preserve_model_dimensions(
    label: str,
    expected_factor: float,
) -> None:
    model = import_step(STEP_FILE)
    bounding_box = calculate_bounding_box(model)
    numerator, denominator = (int(value) for value in label.split(":"))

    result = scale_definition(numerator, denominator, bounding_box)

    assert result.factor == pytest.approx(expected_factor)
    assert result.x_length == pytest.approx(bounding_box.x_length * expected_factor)
    assert bounding_box.x_length != result.x_length or expected_factor == 1