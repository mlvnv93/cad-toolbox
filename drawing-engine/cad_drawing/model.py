from dataclasses import dataclass

from .scale import ScaleResult
from .sheet import Sheet
from .projection import ProjectionType


@dataclass(frozen=True)
class DrawingModel:
    """Format-independent drawing data passed to exporters."""

    scale: ScaleResult
    sheet: Sheet = Sheet()
    projection_type: ProjectionType = ProjectionType.THIRD_ANGLE

    def __post_init__(self) -> None:
        if not isinstance(self.projection_type, ProjectionType):
            try:
                object.__setattr__(
                    self,
                    "projection_type",
                    ProjectionType(self.projection_type),
                )
            except ValueError as exc:
                raise ValueError(
                    f"Unsupported projection type: {self.projection_type}"
                ) from exc