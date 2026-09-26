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


# Keep the UI order stable; automatic selection sorts by actual factor.
STANDARD_SCALES: tuple[tuple[int, int], ...] = (
    (1, 1),
    (1, 2),
    (1, 3),
    (2, 1),
    (1, 10),
    (1, 15),
)


def scale_definition(
    numerator: int,
    denominator: int,
    bounding_box: BoundingBox,
) -> ScaleResult:
    if numerator <= 0 or denominator <= 0:
        raise ValueError("Scale numerator and denominator must be positive")
    factor = numerator / denominator
    return ScaleResult(
        numerator=numerator,
        denominator=denominator,
        factor=factor,
        label=f"{numerator}:{denominator}",
        x_length=bounding_box.x_length * factor,
        y_length=bounding_box.y_length * factor,
        z_length=bounding_box.z_length * factor,
        unit=bounding_box.unit,
    )


def calculate_automatic_scale(
    bounding_box: BoundingBox,
    drawing_area: DrawingArea,
) -> ScaleResult:
    """Return the largest standard scale that fits the available drawing area."""
    if bounding_box.unit != "MM" or drawing_area.unit != "MM":
        raise ValueError("Automatic drawing scale requires millimetre units")
    if drawing_area.width <= 0 or drawing_area.height <= 0:
        raise ValueError("Drawing area dimensions must be positive")

    model_dimensions = sorted(
        (bounding_box.x_length, bounding_box.y_length, bounding_box.z_length),
        reverse=True,
    )
    area_dimensions = sorted(
        (drawing_area.width / 4, drawing_area.height / 3),
        reverse=True,
    )

    candidates = sorted(
        STANDARD_SCALES,
        key=lambda scale: scale[0] / scale[1],
        reverse=True,
    )
    for numerator, denominator in candidates:
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
