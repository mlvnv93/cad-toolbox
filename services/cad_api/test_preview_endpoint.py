from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient

from services.cad_api import main


client = TestClient(main.app)


def test_drawing_preview_endpoint_returns_model_view_payload(monkeypatch) -> None:
    monkeypatch.setattr(main, "import_step", lambda _: object())
    monkeypatch.setattr(main, "export_views", lambda *_: {
        "front": Path("front.svg"),
        "top": Path("top.svg"),
        "right": Path("right.svg"),
    })
    monkeypatch.setattr(main, "calculate_bounding_box", lambda _: object())
    monkeypatch.setattr(main, "calculate_automatic_scale", lambda *_: SimpleNamespace(factor=1.0))
    monkeypatch.setattr(main, "serialize_drawing_preview", lambda views, model: {
        "units": "MM",
        "sheet_width_mm": 210,
        "sheet_height_mm": 297,
        "scale": 1.0,
        "layers": ["geometry"],
        "entities": [{"type": "LINE"}],
        "views": {"front": [{"type": "LINE"}], "top": [], "right": []},
        "view_positions": {"front": {"x": 30, "y": 100}, "top": {"x": 30, "y": 165}, "right": {"x": 120, "y": 100}},
    })

    response = client.post(
        "/draw/preview",
        files={"file": ("part.step", b"valid STEP", "application/octet-stream")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["units"] == "MM"
    assert payload["views"]["front"]
    assert payload["view_positions"]["front"] == {"x": 30, "y": 100}
