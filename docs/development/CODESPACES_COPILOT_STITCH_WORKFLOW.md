# Development Operating Model

## Toolchain

| Responsibility | Tool | Rule |
|---|---|---|
| IDE / reproducible environment | GitHub Codespaces | All implementation work should be reproducible in the repository devcontainer. |
| Agentic coding | GitHub Copilot | Implements architect-scoped tasks and repository instructions. |
| UI / UX design | Google Stitch | Source for visual concepts, layouts and interaction design. |
| Architecture / research / review | Software Architect (ChatGPT) | Maintains architecture integrity and acceptance criteria. |
| Product decisions | Client | Owns priorities, scope and final acceptance. |

## Standard task lifecycle

Client request -> Architect task specification -> Stitch design when needed -> Copilot implementation in Codespaces -> automated validation -> Architect review -> Client acceptance -> merge.

## Architectural gate

Every task must preserve:

`Source CAD -> canonical ingestion -> CADContext -> independent modules`

No task may introduce a competing CAD state model, hidden source-CAD parser, silent CAD mutation, or direct module-to-module implementation coupling.

## Branching

Use short-lived feature branches. Keep architecture changes separate from feature implementation. Prefer one coherent task per branch/PR.

## Definition of done

A task is done when:

1. Acceptance criteria are met.
2. Relevant tests/build/lint checks pass.
3. Module boundaries remain intact.
4. Derived state is traceable to CADContext ID/version where applicable.
5. UI work remains presentation-only and follows the approved Stitch direction.
6. Known unsupported cases are explicit.
7. The architect has no unresolved architecture objection.
8. The client accepts the result.
