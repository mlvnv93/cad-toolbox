import io
from pathlib import Path
from types import SimpleNamespace
from zipfile import ZipFile

import pytest
from fastapi.testclient import TestClient

from services.cad_api import main


DRAWING_SCALE = SimpleNamespace(
    label="1:1",
    unit="MM",
)


client = TestClient(main.app)


def test_convert_formats_returns_authoritative_registry() -> None:
    response = client.get("/convert/formats")

    assert response.status_code == 200
    assert [item["id"] for item in response.json()["formats"]] == [
        "step", "stl", "amf", "3mf", "tjs", "vrml", "vtp", "svg"
    ]


def test_convert_rejects_unsupported_output_format() -> None:
    response = client.post(
        "/convert",
        files={"files": ("part.step", b"STEP", "application/octet-stream")},
        data={"output_format": "dxf"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Output format 'dxf' is not supported."


def test_convert_rejects_invalid_input_extension() -> None:
    response = client.post(
        "/convert",
        files={"files": ("part.iges", b"CAD", "application/octet-stream")},
        data={"output_format": "stl"},
    )

    assert response.status_code == 400
    assert "Only STEP and STP" in response.json()["detail"]


def test_convert_rejects_invalid_step(monkeypatch: pytest.MonkeyPatch) -> None:
    def reject_invalid(_: str | Path) -> None:
        raise ValueError("invalid STEP")

    monkeypatch.setattr(main, "import_step", reject_invalid)
    response = client.post(
        "/convert",
        files={"files": ("part.step", b"not a CAD file", "application/octet-stream")},
        data={"output_format": "stl"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "'part.step' is not a valid STEP/STP CAD file."


def test_convert_returns_selected_output_for_one_step(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(main, "import_step", lambda _: object())

    def write_output(input_file: Path, output_format: str, output_dir: Path) -> Path:
        output = output_dir / f"{input_file.stem}.{output_format}"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(b"converted")
        return output

    monkeypatch.setattr(main, "convert_step_file", write_output)
    response = client.post(
        "/convert",
        files={"files": ("Bracket.step", b"valid STEP", "application/octet-stream")},
        data={"output_format": "stl"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "model/stl"
    assert 'filename="Bracket.stl"' in response.headers["content-disposition"]
    assert response.content == b"converted"


def test_convert_bundles_multiple_outputs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(main, "import_step", lambda _: object())

    def write_output(input_file: Path, output_format: str, output_dir: Path) -> Path:
        output = output_dir / f"{input_file.stem}.{output_format}"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(input_file.read_bytes())
        return output

    monkeypatch.setattr(main, "convert_step_file", write_output)
    response = client.post(
        "/convert",
        files=[
            ("files", ("first.step", b"first", "application/octet-stream")),
            ("files", ("second.stp", b"second", "application/octet-stream")),
        ],
        data={"output_format": "amf"},
    )

    assert response.status_code == 200
    assert 'filename="CAD3D-KIT-converted.zip"' in response.headers["content-disposition"]
    with ZipFile(io.BytesIO(response.content)) as archive:
        assert archive.namelist() == ["first.amf", "second.amf"]


def test_convert_reports_conversion_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main, "import_step", lambda _: object())

    def fail_conversion(*_: object) -> Path:
        raise RuntimeError("bad geometry")

    monkeypatch.setattr(main, "convert_step_file", fail_conversion)
    response = client.post(
        "/convert",
        files={"files": ("part.step", b"valid STEP", "application/octet-stream")},
        data={"output_format": "stl"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "CAD conversion failed: part.step: bad geometry"


@pytest.mark.parametrize(
    ("data", "expected_paper_size", "expected_orientation", "expected_projection"),
    [
        ({}, "A4", "portrait", "THIRD_ANGLE"),
        ({"paper_size": "A4", "orientation": "landscape", "projection_type": "FIRST_ANGLE"}, "A4", "landscape", "FIRST_ANGLE"),
        ({"paper_size": "A3", "orientation": "landscape", "projection_type": "THIRD_ANGLE"}, "A3", "landscape", "THIRD_ANGLE"),
    ],
)
def test_drawings_pass_selected_sheet_to_existing_exporter(
    monkeypatch: pytest.MonkeyPatch,
    data: dict[str, str],
    expected_paper_size: str,
    expected_orientation: str,
    expected_projection: str,
) -> None:
    captured: dict[str, object] = {}
    monkeypatch.setattr(main, "import_step", lambda _: object())
    monkeypatch.setattr(main, "export_views", lambda *_: {})
    monkeypatch.setattr(main, "calculate_bounding_box", lambda _: object())
    monkeypatch.setattr(main, "calculate_automatic_scale", lambda *_: DRAWING_SCALE)

    def write_pdf(*args: object, **kwargs: object) -> None:
        captured["drawing_model"] = args[3]
        Path(args[1]).parent.mkdir(parents=True, exist_ok=True)
        Path(args[1]).write_bytes(b"%PDF")

    monkeypatch.setattr(main, "create_pdf", write_pdf)

    response = client.post(
        "/drawings",
        files={"file": ("part.step", b"valid STEP", "application/octet-stream")},
        data=data,
    )

    assert response.status_code == 200
    drawing_model = captured["drawing_model"]
    assert drawing_model.sheet.paper_size == expected_paper_size
    assert drawing_model.sheet.orientation == expected_orientation
    assert drawing_model.projection_type.value == expected_projection


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("paper_size", "A0", "Unsupported paper size"),
        ("orientation", "diagonal", "Unsupported orientation"),
        ("projection_type", "SECOND_ANGLE", "Unsupported projection type"),
    ],
)
def test_drawings_reject_invalid_sheet_configuration(
    field: str,
    value: str,
    message: str,
) -> None:
    response = client.post(
        "/drawings",
        files={"file": ("part.step", b"valid STEP", "application/octet-stream")},
        data={field: value},
    )

    assert response.status_code == 400
    assert message in response.json()["detail"]
