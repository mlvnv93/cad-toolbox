from pathlib import Path
import re

import ezdxf

from .drawing_ir import ArcEntity, CircleEntity, DrawingDocument, LineEntity, TextEntity


def write_dxf(document: DrawingDocument, output_file: str | Path) -> None:
    if document.units != "MM":
        raise ValueError("DXF export requires millimetre units")

    dxf = ezdxf.new("R2010")
    dxf.header["$INSUNITS"] = 4
    dxf.header["$MEASUREMENT"] = 1
    dxf.header["$DIMSCALE"] = document.scale
    dxf.header["$FINGERPRINTGUID"] = "{00000000-0000-0000-0000-000000000001}"
    dxf.header["$VERSIONGUID"] = "{00000000-0000-0000-0000-000000000002}"
    for layer in document.layers:
        dxf.layers.add(layer)

    modelspace = dxf.modelspace()
    for entity in document.entities:
        if isinstance(entity, LineEntity):
            modelspace.add_line(
                (entity.start.x, entity.start.y),
                (entity.end.x, entity.end.y),
                dxfattribs={"layer": entity.layer},
            )
        elif isinstance(entity, CircleEntity):
            modelspace.add_circle(
                (entity.center.x, entity.center.y),
                entity.radius,
                dxfattribs={"layer": entity.layer},
            )
        elif isinstance(entity, ArcEntity):
            modelspace.add_arc(
                (entity.center.x, entity.center.y),
                entity.radius,
                entity.start_angle,
                entity.end_angle,
                dxfattribs={"layer": entity.layer},
            )
        elif isinstance(entity, TextEntity):
            modelspace.add_text(
                entity.text,
                dxfattribs={"layer": entity.layer, "height": entity.height},
            ).set_placement((entity.position.x, entity.position.y))
        else:
            raise TypeError(f"Unsupported drawing entity: {type(entity).__name__}")

    output_path = Path(output_file)
    dxf.saveas(output_path, encoding="utf-8")
    content = output_path.read_bytes()
    guids = iter((
        b"{00000000-0000-0000-0000-000000000001}",
        b"{00000000-0000-0000-0000-000000000002}",
    ))
    content = re.sub(rb"\{[0-9A-Fa-f-]{36}\}", lambda _: next(guids), content)
    content = re.sub(
        rb"(\$TDCREATE\r\n 40\r\n)[^\r\n]+",
        rb"\g<1>0.0",
        content,
    )
    content = re.sub(
        rb"(\$TDUPDATE\r\n 40\r\n)[^\r\n]+",
        rb"\g<1>0.0",
        content,
    )
    content = re.sub(rb"1\.4\.4 @ [^\r\n]+", b"1.4.4", content)
    output_path.write_bytes(content)