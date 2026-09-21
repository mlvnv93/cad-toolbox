# Copilot Rule — Testing and Validation
applyTo: "**/*"

## Test-first where practical
For new deterministic engineering logic:
1. define expected behavior
2. add or identify the smallest relevant test
3. implement
4. run the targeted test
5. run broader checks only when warranted

## Test scope
Start with:
- unit test for changed logic
- directly affected integration test
- build/typecheck/lint relevant to changed files

Do not run the entire repository test suite for every trivial change unless required.

## Geometry test strategy
Prefer standardized/synthetic geometry fixtures for repeatable tests.

Keep the Geometry Test Lab separate from:
- production UI
- core production algorithms
- user-facing application state

Use the test lab to validate geometry extraction and recognition without coupling test scaffolding to production UX.

## Regression discipline
Every fixed defect should have a regression test when practical.

Do not:
- delete a failing test
- weaken an assertion just to pass
- add arbitrary tolerances
- skip validation because a result "looks right"

If a test cannot be run because a required CAD kernel/runtime is unavailable, state that explicitly.

## Engineering outputs
For drawing/DXF generation, validate:
- units
- scale
- profile closure
- bend semantics
- entity/layer mapping
- unsupported cases
- deterministic output where applicable

## Completion rule
A task is complete only when its acceptance criteria are met and relevant validation has passed or its limitation is explicitly documented.
