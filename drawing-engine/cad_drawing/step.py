from pathlib import Path

import cadquery as cq


def import_step(step_file: str | Path) -> cq.Workplane:
    """Import a STEP file into CadQuery."""
    path = Path(step_file)

    if not path.exists():
        raise FileNotFoundError(f"STEP file not found: {path}")

    return cq.importers.importStep(str(path))