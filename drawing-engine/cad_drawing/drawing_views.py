import re
import xml.etree.ElementTree as ET
from pathlib import Path

from .coordinates import DrawingCoordinateSpace
from .drawing_ir import DrawingBounds, DrawingDocument, DrawingEntity, DrawingView, LineEntity, Point
from .model import DrawingModel
from .projection import VIEW_NAMES, calculate_view_placements


_PATH_TOKEN = re.compile(r"([A-Za-z])|([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?)")
_SUPPORTED_PATH_COMMANDS = set("MLHVZmlhvz")


def _path_lines(path_data: str) -> list[tuple[Point, Point]] | None:
    tokens = [command or number for command, number in _PATH_TOKEN.findall(path_data)]
    if any(token not in _SUPPORTED_PATH_COMMANDS and not _is_number(token) for token in tokens):
        return None

    lines: list[tuple[Point, Point]] = []
    current = Point(0, 0)
    start = current
    index = 0
    command = ""
    while index < len(tokens):
        if not _is_number(tokens[index]):
            command = tokens[index]
            index += 1
        if command in "Zz":
            if current != start:
                lines.append((current, start))
            command = ""
            continue
        if command in "MmLl":
            if index + 1 >= len(tokens) or not _is_number(tokens[index]) or not _is_number(tokens[index + 1]):
                return None
            point = _point(tokens[index], tokens[index + 1], command.islower(), current)
            if command in "Mm":
                start = point
            elif current != point:
                lines.append((current, point))
            current = point
            command = "l" if command == "m" else "L" if command == "M" else command
            index += 2
        elif command in "HhVv":
            if index >= len(tokens) or not _is_number(tokens[index]):
                return None
            value = float(tokens[index])
            point = Point(
                value if command == "H" else current.x if command == "h" else current.x,
                value if command == "V" else current.y if command == "v" else current.y,
            )
            if command == "h":
                point = Point(current.x + value, current.y)
            if command == "v":
                point = Point(current.x, current.y + value)
            if current != point:
                lines.append((current, point))
            current = point
            index += 1
        else:
            return None
    return lines


def _is_number(value: str) -> bool:
    return bool(re.fullmatch(r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?", value))


def _point(x: str, y: str, relative: bool, current: Point) -> Point:
    point = Point(float(x), float(y))
    return Point(current.x + point.x, current.y + point.y) if relative else point


def _path_elements(element: ET.Element, hidden: bool = False):
    hidden = hidden or "stroke-dasharray" in element.attrib or "160" in element.get("stroke", "")
    if element.tag.endswith("path"):
        yield element, hidden
    for child in element:
        yield from _path_elements(child, hidden)


def drawing_document_from_views(
    views: dict[str, Path],
    drawing_model: DrawingModel,
    validate_fit: bool = False,
) -> DrawingDocument:
    view_blocks = drawing_views_from_files(views, drawing_model, validate_fit=validate_fit)
    entities = [entity for view in view_blocks.values() for entity in view.entities]
    layers = {entity.layer for entity in entities}

    return DrawingDocument(
        units="MM",
        sheet_width_mm=drawing_model.sheet.width_mm,
        sheet_height_mm=drawing_model.sheet.height_mm,
        scale=drawing_model.scale.factor,
        layers=tuple(sorted(layers)),
        entities=tuple(entities),
    )


def drawing_preview_entities_from_views(
    views: dict[str, Path],
    drawing_model: DrawingModel,
) -> dict[str, list[LineEntity]]:
    return {name: list(view.entities) for name, view in drawing_views_from_files(views, drawing_model).items()}


def _bounds(entities: list[DrawingEntity]) -> DrawingBounds:
    points: list[Point] = []
    for entity in entities:
        if isinstance(entity, LineEntity):
            points.extend((entity.start, entity.end))
    if not points:
        raise ValueError("Generated drawing view contains no supported geometry")
    return DrawingBounds(
        min_x=min(point.x for point in points),
        min_y=min(point.y for point in points),
        max_x=max(point.x for point in points),
        max_y=max(point.y for point in points),
    )


def _translate(entity: DrawingEntity, offset: Point) -> DrawingEntity:
    if isinstance(entity, LineEntity):
        return LineEntity(
            Point(entity.start.x + offset.x, entity.start.y + offset.y),
            Point(entity.end.x + offset.x, entity.end.y + offset.y),
            entity.layer,
        )
    return entity


def _parse_view(view_name: str, path: Path, coordinate_space: DrawingCoordinateSpace) -> list[LineEntity]:
    del view_name
    root = ET.parse(path).getroot()
    entities: list[LineEntity] = []
    for element, hidden in _path_elements(root):
        if not element.get("d"):
            continue
        parsed = _path_lines(element.get("d", ""))
        if parsed is None:
            continue
        layer = "hidden" if hidden else "geometry"
        for start, end in parsed:
            start_x, start_y = coordinate_space.point_to_drawing(start.x, start.y)
            end_x, end_y = coordinate_space.point_to_drawing(end.x, end.y)
            entities.append(
                LineEntity(
                    start=Point(start_x, start_y),
                    end=Point(end_x, end_y),
                    layer=layer,
                )
            )
    return entities


def drawing_views_from_files(
    views: dict[str, Path],
    drawing_model: DrawingModel,
    validate_fit: bool = True,
) -> dict[str, DrawingView]:
    coordinate_space = DrawingCoordinateSpace(drawing_model.scale.factor)
    local_entities = {
        name: _parse_view(name, path, coordinate_space)
        for name, path in views.items()
        if name in VIEW_NAMES
    }
    local_bounds = {name: _bounds(entities) for name, entities in local_entities.items() if entities}
    positions = calculate_view_placements(
        local_bounds,
        drawing_model.sheet,
        drawing_model.projection_type,
        validate_fit=validate_fit,
    )
    placed: dict[str, DrawingView] = {}
    for name, entities in local_entities.items():
        if name not in positions:
            continue
        local = local_bounds[name]
        offset = Point(positions[name].x - local.center.x, positions[name].y - local.center.y)
        placed_entities = tuple(_translate(entity, offset) for entity in entities)
        placed_bounds = _bounds(list(placed_entities))
        placed[name] = DrawingView(
            name=name,
            entities=placed_entities,
            bounds=placed_bounds,
            position=positions[name],
            scale=drawing_model.scale.factor,
            projection_relationship=drawing_model.projection_type.value,
        )
    return placed
