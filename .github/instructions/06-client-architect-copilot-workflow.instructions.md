# Client / Architect / Copilot Workflow

## Roles

- The client owns product intent, priorities, acceptance criteria, and final approval.
- The software architect owns architecture, technical research, boundaries, sequencing, trade-offs, and architecture acceptance.
- GitHub Copilot is the agentic implementer. It must execute scoped tasks, not redesign the architecture.
- Google Stitch is the UI/UX design system for visual concepts and interaction design.

## Before implementation

1. Read `.github/CAD_ARCHITECTURE_CONTEXT.md`.
2. Read the smallest relevant existing files.
3. Identify the applicable interface/module boundary.
4. Confirm the task does not violate a locked invariant.
5. If it appears to require an architecture change, stop and document the conflict instead of silently changing it.

## Implementation rules

- Prefer small, reviewable changes.
- Keep CAD geometry/analysis separate from UI state and presentation.
- Never make a UI component the owner of CAD truth.
- Never independently parse source CAD in a downstream module.
- Keep derived models explicitly tied to CADContext ID/version.
- Reuse existing interfaces and adapters before creating new ones.
- Do not add infrastructure, dependencies, or frameworks without a demonstrated need.
- Do not mix UI redesign with geometry/feature work unless the task explicitly requires both.

## UI / UX

When a task changes visual design or interaction:
- Use Google Stitch as the design source for the requested UI/UX concept.
- Implement Stitch output as presentation components only.
- Preserve module contracts and CADContext ownership.
- Do not copy visual concepts into geometry logic.
- Accessibility, responsive behavior, and engineering workflow clarity remain implementation acceptance criteria.

## Validation

Every implementation task should report:
- files changed
- tests/build/lint checks run
- architecture boundary affected
- known limitations

For engineering logic, include deterministic tests and unsupported-case tests. Never weaken tests merely to make a suite pass.

## Git workflow

- Work in a feature branch.
- Keep commits focused and descriptive.
- Do not merge architecture-sensitive changes without architect review and client approval.
- Pull requests should state the acceptance criteria and validation performed.
