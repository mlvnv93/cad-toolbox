from dataclasses import dataclass

from .scale import ScaleResult
from .sheet import Sheet


@dataclass(frozen=True)
class DrawingModel:
    """Format-independent drawing data passed to exporters."""

    scale: ScaleResult
    sheet: Sheet = Sheet()