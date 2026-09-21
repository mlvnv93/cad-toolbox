from pathlib import Path

from svglib.svglib import svg2rlg
from reportlab.graphics import renderPDF
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from .model import DrawingModel


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

    page_width, page_height = A4
    margin = 10 * mm

    pdf = canvas.Canvas(
        str(output_file),
        pagesize=A4,
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

    draw_svg(
        pdf,
        views["front"],
        30 * mm,
        105 * mm,
        view_width,
        view_height,
    )

    draw_svg(
        pdf,
        views["top"],
        30 * mm,
        40 * mm,
        view_width,
        view_height,
    )

    draw_svg(
        pdf,
        views["right"],
        120 * mm,
        105 * mm,
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