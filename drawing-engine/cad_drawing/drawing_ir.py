from dataclasses import dataclass
from typing import TypeAlias


@dataclass(frozen=True)
class Point:
    x: float
    y: float


@dataclass(frozen=True)
class LineEntity:
    start: Point
    end: Point
    layer: str = "geometry"


@dataclass(frozen=True)
class CircleEntity:
    center: Point
    radius: float
    layer: str = "geometry"


@dataclass(frozen=True)
class ArcEntity:
    center: Point
    radius: float
    start_angle: float
    end_angle: float
    layer: str = "geometry"


@dataclass(frozen=True)
class TextEntity:
    position: Point
    text: str
    height: float
    layer: str = "annotation"


DrawingEntity: TypeAlias = LineEntity | CircleEntity | ArcEntity | TextEntity


@dataclass(frozen=True)
class DrawingBounds:
    min_x: float
    min_y: float
    max_x: float
    max_y: float

    @property
    def width(self) -> float:
        return self.max_x - self.min_x

    @property
    def height(self) -> float:
        return self.max_y - self.min_y

    @property
    def center(self) -> Point:
        return Point((self.min_x + self.max_x) / 2, (self.min_y + self.max_y) / 2)


@dataclass(frozen=True)
class DrawingView:
    name: str
    entities: tuple[DrawingEntity, ...]
    bounds: DrawingBounds
    position: Point
    scale: float
    projection_relationship: str


@dataclass(frozen=True)
class DrawingDocument:
    units: str
    sheet_width_mm: float
    sheet_height_mm: float
    scale: float
    layers: tuple[str, ...]
    entities: tuple[DrawingEntity, ...]