# Copilot Rule — Token-Efficient Development
applyTo: "**/*"

## Goal
Minimize Copilot token/credit consumption without reducing engineering quality.

## Required workflow
1. Define one bounded task.
2. Inspect only files directly relevant to that task.
3. Search for existing symbols/components before creating new ones.
4. Read the smallest useful code region first.
5. Implement the smallest change that meets the acceptance criteria.
6. Run targeted validation.
7. Stop.

## Avoid
- repository-wide exploration for a local change
- opening many files "for context" when imports/types already identify the dependency
- repeating unchanged code
- speculative abstractions
- broad refactors
- dependency churn
- rewriting files from scratch
- adding comments that merely restate code
- lengthy plans after the implementation is already obvious

## Session boundary
One Copilot session should normally address one bounded acceptance criterion or a tightly coupled group of criteria.

If the task reveals unrelated defects:
- do not fix them automatically
- mention them briefly
- continue only if they block the requested task

## Preferred search order
symbol -> direct caller -> interface/type -> test -> dependency implementation.

Do not recursively inspect unrelated callers unless the change requires it.

## Response format
Use short sections:
- Changed
- Validation
- Remaining

Do not provide a large tutorial unless requested.
