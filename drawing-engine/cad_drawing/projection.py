from enum import StrEnum

from .drawing_ir import DrawingBounds, Point
from .sheet import Sheet


class ProjectionType(StrEnum):
    FIRST_ANGLE = "FIRST_ANGLE"
    THIRD_ANGLE = "THIRD_ANGLE"


VIEW_NAMES = ("front", "back", "left", "right", "top", "bottom", "isometric")


def _overlaps(a: DrawingBounds, b: DrawingBounds, gap: float, tolerance: float = 1e-6) -> bool:
    """Return True when two placed rectangles violate the required clear gap."""
    return not (
        a.max_x + gap <= b.min_x + tolerance
        or b.max_x + gap <= a.min_x + tolerance
        or a.max_y + gap <= b.min_y + tolerance
        or b.max_y + gap <= a.min_y + tolerance
    )


def _placed_bounds(bounds: DrawingBounds, center: Point) -> DrawingBounds:
    return DrawingBounds(
        min_x=center.x - bounds.width / 2,
        min_y=center.y - bounds.height / 2,
        max_x=center.x + bounds.width / 2,
        max_y=center.y + bounds.height / 2,
    )


def calculate_view_placements(
    bounds: dict[str, DrawingBounds],
    sheet: Sheet,
    projection_type: ProjectionType = ProjectionType.THIRD_ANGLE,
    minimum_gap: float = 10,
    validate_fit: bool = True,
) -> dict[str, Point]:
    """Place orthographic views from actual extents using shared projection datums.

    The front, horizontal companion views share a common horizontal datum and the
    front, vertical companion views share a common vertical datum. First-angle
    projection reverses the physical side of the left/right and top/bottom views;
    third-angle keeps them on their named side.
    """
    if minimum_gap < 0:
        raise ValueError("minimum_gap must not be negative")
    if not bounds or "front" not in bounds:
        return {}

    front = bounds["front"]
    if front.width <= 0 or front.height <= 0:
        raise ValueError("Front view must have positive extents")

    # ISO projection relationships: in first-angle the projected view appears on
    # the opposite physical side; in third-angle it remains on the named side.
    horizontal_left = "right" if projection_type == ProjectionType.FIRST_ANGLE else "left"
    horizontal_right = "left" if projection_type == ProjectionType.FIRST_ANGLE else "right"
    vertical_top = "bottom" if projection_type == ProjectionType.FIRST_ANGLE else "top"
    vertical_bottom = "top" if projection_type == ProjectionType.FIRST_ANGLE else "bottom"

    left = bounds.get(horizontal_left)
    right = bounds.get(horizontal_right)
    top = bounds.get(vertical_top)
    bottom = bounds.get(vertical_bottom)
    margin = 10.0

    # Establish one horizontal and one vertical projection datum from the front
    # view. Companion views are positioned from extents, never hard-coded slots.
    front_center = Point(
        margin
        + (left.width + minimum_gap if left else 0)
        + front.width / 2,
        margin
        + (bottom.height + minimum_gap if bottom else 0)
        + front.height / 2,
    )
    positions: dict[str, Point] = {"front": front_center}

    if left:
        positions[horizontal_left] = Point(
            front_center.x - front.width / 2 - minimum_gap - left.width / 2,
            front_center.y,
        )
    if right:
        positions[horizontal_right] = Point(
            front_center.x + front.width / 2 + minimum_gap + right.width / 2,
            front_center.y,
        )
    if top:
        positions[vertical_top] = Point(
            front_center.x,
            front_center.y + front.height / 2 + minimum_gap + top.height / 2,
        )
    if bottom:
        positions[vertical_bottom] = Point(
            front_center.x,
            front_center.y - front.height / 2 - minimum_gap - bottom.height / 2,
        )

    # Back and isometric are auxiliary views. Keep them in a deterministic row
    # above the principal arrangement, while still deriving their coordinates
    # entirely from their real extents.
    auxiliary = [name for name in ("back", "isometric") if name in bounds]
    auxiliary_x = margin
    auxiliary_y = margin
    for name in auxiliary:
        view = bounds[name]
        positions[name] = Point(
            auxiliary_x + view.width / 2,
            auxiliary_y + view.height / 2,
        )
        auxiliary_x += view.width + minimum_gap

    if not validate_fit:
        return positions

    tolerance = 1e-6
    placed_bounds = {name: _placed_bounds(bounds[name], center) for name, center in positions.items()}

    for name, view_bounds in placed_bounds.items():
        if (
            view_bounds.min_x < margin - tolerance
            or view_bounds.min_y < margin - tolerance
            or view_bounds.max_x > sheet.width_mm - margin + tolerance
            or view_bounds.max_y > sheet.height_mm - margin + tolerance
        ):
            raise ValueError("Selected views do not fit on the selected sheet at this scale")

    names = list(placed_bounds)
    for index, first_name in enumerate(names):
        for second_name in names[index + 1 :]:
            if _overlaps(placed_bounds[first_name], placed_bounds[second_name], minimum_gap, tolerance):
                raise ValueError(
                    f"Projection views '{first_name}' and '{second_name}' overlap or violate the minimum gap"
                )

    return positions


def orthographic_view_positions(
    sheet: Sheet,
    projection_type: ProjectionType = ProjectionType.THIRD_ANGLE,
) -> dict[str, tuple[float, float]]:
    """Compatibility helper for callers without generated geometry."""
    del projection_type
    return {name: (sheet.width_mm / 2, sheet.height_mm / 2) for name in VIEW_NAMES}