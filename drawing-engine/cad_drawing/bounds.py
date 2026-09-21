from dataclasses import dataclass

import cadquery as cq


@dataclass(frozen=True)
class BoundingBox:
    xmin: float
    ymin: float
    zmin: float
    xmax: float
    ymax: float
    zmax: float
    x_length: float
    y_length: float
    z_length: float
    unit: str


def calculate_bounding_box(model: cq.Workplane) -> BoundingBox:
    """Calculate the geometric bounds of an imported CadQuery model."""
    bounds = model.val().BoundingBox()

    return BoundingBox(
        xmin=bounds.xmin,
        ymin=bounds.ymin,
        zmin=bounds.zmin,
        xmax=bounds.xmax,
        ymax=bounds.ymax,
        zmax=bounds.zmax,
        x_length=bounds.xlen,
        y_length=bounds.ylen,
        z_length=bounds.zlen,
        unit="MM",
    )