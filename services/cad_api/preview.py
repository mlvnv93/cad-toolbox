from pathlib import Path
import xml.etree.ElementTree as ET

from cad_drawing.drawing_views import _path_elements, _path_lines
from cad_drawing.model import DrawingModel
from cad_drawing.projection import orthographic_view_positions


def _serialize_view(path: Path, offset_x: float, offset_y: float, scale: float) -> list[dict]:
    root = ET.parse(path).getroot()
    entities = []
    for element, hidden in _path_elements(root):
        path_data = element.get("d")
        if not path_data:
            continue
        parsed = _path_lines(path_data)
        if parsed is None:
            continue
        layer = "hidden" if hidden else "geometry"
        for start, end in parsed:
            entities.append({
                "type": "LINE",
                "start": {"x": offset_x + start.x * scale, "y": offset_y + start.y * scale},
                "end": {"x": offset_x + end.x * scale, "y": offset_y + end.y * scale},
                "layer": layer,
            })
    return entities


def serialize_drawing_preview(views: dict[str, Path], drawing_model: DrawingModel) -> dict:
    positions = orthographic_view_positions(drawing_model.sheet, drawing_model.projection_type)
    serialized_views = {
        name: _serialize_view(
            views[name],
            positions[name][0],
            positions[name][1],
            drawing_model.scale.factor,
        )
        for name in ("front", "top", "right")
    }

    all_entities = [entity for view in serialized_views.values() for entity in view]
    layers = sorted({entity["layer"] for entity in all_entities})

    return {
        "units": "MM",
        "sheet_width_mm": drawing_model.sheet.width_mm,
        "sheet_height_mm": drawing_model.sheet.height_mm,
        "scale": drawing_model.scale.factor,
        "layers": layers,
        "entities": all_entities,
        "views": serialized_views,
        "view_positions": {
            name: {"x": x, "y": y}
            for name, (x, y) in positions.items()
        },
    }
