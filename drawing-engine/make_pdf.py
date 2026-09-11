from pathlib import Path

from svglib.svglib import svg2rlg
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.graphics import renderPDF


BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "output"

PDF_FILE = OUTPUT_DIR / "800000182_1_drawing.pdf"

PAGE_WIDTH, PAGE_HEIGHT = A4


def draw_svg(pdf_canvas, svg_file, x, y, width, height):
    drawing = svg2rlg(str(svg_file))

    scale_x = width / drawing.width
    scale_y = height / drawing.height
    scale = min(scale_x, scale_y)

    drawing.scale(scale, scale)

    renderPDF.draw(
        drawing,
        pdf_canvas,
        x,
        y,
    )


pdf = canvas.Canvas(str(PDF_FILE), pagesize=A4)

# Border
margin = 10 * mm

pdf.rect(
    margin,
    margin,
    PAGE_WIDTH - 2 * margin,
    PAGE_HEIGHT - 2 * margin,
)

# Title
pdf.setFont("Helvetica-Bold", 14)
pdf.drawString(
    margin + 5 * mm,
    PAGE_HEIGHT - margin - 8 * mm,
    "CAD TOOLBOX — ENGINEERING DRAWING",
)

# Part name
pdf.setFont("Helvetica", 9)
pdf.drawString(
    margin + 5 * mm,
    PAGE_HEIGHT - margin - 15 * mm,
    "Part: 800000182_1",
)

# Views
front = OUTPUT_DIR / "front.svg"
top = OUTPUT_DIR / "top.svg"
right = OUTPUT_DIR / "right.svg"

view_width = 80 * mm
view_height = 55 * mm

draw_svg(
    pdf,
    front,
    30 * mm,
    105 * mm,
    view_width,
    view_height,
)

draw_svg(
    pdf,
    top,
    30 * mm,
    40 * mm,
    view_width,
    view_height,
)

draw_svg(
    pdf,
    right,
    120 * mm,
    105 * mm,
    view_width,
    view_height,
)

# Simple title block
block_x = 120 * mm
block_y = 20 * mm
block_w = 80 * mm
block_h = 25 * mm

pdf.rect(block_x, block_y, block_w, block_h)

pdf.setFont("Helvetica-Bold", 8)
pdf.drawString(block_x + 3 * mm, block_y + 17 * mm, "CAD TOOLBOX")

pdf.setFont("Helvetica", 7)
pdf.drawString(block_x + 3 * mm, block_y + 11 * mm, "PART: 800000182_1")
pdf.drawString(block_x + 3 * mm, block_y + 5 * mm, "SCALE: FIT    UNITS: mm")

pdf.showPage()
pdf.save()

print(f"PDF created: {PDF_FILE}")