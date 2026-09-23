import re
import xml.etree.ElementTree as ET
from pathlib import Path

from .drawing_ir import DrawingDocument, LineEntity, Point
from .model import DrawingModel
from .projection import orthographic_view_positions


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
) -> DrawingDocument:
    positions = orthographic_view_positions(
        drawing_model.sheet,
        drawing_model.projection_type,
    )
    entities: list[LineEntity] = []
    layers: set[str] = set()
    for view_name in ("front", "top", "right"):
        root = ET.parse(views[view_name]).getroot()
        offset_x, offset_y = positions[view_name]
        for element, hidden in _path_elements(root):
            if not element.get("d"):
                continue
            parsed = _path_lines(element.get("d", ""))
            if parsed is None:
                continue
            layer = "hidden" if hidden else "geometry"
            layers.add(layer)
            for start, end in parsed:
                entities.append(
                    LineEntity(
                        start=Point(offset_x + start.x * drawing_model.scale.factor, offset_y + start.y * drawing_model.scale.factor),
                        end=Point(offset_x + end.x * drawing_model.scale.factor, offset_y + end.y * drawing_model.scale.factor),
                        layer=layer,
                    )
                )

    return DrawingDocument(
        units="MM",
        sheet_width_mm=drawing_model.sheet.width_mm,
        sheet_height_mm=drawing_model.sheet.height_mm,
        scale=drawing_model.scale.factor,
        layers=tuple(sorted(layers)),
        entities=tuple(entities),
    )