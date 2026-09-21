# Copilot Rule — CAD Geometry and Sheet-Metal Engineering
applyTo: "**/*.{ts,tsx,js,jsx,cs,cpp,h,hpp}"

## Geometry
Treat units, tolerances, coordinate systems, topology, and geometric validity as first-class concerns.

Do not compare floating-point geometry with naive exact equality when tolerance-based comparison is required.

Keep tolerances explicit and centralized where practical.

## B-Rep
Prefer topology-aware reasoning over primitive-only heuristics.

For recognition tasks, use:
- faces
- edges
- vertices
- adjacency
- surface/curve types
- normals
- dimensions
- thickness relationships
- feature relationships

Do not classify a manufacturing feature from a single primitive when topology provides stronger evidence.

## Sheet metal
The current CAD Toolbox MVP supports:
- single-body constant-thickness parts
- 1–5 simple bends
- holes
- slots
- cutouts
- 1:1 DXF export

Expected semantic DXF layers/entities:
- OUTER_PROFILE
- INNER_PROFILE
- BEND_UP
- BEND_DOWN

## Flat pattern
Use an internal FlatPattern representation between recognition/flattening and DXF writing.

FlatPattern should be sufficient for downstream export without requiring direct access to the original CAD kernel object.

## Manufacturing safety
A generated drawing/DXF is an engineering output.

Therefore:
- preserve units
- preserve scale
- preserve bend direction
- preserve hole/cutout geometry
- validate closed profiles where required
- surface ambiguous geometry
- never silently omit geometry
- never claim "fabrication ready" unless the implemented checks justify it

## Tests
Include tests for:
- simple valid parts
- multiple bends
- holes and slots
- cutouts
- tolerance boundaries
- invalid/unsupported geometry
- unit/scale correctness
- regression cases

Prefer small deterministic fixtures over large opaque CAD files when possible.
