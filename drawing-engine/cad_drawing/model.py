from dataclasses import dataclass

from .scale import ScaleResult


@dataclass(frozen=True)
class DrawingModel:
    """Format-independent drawing data passed to exporters."""

    scale: ScaleResult