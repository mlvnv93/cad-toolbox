from dataclasses import dataclass


@dataclass(frozen=True)
class DrawingCoordinateSpace:
    """Authoritative drawing-space coordinate contract.

    Model geometry enters this boundary in millimetres. The drawing engine
    stores and places geometry in drawing-space millimetres. Scale is applied
    exactly once at this boundary; renderers must not rescale model geometry.
    """

    scale_factor: float
    unit: str = "MM"

    def __post_init__(self) -> None:
        if self.unit != "MM":
            raise ValueError("Drawing coordinate space requires millimetre units")
        if self.scale_factor <= 0:
            raise ValueError("Drawing scale factor must be positive")

    def model_to_drawing(self, value: float) -> float:
        return value * self.scale_factor

    def point_to_drawing(self, x: float, y: float) -> tuple[float, float]:
        return self.model_to_drawing(x), self.model_to_drawing(y)
