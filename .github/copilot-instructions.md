# CAD Toolbox — Copilot Instructions

## Mission
CAD Toolbox is a CAD-neutral web application for 3D CAD viewing, technical drawing generation, CAD conversion, and sheet-metal workflows. Preserve a reusable CAD-neutral core and keep product/UI concerns separate from geometry intelligence.

## Primary development rule
Work only on the requested task. Before editing:
1. Inspect the smallest relevant set of files.
2. Identify existing components/services that already solve part of the problem.
3. Make the smallest additive change that satisfies the task.
4. Avoid unrelated refactors, renames, formatting churn, dependency upgrades, or architecture changes.
5. Run the narrowest relevant tests/build checks.
6. Report changed files, validation performed, and any remaining limitation briefly.

## Token-efficiency rules
- Do not scan the entire repository unless explicitly required.
- Do not read generated files, dependencies, build output, lockfiles, or unrelated modules unless necessary.
- Prefer targeted search by symbol, filename, route, component, interface, or error.
- Reuse existing abstractions before creating new ones.
- Do not regenerate files that already exist merely to restate their contents.
- Do not produce long explanations when a concise implementation note is sufficient.
- Do not ask for information that can be established from the repository.
- If the requested change is ambiguous, state the smallest assumption and proceed only within that boundary.
- Stop when the requested acceptance criteria are met.

## Architecture
- Keep CAD geometry/analysis logic CAD-neutral.
- Keep geometry processing separate from UI state and presentation.
- Keep import, topology analysis, recognition, flattening, drawing generation, and export as separable stages.
- Prefer deterministic algorithms for engineering outputs.
- AI may assist later, but must not be a hidden dependency for deterministic CAD results.
- Never silently modify user CAD geometry.
- Preserve object identity/traceability where practical.
- Prefer structured engineering metadata over free-form text.

## CAD geometry foundation
- Prefer OCCT/OCC-based geometry processing where it is already part of the architecture.
- Treat browser/WASM geometry processing as the default path for user CAD where privacy and low server geometry cost are requirements.
- For sheet metal, use an explicit internal representation such as a FlatPattern rather than coupling downstream DXF logic directly to a specific CAD kernel object.
- Separate geometry extraction/recognition from DXF/DWG mapping and writing.
- Do not claim manufacturing-grade correctness unless the implemented geometry checks support it.

## Sheet-metal MVP boundary
The current MVP target is:
- single-body constant-thickness parts
- 1–5 simple bends
- holes, slots, and cutouts
- 1:1 DXF output
- distinct layers/semantics for OUTER_PROFILE, INNER_PROFILE, BEND_UP, and BEND_DOWN

Do not silently expand this scope. Flag unsupported geometry rather than producing a misleading result.

## Third-party code
Before copying, adapting, or adding third-party code:
license -> individual files -> dependencies -> compatibility -> integration method -> obligations.

Maintain a dependency/license inventory containing:
- repository/source
- version or commit
- license
- copyright holders
- files/modules used
- dependencies
- required notices
- modification status
- distribution obligations
- CAD Toolbox integration location

## Validation
For engineering logic, prefer:
- deterministic tests
- representative synthetic geometry
- edge cases
- regression tests for previously fixed defects
- explicit unsupported-case tests

Do not weaken or delete a test merely to make the suite pass. If behavior changes intentionally, update the test and state why.

## Change discipline
Do not:
- rewrite working modules without need
- introduce a framework solely for a small feature
- change public APIs unnecessarily
- add dependencies when existing code can solve the task
- mix UI redesign with geometry/feature work
- mix optimization with feature implementation unless explicitly requested

## Output discipline
At the end of a task, provide:
- what changed
- files changed
- tests/build checks run
- known limitation, if any

Keep this summary concise.
