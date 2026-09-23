from pathlib import Path

import ezdxf

from cad_drawing.drawing_ir import ArcEntity, CircleEntity, DrawingDocument, LineEntity, Point, TextEntity
from cad_drawing.drawing_views import drawing_document_from_views
from cad_drawing.dxf import write_dxf
from cad_drawing.model import DrawingModel
from cad_drawing.scale import ScaleResult
from cad_drawing.sheet import Sheet
from cad_drawing.step import import_step
from cad_drawing.views import export_views


STEP_FILE = Path(r"C:\Users\mlvnv\Downloads\800000182_1.stp")


def test_minimal_drawing_ir_exports_valid_deterministic_dxf(tmp_path: Path) -> None:
    document = DrawingDocument(
        units="MM",
        sheet_width_mm=210,
        sheet_height_mm=297,
        scale=1,
        layers=("annotation", "geometry"),
        entities=(
            LineEntity(Point(0, 0), Point(10, 0)),
            CircleEntity(Point(5, 5), 2),
            ArcEntity(Point(5, 5), 3, 0, 90),
            TextEntity(Point(0, 0), "TEST", 3),
        ),
    )
    first = tmp_path / "first.dxf"
    second = tmp_path / "second.dxf"

    write_dxf(document, first)
    write_dxf(document, second)
    parsed = ezdxf.readfile(first)

    assert first.read_bytes()
    assert first.read_bytes() == second.read_bytes()
    assert parsed.header["$INSUNITS"] == 4
    assert parsed.header["$DIMSCALE"] == 1
    assert {entity.dxftype() for entity in parsed.modelspace()} == {"LINE", "CIRCLE", "ARC", "TEXT"}
    assert {layer.dxf.name for layer in parsed.layers} >= {"annotation", "geometry"}


def test_real_step_views_convert_to_dxf_with_sheet_and_projection(tmp_path: Path) -> None:
    model = import_step(STEP_FILE)
    views = export_views(model, tmp_path / "views")
    drawing_model = DrawingModel(
        scale=ScaleResult(1, 1, 1, "1:1", 1, 1, 1, "MM"),
        sheet=Sheet(paper_size="A3", orientation="landscape"),
    )
    document = drawing_document_from_views(views, drawing_model)
    output = tmp_path / "model.dxf"

    write_dxf(document, output)
    parsed = ezdxf.readfile(output)

    assert output.stat().st_size > 0
    assert document.sheet_width_mm == 420
    assert document.sheet_height_mm == 297
    assert len(list(parsed.modelspace())) > 0
    assert {entity.dxf.layer for entity in parsed.modelspace()} >= {"geometry", "hidden"}