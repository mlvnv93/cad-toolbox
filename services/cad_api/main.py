import base64
from pathlib import Path
import shutil
import sys
import tempfile

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DRAWING_ENGINE = PROJECT_ROOT / "drawing-engine"

sys.path.insert(0, str(DRAWING_ENGINE))

from cad_drawing.step import import_step
from cad_drawing.bounds import calculate_bounding_box
from cad_drawing.conversion import (
    UnsupportedConversionFormat,
    available_formats,
    convert_step_file,
    get_conversion_format,
)
from cad_drawing.views import export_views
from cad_drawing.pdf import create_pdf
from cad_drawing.archive import bundle_archives, compress_cad_files
from cad_drawing.model import DrawingModel
from cad_drawing.scale import calculate_automatic_scale
from cad_drawing.sheet import Sheet


app = FastAPI(
    title="CAD Toolbox Drawing API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://cad-toolbox-web.onrender.com",
],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/convert/formats")
def convert_formats():
    return {"formats": available_formats()}


@app.post("/convert/bulk")
async def convert_bulk(files: list[UploadFile] = File(...)):
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        input_paths = []

        for index, file in enumerate(files):
            filename = Path(file.filename or f"input_{index}").name
            input_dir = temp_path / "inputs" / str(index)
            input_dir.mkdir(parents=True, exist_ok=True)
            input_path = input_dir / filename
            input_path.write_bytes(await file.read())
            input_paths.append(input_path)

        conversion_results = compress_cad_files(input_paths, temp_path / "output")
        results = []
        for result in conversion_results:
            output_bytes = (
                result.output_file.read_bytes()
                if result.success and result.output_file is not None
                else None
            )
            results.append(
                {
                    "input_filename": result.input_file.name,
                    "output_filename": (
                        result.output_file.name
                        if result.output_file is not None
                        else None
                    ),
                    "success": result.success,
                    "error": result.error,
                    "output_base64": (
                        base64.b64encode(output_bytes).decode("ascii")
                        if output_bytes is not None
                        else None
                    ),
                }
            )

        return {"results": results}


@app.post("/convert")
async def convert(
    files: list[UploadFile] = File(...),
    output_format: str = Form(...),
):
    """Convert STEP/STP files with CadQuery and bundle batch results."""
    try:
        format_info = get_conversion_format(output_format)
    except UnsupportedConversionFormat as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
    if not files:
        raise HTTPException(status_code=400, detail="At least one CAD file is required.")

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        input_paths = []
        for index, file in enumerate(files):
            filename = Path(file.filename or f"input_{index}").name
            if Path(filename).suffix.lower() not in {".step", ".stp"}:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported input format for '{filename}'. Only STEP and STP are supported.",
                )

            input_path = temp_path / "inputs" / str(index) / filename
            input_path.parent.mkdir(parents=True, exist_ok=True)
            input_path.write_bytes(await file.read())
            try:
                import_step(input_path)
            except Exception as exc:
                raise HTTPException(
                    status_code=422,
                    detail=f"'{filename}' is not a valid STEP/STP CAD file.",
                ) from exc
            input_paths.append(input_path)

        output_files = []
        failures = []
        for index, input_path in enumerate(input_paths):
            try:
                output_files.append(
                    convert_step_file(
                        input_path,
                        format_info.id,
                        temp_path / "converted" / str(index),
                    )
                )
            except Exception as exc:
                failures.append(f"{input_path.name}: {exc}")

        if failures:
            raise HTTPException(
                status_code=422,
                detail=f"CAD conversion failed: {'; '.join(failures)}",
            )

        if len(output_files) == 1:
            output_path = output_files[0]
            download_name = output_path.name
        else:
            output_path = bundle_archives(
                output_files,
                temp_path / "CAD3D-KIT-converted.zip",
            )
            download_name = "CAD3D-KIT-converted.zip"

        return Response(
            content=output_path.read_bytes(),
            media_type=(
                "application/zip"
                if len(output_files) > 1
                else format_info.media_type
            ),
            headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
        )


@app.post("/drawings")
async def generate_drawing(
    file: UploadFile = File(...),
    paper_size: str = Form("A4"),
    orientation: str = Form("portrait"),
):
    filename = file.filename or ""

    if not filename.lower().endswith((".step", ".stp")):
        raise HTTPException(
            status_code=400,
            detail="Only STEP or STP files are supported.",
        )

    try:
        sheet = Sheet(paper_size=paper_size, orientation=orientation)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

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
            scale = calculate_automatic_scale(
                calculate_bounding_box(model),
                sheet.drawing_area,
            )
            create_pdf(
                views,
                pdf_path,
                Path(filename).stem,
                DrawingModel(scale=scale, sheet=sheet),
            )
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