from pathlib import Path
import shutil
import sys
import tempfile

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DRAWING_ENGINE = PROJECT_ROOT / "drawing-engine"

sys.path.insert(0, str(DRAWING_ENGINE))

from cad_drawing.step import import_step
from cad_drawing.views import export_views
from cad_drawing.pdf import create_pdf


app = FastAPI(
    title="CAD Toolbox Drawing API",
    version="0.1.0",
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/drawings")
async def generate_drawing(file: UploadFile = File(...)):
    filename = file.filename or ""

    if not filename.lower().endswith((".step", ".stp")):
        raise HTTPException(
            status_code=400,
            detail="Only STEP or STP files are supported.",
        )

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        step_path = temp_path / filename
        output_dir = temp_path / "output"
        pdf_path = output_dir / f"{Path(filename).stem}_drawing.pdf"

        with step_path.open("wb") as destination:
            shutil.copyfileobj(file.file, destination)

        try:
            model = import_step(step_path)
            views = export_views(model, output_dir)
            create_pdf(views, pdf_path, Path(filename).stem)
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Drawing generation failed: {exc}",
            ) from exc

        pdf_bytes = pdf_path.read_bytes()

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{pdf_path.name}"'
                )
            },
        )