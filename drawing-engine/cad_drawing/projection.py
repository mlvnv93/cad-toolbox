from enum import StrEnum

from .sheet import Sheet


class ProjectionType(StrEnum):
    FIRST_ANGLE = "FIRST_ANGLE"
    THIRD_ANGLE = "THIRD_ANGLE"


def orthographic_view_positions(
    sheet: Sheet,
    projection_type: ProjectionType = ProjectionType.THIRD_ANGLE,
) -> dict[str, tuple[float, float]]:
    view_width = 80
    view_height = 55
    left_x = 30
    right_x = min(left_x + 90, sheet.width_mm - 10 - view_width)
    front_y = max(85, min(105, sheet.height_mm - 30 - view_height - 65))
    top_y = front_y + 65
    bottom_y = 40

    if projection_type == ProjectionType.FIRST_ANGLE:
        return {
            "front": (right_x, front_y),
            "top": (left_x, bottom_y),
            "right": (left_x, front_y),
        }

    return {
        "front": (left_x, front_y),
        "top": (left_x, top_y),
        "right": (right_x, front_y),
    }