from pathlib import Path
import zlib

from cad_drawing.bounds import calculate_bounding_box
from cad_drawing.model import DrawingModel
from cad_drawing.pdf import create_pdf
from cad_drawing.scale import DrawingArea, calculate_automatic_scale
from cad_drawing.step import import_step
from cad_drawing.views import export_views


STEP_FILE = Path(r"C:\Users\mlvnv\Downloads\800000182_1.stp")


def read_pdf_content(pdf_file: Path) -> str:
    pdf_bytes = pdf_file.read_bytes()
    content = bytearray()
    for stream in pdf_bytes.split(b"stream\n")[1:]:
        compressed = stream.split(b"\nendstream", 1)[0]
        try:
            content.extend(zlib.decompress(compressed))
        except zlib.error:
            content.extend(compressed)
    return content.decode("latin-1")


def test_calculated_scale_flows_through_model_into_pdf(tmp_path: Path) -> None:
    model = import_step(STEP_FILE)
    bounding_box = calculate_bounding_box(model)
    scale = calculate_automatic_scale(
        bounding_box,
        DrawingArea(width=250, height=180),
    )
    drawing_model = DrawingModel(scale=scale)

    views = export_views(model, tmp_path / "views")
    pdf_file = tmp_path / "drawing.pdf"
    create_pdf(views, pdf_file, "800000182_1", drawing_model)

    assert drawing_model.scale is scale
    assert pdf_file.exists()
    pdf_text = read_pdf_content(pdf_file)
    assert f"SCALE: {scale.label}" in pdf_text
    assert f"UNITS: {scale.unit.lower()}" in pdf_text