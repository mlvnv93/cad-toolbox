from pathlib import Path

from cad_drawing.bounds import calculate_bounding_box
from cad_drawing.step import import_step


STEP_FILE = Path(r"C:\Users\mlvnv\Downloads\800000182_1.stp")


def test_bounding_box_from_imported_step() -> None:
    model = import_step(STEP_FILE)
    bounding_box = calculate_bounding_box(model)

    print(f"X: {bounding_box.xmin} to {bounding_box.xmax}")
    print(f"Y: {bounding_box.ymin} to {bounding_box.ymax}")
    print(f"Z: {bounding_box.zmin} to {bounding_box.zmax}")
    print(
        f"Dimensions: X={bounding_box.x_length}, "
        f"Y={bounding_box.y_length}, Z={bounding_box.z_length}"
    )

    assert bounding_box.x_length > 0
    assert bounding_box.y_length > 0
    assert bounding_box.z_length > 0
    assert bounding_box.unit == "MM"
    assert bounding_box.x_length == bounding_box.xmax - bounding_box.xmin
    assert bounding_box.y_length == bounding_box.ymax - bounding_box.ymin
    assert bounding_box.z_length == bounding_box.zmax - bounding_box.zmin


if __name__ == "__main__":
    test_bounding_box_from_imported_step()