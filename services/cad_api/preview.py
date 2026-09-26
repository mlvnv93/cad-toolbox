from pathlib import Path
import xml.etree.ElementTree as ET

from cad_drawing.drawing_views import _path_elements, _path_lines, drawing_views_from_files
from cad_drawing.model import DrawingModel


def _serialize_view(view, scale: float) -> dict:
    entities = []
    for entity in view.entities:
        entities.append({
            "type": "LINE",
            "start": {"x": entity.start.x, "y": entity.start.y},
            "end": {"x": entity.end.x, "y": entity.end.y},
            "layer": entity.layer,
        })
    bounds = view.bounds
    return {
        "entities": entities,
        "bounds": {
            "min_x": bounds.min_x,
            "min_y": bounds.min_y,
            "max_x": bounds.max_x,
            "max_y": bounds.max_y,
        },
        "center": {"x": view.position.x, "y": view.position.y},
        "position": {"x": view.position.x, "y": view.position.y},
        "scale": scale,
    }


def _scale_label(factor: float) -> str:
    if factor >= 1:
        return f"{factor:g}:1"
    return f"1:{1 / factor:g}"


def serialize_drawing_preview(views: dict[str, Path], drawing_model: DrawingModel) -> dict:
    placed_views = drawing_views_from_files(views, drawing_model, validate_fit=False)
    serialized_views = {
        name: _serialize_view(view, drawing_model.scale.factor)
        for name, view in placed_views.items()
    }
    all_entities = [entity for view in serialized_views.values() for entity in view["entities"]]
    layers = sorted({entity["layer"] for entity in all_entities})

    return {
        "units": "MM",
        "paper_size": drawing_model.sheet.paper_size,
        "orientation": drawing_model.sheet.orientation,
        "sheet_width_mm": drawing_model.sheet.width_mm,
        "sheet_height_mm": drawing_model.sheet.height_mm,
        "scale": drawing_model.scale.factor,
        "scale_label": _scale_label(drawing_model.scale.factor),
        "layers": layers,
        "entities": all_entities,
        "views": serialized_views,
        "view_positions": {
            name: {"x": view.position.x, "y": view.position.y}
            for name, view in placed_views.items()
        },
    }
