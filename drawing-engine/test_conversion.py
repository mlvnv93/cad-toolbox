from pathlib import Path

import cadquery as cq

from cad_drawing.conversion import CONVERSION_FORMATS, convert_step_file


def test_real_step_converts_to_all_advertised_formats(tmp_path: Path) -> None:
    source = tmp_path / "fixture.step"
    cq.Workplane("XY").box(10, 20, 30).export(str(source))

    for format_info in CONVERSION_FORMATS:
        output = convert_step_file(source, format_info.id, tmp_path / format_info.id)
        assert output.suffix == format_info.extension
        assert output.exists()
        assert output.stat().st_size > 0
