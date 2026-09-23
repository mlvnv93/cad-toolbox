# DXF Reuse Record

CAD Toolbox uses `ezdxf` 1.4.4 behind the internal drawing IR and DXF writer.

- Repository: https://github.com/mozman/ezdxf
- License: MIT
- Copyright: Manfred Moitzi
- Integration: `drawing-engine/cad_drawing/dxf.py`
- Dependency source: already installed transitively by CadQuery; no ezdxf source was copied or modified.
- Internal boundary: application code exposes `DrawingDocument` entities, not ezdxf objects.