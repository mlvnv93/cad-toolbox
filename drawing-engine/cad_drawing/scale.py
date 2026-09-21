from dataclasses import dataclass

from .bounds import BoundingBox


@dataclass(frozen=True)
class DrawingArea:
    width: float
    height: float
    unit: str = "MM"


@dataclass(frozen=True)
class ScaleResult:
    numerator: int
    denominator: int
    factor: float
    label: str
    x_length: float
    y_length: float
    z_length: float
    unit: str


STANDARD_SCALES: tuple[tuple[int, int], ...] = (
    (5, 1),
    (2, 1),
    (1, 1),
    (1, 2),
    (1, 5),
    (1, 10),
)


def calculate_automatic_scale(
    bounding_box: BoundingBox,
    drawing_area: DrawingArea,
) -> ScaleResult:
    """Return the largest standard scale that fits every principal view."""
    if bounding_box.unit != "MM" or drawing_area.unit != "MM":
        raise ValueError("Automatic drawing scale requires millimetre units")
    if drawing_area.width <= 0 or drawing_area.height <= 0:
        raise ValueError("Drawing area dimensions must be positive")

    model_dimensions = sorted(
        (bounding_box.x_length, bounding_box.y_length, bounding_box.z_length),
        reverse=True,
    )
    area_dimensions = sorted(
        (drawing_area.width, drawing_area.height),
        reverse=True,
    )

    for numerator, denominator in STANDARD_SCALES:
        factor = numerator / denominator
        if all(
            dimension * factor <= available
            for dimension, available in zip(model_dimensions[:2], area_dimensions)
        ):
            return ScaleResult(
                numerator=numerator,
                denominator=denominator,
                factor=factor,
                label=f"{numerator}:{denominator}",
                x_length=bounding_box.x_length * factor,
                y_length=bounding_box.y_length * factor,
                z_length=bounding_box.z_length * factor,
                unit="MM",
            )

    raise ValueError("Model does not fit the drawing area at the smallest standard scale")