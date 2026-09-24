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
    custom_width_mm: float | None = None
    custom_height_mm: float | None = None

    def __post_init__(self) -> None:
        if self.paper_size != "Custom" and self.paper_size not in PAPER_DIMENSIONS_MM:
            raise ValueError(f"Unsupported paper size: {self.paper_size}")
        if self.orientation not in ORIENTATIONS:
            raise ValueError(f"Unsupported orientation: {self.orientation}")
        if self.paper_size == "Custom":
            if self.custom_width_mm is None or self.custom_height_mm is None:
                raise ValueError("Custom paper size requires width and height")
            if self.custom_width_mm < 10 or self.custom_height_mm < 10:
                raise ValueError("Custom paper dimensions must be at least 10 mm")
            if self.custom_width_mm > 5000 or self.custom_height_mm > 5000:
                raise ValueError("Custom paper dimensions must not exceed 5000 mm")

    @property
    def width_mm(self) -> float:
        if self.paper_size == "Custom":
            assert self.custom_width_mm is not None and self.custom_height_mm is not None
            return self.custom_width_mm if self.orientation == "portrait" else self.custom_height_mm
        width, height = PAPER_DIMENSIONS_MM[self.paper_size]
        return width if self.orientation == "portrait" else height

    @property
    def height_mm(self) -> float:
        if self.paper_size == "Custom":
            assert self.custom_width_mm is not None and self.custom_height_mm is not None
            return self.custom_height_mm if self.orientation == "portrait" else self.custom_width_mm
        width, height = PAPER_DIMENSIONS_MM[self.paper_size]
        return height if self.orientation == "portrait" else width

    @property
    def drawing_area(self) -> DrawingArea:
        return DrawingArea(width=self.width_mm, height=self.height_mm)