from dataclasses import dataclass

from .scale import DrawingArea


PAPER_DIMENSIONS_MM: dict[str, tuple[float, float]] = {
    "A4": (210, 297),
    "A3": (297, 420),
    "A2": (420, 594),
    "A1": (594, 841),
}
ORIENTATIONS = {"portrait", "landscape"}


@dataclass(frozen=True)
class Sheet:
    paper_size: str = "A4"
    orientation: str = "portrait"

    def __post_init__(self) -> None:
        if self.paper_size not in PAPER_DIMENSIONS_MM:
            raise ValueError(f"Unsupported paper size: {self.paper_size}")
        if self.orientation not in ORIENTATIONS:
            raise ValueError(f"Unsupported orientation: {self.orientation}")

    @property
    def width_mm(self) -> float:
        width, height = PAPER_DIMENSIONS_MM[self.paper_size]
        return width if self.orientation == "portrait" else height

    @property
    def height_mm(self) -> float:
        width, height = PAPER_DIMENSIONS_MM[self.paper_size]
        return height if self.orientation == "portrait" else width

    @property
    def drawing_area(self) -> DrawingArea:
        return DrawingArea(width=self.width_mm, height=self.height_mm)