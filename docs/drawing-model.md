# CAD Toolbox Drawing Model

## Purpose

The Drawing Model is the intermediate representation between CAD geometry and
drawing exporters.

It must allow the same drawing definition to be exported to:

- PDF
- SVG
- DXF
- DWG

The drawing model must not depend on a specific output format.

## Architecture

CAD Model
    |
    v
Geometry References
    |
    v
Drawing Model
    |
    +-- Views
    +-- Projection
    +-- Orientation
    +-- Layout
    +-- Sheet / Paper
    +-- Dimensions
    +-- Annotations
    |
    v
Exporters
    +-- PDF
    +-- SVG
    +-- DXF
    +-- DWG

## Drawing Model

A drawing consists of:

### Sheet

- paper_size
- orientation
- margins
- scale
- template
- units

Initial paper sizes:

- A4
- A3
- A2
- A1
- A0

Initial orientations:

- portrait
- landscape

### Projection

- projection_type
- primary_view
- view_directions
- view_positions

Initial projection types:

- Third Angle
- First Angle

Third Angle is the default for CAD Toolbox V1.

### View

Each drawing view contains:

- id
- source_model_reference
- direction
- up_direction
- position
- scale
- visible_lines
- hidden_lines

### Dimension

Each dimension contains:

- id
- type
- references[]
- value
- units
- position
- text_override
- visibility

Initial dimension types:

- linear
- aligned
- diameter
- radius
- angular

## Geometry References

Dimensions must reference CAD geometry rather than only storing screen
coordinates.

Examples:

- vertex
- edge
- face
- cylindrical feature
- circular edge
- pair of geometry references

The geometry reference must remain independent from the output format.

## Measurement

A dimension may represent:

1. A projected 2D measurement.
2. A true 3D measurement.

The measurement mode must be explicitly represented so that an exporter
does not have to infer it.

## User-Defined Dimensions

User-created dimensions are authoritative.

Automatic drawing generation must not silently remove or replace a
user-defined dimension.

Future automatic dimensioning may coexist with user-defined dimensions.

Priority:

User-defined dimension
    >
Automatic dimension

## Dimension Placement

The dimension stores logical placement information.

Screen coordinates must not be the only representation of a dimension.

The drawing system must be able to recalculate placement when:

- paper size changes
- drawing scale changes
- view position changes
- projection orientation changes

## Drawing Orientation

The user may select a planar CAD face as the drawing orientation.

Workflow:

3D model
    |
    v
Select planar face
    |
    v
Use face normal as primary drawing direction
    |
    v
Calculate perpendicular view directions
    |
    v
Recalculate projection views

The selected face defines the primary drawing orientation.

## Layout

The drawing layout system supports:

### Automatic Layout

The system automatically determines:

- view positions
- spacing
- scale
- sheet usage

### Manual Layout

Future paid functionality may allow the user to:

- move views
- reposition views
- adjust view spacing
- adjust scale
- lock view positions
- save layouts/templates

## Export

All exporters consume the same Drawing Model.

PDF:
    Drawing Model -> PDF

SVG:
    Drawing Model -> SVG

DXF:
    Drawing Model -> DXF

DWG:
    Drawing Model -> DWG

No exporter should contain CAD geometry interpretation logic.

## Processing Model

Drawing generation should be asynchronous for complex STEP files.

Conceptual workflow:

POST /drawings
    |
    v
Create drawing job
    |
    v
Import / prepare geometry
    |
    v
Generate views
    |
    v
Generate drawing model
    |
    v
Export
    |
    v
Complete

The API should expose job progress and cancellation.

Progress stages should eventually include:

- importing
- preparing geometry
- generating views
- creating layout
- exporting
- complete

## Architecture Rule

CAD Toolbox should reuse mature CAD/drawing engines where practical.

The product-specific layer remains responsible for:

- user experience
- drawing configuration
- job management
- layout controls
- product rules
- paid/free feature boundaries
- exporter orchestration

The underlying CAD engine should not dictate the public CAD Toolbox API.

## Future Compatibility

The Drawing Model must remain suitable for:

- automatic dimensions
- user-defined dimensions
- section views
- annotations
- GD&T
- custom title blocks
- DXF export
- DWG export
- drawing templates
- multiple CAD geometry backends

## V1 Scope

V1 implements the minimum structure required for:

- three orthographic views
- third-angle projection
- user-defined dimensions
- paper selection
- automatic layout
- PDF export

Advanced functionality remains future scope.