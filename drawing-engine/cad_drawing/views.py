from pathlib import Path

import cadquery as cq


VIEW_DIRECTIONS = {
    "front": (0, 0, 1),
    "back": (0, 0, -1),
    "top": (0, 1, 0),
    "bottom": (0, -1, 0),
    "right": (1, 0, 0),
    "left": (-1, 0, 0),
    "isometric": (1, -1, 1),
}


def export_views(
    model: cq.Workplane,
    output_dir: str | Path,
) -> dict[str, Path]:

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    outputs = {}

    for name, direction in VIEW_DIRECTIONS.items():
        output_file = output_dir / f"{name}.svg"

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

        outputs[name] = output_file

    return outputs