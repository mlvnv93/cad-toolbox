# Copilot Rule — Third-Party Licensing and Code Reuse
applyTo: "**/*"

## Mandatory decision sequence
Before incorporating third-party code:

license -> individual files -> dependencies -> compatibility -> integration method -> obligations.

A repository being public/open-source is not sufficient permission to copy its code.

## Current project guidance

### OCCT
- Use as the primary geometry/B-Rep foundation where applicable.
- Treat OCCT and its WASM distribution according to the applicable LGPL/OCCT licensing requirements.
- Keep LGPL components identifiable and appropriately separable.
- Preserve required notices, license text, and source/replacement obligations.
- Modifications to LGPL code remain subject to applicable LGPL terms.

### Analysis Situs
- Prefer its BSD-3-Clause open-source core where technically useful.
- Relevant areas may include AAG/topology/adjacency, dihedral analysis, body classification, blend recognition, and related open-core algorithms.
- Preserve BSD copyright/license notices.
- Do not copy commercial SMRU functionality or source unless separately licensed.

### FreeCAD / FreeCAD SheetMetal
- May be considered for useful sheet-metal functionality or algorithms.
- Perform a file-level license and dependency audit before incorporation.
- LGPL components may be considered subject to LGPL compliance.
- GPL-only code is excluded from the proprietary CAD Toolbox codebase unless separately licensed and the product licensing strategy explicitly changes.
- Do not infer the license of every file from repository-level metadata.

### Other repositories
Apply the same audit to every external component.

## Reuse preference
When a useful external algorithm is found:
1. audit license and dependencies
2. determine whether direct reuse is compatible
3. determine whether an isolated library boundary is appropriate
4. consider clean-room reimplementation when copying is undesirable
5. document the decision

Never copy code first and investigate licensing later.

## Inventory
Record:
- source repository
- exact version/commit
- license
- copyright holders
- files/modules used
- dependencies
- notices
- modifications
- distribution obligations
- integration location

## Copilot restriction
Do not reproduce substantial third-party source code merely because it solves the task.

When using an external algorithm, prefer:
- documented API usage
- small compatible adapters
- original implementation based on documented behavior
- isolated dependency boundaries

Flag license uncertainty instead of guessing.
