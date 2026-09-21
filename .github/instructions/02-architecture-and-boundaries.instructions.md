# Copilot Rule — CAD Toolbox Architecture Boundaries
applyTo: "**/*"

## Core boundary
CAD Toolbox should retain a CAD-neutral reusable core.

Keep these concerns separated:
1. CAD import/translation
2. B-Rep/topology access
3. geometry recognition
4. sheet-metal analysis/flattening
5. internal engineering representations
6. drawing generation
7. DXF/DWG export
8. application/UI
9. accounts/billing/analytics/backend services

## Geometry-first principle
Imported CAD should be reduced to reliable geometric/topological facts before higher-level recognition.

Prefer:
B-Rep/topology -> geometry facts -> deterministic recognition -> structured result -> UI/export.

Do not couple recognition rules directly to a React component, route, canvas widget, or export writer.

## Determinism
Engineering outputs should be reproducible for the same input and configuration.

Use explicit rules, tolerances, units, coordinate systems, and validation states.

If confidence or uncertainty exists, expose it as data rather than silently guessing.

## Privacy and processing
Browser-local geometry processing is preferred where the product requirement calls for CAD privacy and near-zero server geometry cost.

Do not upload geometry to a backend unless the feature explicitly requires it.

Keep backend services lightweight for non-geometry concerns such as accounts, analytics, billing, or API orchestration.

## UI boundary
UI code owns:
- interaction
- display state
- user configuration
- visual feedback

UI code must not become the home for core geometry algorithms.

A feature task must not redesign unrelated UI.

## Representation boundary
Use explicit internal representations for downstream stages.

Example:
CAD geometry -> recognized sheet-metal features -> FlatPattern -> DXF entities.

Do not make downstream code depend on incidental details of an upstream library.

## Unsupported cases
Unsupported geometry must be represented explicitly.

Do not silently:
- approximate unsupported bends
- drop holes/cutouts
- invent dimensions
- modify geometry
- claim fabrication readiness

Prefer a clear unsupported/needs-review result.
