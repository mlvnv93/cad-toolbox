from pathlib import Path

from cad_drawing.drawing_views import drawing_document_from_views
from cad_drawing.model import DrawingModel
from cad_drawing.projection import orthographic_view_positions


def serialize_drawing_preview(
    views: dict[str, Path],
    drawing_model: DrawingModel,
) -> dict:
    document = drawing_document_from_views(views, drawing_model)
    positions = orthographic_view_positions(
        drawing_model.sheet,
        drawing_model.projection_type,
    )

    entities = []
    for entity in document.entities:
        name = type(entity).__name__
        if name == "LineEntity":
            entities.append({
                "type": "LINE",
                "start": {"x": entity.start.x, "y": entity.start.y},
                "end": {"x": entity.end.x, "y": entity.end.y},
                "layer": entity.layer,
            })
        elif name == "CircleEntity":
            entities.append({
                "type": "CIRCLE",
                "center": {"x": entity.center.x, "y": entity.center.y},
                "radius": entity.radius,
                "layer": entity.layer,
            })
        elif name == "ArcEntity":
            entities.append({
                "type": "ARC",
                "center": {"x": entity.center.x, "y": entity.center.y},
                "radius": entity.radius,
                "start_angle": entity.start_angle,
                "end_angle": entity.end_angle,
                "layer": entity.layer,
            })
        elif name == "TextEntity":
            entities.append({
                "type": "TEXT",
                "position": {"x": entity.position.x, "y": entity.position.y},
                "text": entity.text,
                "height": entity.height,
                "layer": entity.layer,
            })

    return {
        "units": document.units,
        "sheet_width_mm": document.sheet_width_mm,
        "sheet_height_mm": document.sheet_height_mm,
        "scale": document.scale,
        "layers": list(document.layers),
        "entities": entities,
        "view_positions": {
            name: {"x": x, "y": y}
            for name, (x, y) in positions.items()
        },
    }
