from pathlib import Path
from types import SimpleNamespace

from services.cad_api.preview import serialize_drawing_preview


def test_serialize_drawing_preview_groups_real_view_geometry(tmp_path: Path) -> None:
    views = {}
    for name in ("front", "top", "right"):
        path = tmp_path / f"{name}.svg"
        path.write_text('<svg><path d="M0 0 L10 0 L10 5"/></svg>', encoding="utf-8")
        views[name] = path

    model = SimpleNamespace(
        sheet=SimpleNamespace(width_mm=210, height_mm=297),
        projection_type="THIRD_ANGLE",
        scale=SimpleNamespace(factor=1.0),
    )

    preview = serialize_drawing_preview(views, model)

    assert preview["units"] == "MM"
    assert preview["sheet_width_mm"] == 210
    assert set(preview["views"]) == {"front", "top", "right"}
    assert len(preview["views"]["front"]) == 2
    assert preview["views"]["front"][0]["type"] == "LINE"
    assert preview["entities"]
    assert set(preview["layers"]) == {"geometry"}
