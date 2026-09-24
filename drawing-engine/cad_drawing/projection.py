from enum import StrEnum

from .drawing_ir import DrawingBounds, Point
from .sheet import Sheet


class ProjectionType(StrEnum):
    FIRST_ANGLE = "FIRST_ANGLE"
    THIRD_ANGLE = "THIRD_ANGLE"

VIEW_NAMES = ("front", "back", "left", "right", "top", "bottom", "isometric")

def calculate_view_placements(
    bounds: dict[str, DrawingBounds],
    sheet: Sheet,
    projection_type: ProjectionType = ProjectionType.THIRD_ANGLE,
    minimum_gap: float = 10,
    validate_fit: bool = True,
) -> dict[str, Point]:
    """Place views from actual extents using common projection datums."""
    if not bounds or "front" not in bounds:
        return {}

    front = bounds["front"]
    left_name = "right" if projection_type == ProjectionType.FIRST_ANGLE else "left"
    right_name = "left" if projection_type == ProjectionType.FIRST_ANGLE else "right"
    top_name = "bottom" if projection_type == ProjectionType.FIRST_ANGLE else "top"
    bottom_name = "top" if projection_type == ProjectionType.FIRST_ANGLE else "bottom"
    left = bounds.get(left_name)
    right = bounds.get(right_name)
    top = bounds.get(top_name)
    bottom = bounds.get(bottom_name)
    margin = 10

    left_width = left.width if left else 0
    right_width = right.width if right else 0
    top_height = top.height if top else 0
    bottom_height = bottom.height if bottom else 0
    front_center = Point(
        margin + left_width + (minimum_gap if left else 0) + front.width / 2,
        margin + bottom_height + (minimum_gap if bottom else 0) + front.height / 2,
    )
    positions: dict[str, Point] = {"front": front_center}

    if left:
        positions[left_name] = Point(
            front_center.x - front.width / 2 - minimum_gap - left.width / 2,
            front_center.y,
        )
    if right:
        positions[right_name] = Point(
            front_center.x + front.width / 2 + minimum_gap + right.width / 2,
            front_center.y,
        )
    if top:
        positions[top_name] = Point(
            front_center.x,
            front_center.y + front.height / 2 + minimum_gap + top.height / 2,
        )
    if bottom:
        positions[bottom_name] = Point(
            front_center.x,
            front_center.y - front.height / 2 - minimum_gap - bottom.height / 2,
        )

    auxiliary_x = margin
    auxiliary_y = front_center.y + front.height / 2 + minimum_gap
    for name in ("back", "isometric"):
        if name in bounds:
            view = bounds[name]
            positions[name] = Point(auxiliary_x + view.width / 2, auxiliary_y + view.height / 2)
            auxiliary_x += view.width + minimum_gap

    if not validate_fit:
        return positions
    tolerance = 1e-6
    for name, center in positions.items():
        view = bounds[name]
        if (
            center.x - view.width / 2 < margin - tolerance
            or center.y - view.height / 2 < margin - tolerance
            or center.x + view.width / 2 > sheet.width_mm - margin + tolerance
            or center.y + view.height / 2 > sheet.height_mm - margin + tolerance
        ):
            raise ValueError("Selected views do not fit on the selected sheet at this scale")
    return positions


def orthographic_view_positions(
    sheet: Sheet,
    projection_type: ProjectionType = ProjectionType.THIRD_ANGLE,
) -> dict[str, tuple[float, float]]:
    """Compatibility helper for callers without generated geometry."""
    del projection_type
    return {name: (sheet.width_mm / 2, sheet.height_mm / 2) for name in VIEW_NAMES}