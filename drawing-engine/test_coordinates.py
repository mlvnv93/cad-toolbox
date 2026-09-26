import pytest

from cad_drawing.coordinates import DrawingCoordinateSpace


def test_drawing_coordinate_space_requires_millimetres() -> None:
    with pytest.raises(ValueError, match="millimetre"):
        DrawingCoordinateSpace(1.0, unit="IN")


def test_drawing_coordinate_space_requires_positive_scale() -> None:
    with pytest.raises(ValueError, match="positive"):
        DrawingCoordinateSpace(0)


def test_model_geometry_is_scaled_once_into_drawing_mm() -> None:
    space = DrawingCoordinateSpace(0.5)

    assert space.model_to_drawing(100.0) == pytest.approx(50.0)
    assert space.point_to_drawing(100.0, 40.0) == pytest.approx((50.0, 20.0))


def test_one_to_one_scale_preserves_drawing_mm() -> None:
    space = DrawingCoordinateSpace(1.0)

    assert space.point_to_drawing(125.0, 75.0) == pytest.approx((125.0, 75.0))
