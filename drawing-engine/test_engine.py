from pathlib import Path

from cad_drawing.step import import_step
from cad_drawing.views import export_views
from cad_drawing.pdf import create_pdf


STEP_FILE = Path(r"C:\Users\mlvnv\Downloads\800000182_1.stp")
OUTPUT_DIR = Path(__file__).parent / "output"
PDF_FILE = OUTPUT_DIR / "800000182_1_drawing.pdf"


def main():
    print("Importing STEP...")
    model = import_step(STEP_FILE)

    print("Generating views...")
    views = export_views(model, OUTPUT_DIR)

    print("Generating PDF...")
    create_pdf(
        views,
        PDF_FILE,
        "800000182_1",
    )

    print(f"PDF created: {PDF_FILE}")
    print("DRAWING ENGINE: OK")


if __name__ == "__main__":
    main()