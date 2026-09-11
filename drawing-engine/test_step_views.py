from pathlib import Path
import cadquery as cq

STEP_FILE = Path(r"C:\Users\mlvnv\Downloads\800000182_1.stp")
OUTPUT_DIR = Path("drawing-engine") / "output"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

model = cq.importers.importStep(str(STEP_FILE))

views = {
    "front": (0, 0, 1),
    "top": (0, 1, 0),
    "right": (1, 0, 0),
}

for name, direction in views.items():
    output_file = OUTPUT_DIR / f"{name}.svg"

    model.export(
        str(output_file),
        opt={
            "projectionDir": direction,
            "showAxes": False,
            "showHidden": True,
            "strokeWidth": 0.5,
            "strokeColor": (0, 0, 0),
            "hiddenColor": (160, 160, 160),
        },
    )

    print(f"Created: {output_file}")

print("3-view SVG generation: OK")