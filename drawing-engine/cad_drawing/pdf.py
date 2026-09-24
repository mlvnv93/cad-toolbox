from pathlib import Path

from svglib.svglib import svg2rlg
from reportlab.graphics import renderPDF
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from .drawing_ir import LineEntity
from .drawing_views import drawing_views_from_files
from .model import DrawingModel
from .projection import ProjectionType, orthographic_view_positions
from .sheet import Sheet


def draw_svg(pdf, svg_file, x, y, width, height):
    drawing = svg2rlg(str(svg_file))

    scale = min(
        width / drawing.width,
        height / drawing.height,
    )

    drawing.scale(scale, scale)

    renderPDF.draw(drawing, pdf, x, y)


def create_pdf(
    views: dict[str, Path],
    output_file: str | Path,
    part_name: str,
    drawing_model: DrawingModel | None = None,
):
    output_file = Path(output_file)

    sheet = drawing_model.sheet if drawing_model else Sheet()
    projection_type = (
        drawing_model.projection_type
        if drawing_model
        else ProjectionType.THIRD_ANGLE
    )
    page_width = sheet.width_mm * mm
    page_height = sheet.height_mm * mm
    margin = 10 * mm

    pdf = canvas.Canvas(
        str(output_file),
        pagesize=(page_width, page_height),
        pageCompression=0,
    )

    pdf.setTitle(f"{part_name} - CAD Toolbox Drawing")

    pdf.rect(
        margin,
        margin,
        page_width - 2 * margin,
        page_height - 2 * margin,
    )

    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(
        margin + 5 * mm,
        page_height - margin - 8 * mm,
        "CAD TOOLBOX — ENGINEERING DRAWING",
    )

    pdf.setFont("Helvetica", 9)
    pdf.drawString(
        margin + 5 * mm,
        page_height - margin - 15 * mm,
        f"Part: {part_name}",
    )

    view_width = 80 * mm
    view_height = 55 * mm
    view_positions = orthographic_view_positions(sheet, projection_type)
    placed_views = None
    if drawing_model is not None:
        placed_views = drawing_views_from_files(views, drawing_model)

    if placed_views:
        for view in placed_views.values():
            for entity in view.entities:
                if isinstance(entity, LineEntity):
                    pdf.setStrokeColorRGB(0.6, 0.6, 0.6) if entity.layer == "hidden" else pdf.setStrokeColorRGB(0, 0, 0)
                    pdf.line(entity.start.x * mm, entity.start.y * mm, entity.end.x * mm, entity.end.y * mm)
    else:
        for view_name in ("front", "back", "left", "right", "top", "bottom", "isometric"):
            if view_name not in views:
                continue
            draw_svg(
                pdf,
                views[view_name],
                view_positions[view_name][0] * mm,
                view_positions[view_name][1] * mm,
                view_width,
                view_height,
            )

    block_x = 120 * mm
    block_y = 20 * mm
    block_w = 80 * mm
    block_h = 25 * mm

    pdf.rect(block_x, block_y, block_w, block_h)

    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawString(
        block_x + 3 * mm,
        block_y + 17 * mm,
        "CAD TOOLBOX",
    )

    pdf.setFont("Helvetica", 7)
    pdf.drawString(
        block_x + 3 * mm,
        block_y + 11 * mm,
        f"PART: {part_name}",
    )
    scale_label = drawing_model.scale.label if drawing_model else "FIT"
    scale_unit = drawing_model.scale.unit.lower() if drawing_model else "mm"

    pdf.drawString(
        block_x + 3 * mm,
        block_y + 5 * mm,
        f"SCALE: {scale_label}    UNITS: {scale_unit}",
    )

    pdf.showPage()
    pdf.save()