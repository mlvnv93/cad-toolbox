# CAD Toolbox — Architecture Context for Agents

Status: LOCKED
Source of truth: `CADTransformer_LOCKED_ARCHITECTURE.md` and `CADTransformer_RESEARCH_RULES_CONTEXT.md` in the project Library.

## Non-negotiable architecture

- CADContext is the single canonical CAD source of truth.
- Source CAD is ingested once in the normal browser workflow and normalized into CADContext.
- Downstream modules consume CADContext; they do not independently parse the original CAD file.
- B-Rep/exact geometry is engineering truth. Meshes are presentation/cache representations.
- Modules are replaceable through stable interfaces and typed derived models.
- Module derived state must identify `sourceCadContextId` and `sourceCadContextVersion`.
- Modules must not silently mutate CADContext. A true geometry-changing operation creates a new CADContext version.
- MVP remains read/analyze/derive; CAD editing is outside the locked MVP.

## Required module boundaries

`ICadKernel`, `IViewerEngine`, `IDrawingEngine`, `IConversionEngine`, `ISheetMetalEngine`, `IBomEngine`, `IFastenerEngine`, `IValidationEngine`, `IAnalysisEngine`, `IExportEngine`.

Each follows:

CADContext -> adapter/processor -> typed derived model -> UI/artifact

Locked downstream modules:

1. 3D Viewer
2. Drawing Engine
3. Conversion Engine
4. Sheet-Metal Engine
5. BOM Engine
6. Fastener Intelligence Engine
7. Sanity/Validation Engine
8. Measurement/Analysis Engine
9. Preview/Export Engine

## Engineering authority

- OCCT is the primary geometry foundation.
- Browser/WASM is preferred for ingestion, preview, lightweight analysis, and other client-suitable work.
- Web Workers isolate heavy browser CAD work.
- Pthreads are optional and benchmark-driven.
- FreeCAD is backend authority for manufacturing-critical CAD processing and authoritative sheet-metal/drawing operations.
- ezdxf is the DXF serialization/analysis layer; DXF is never the source of truth.
- Backend is an execution/authority layer, not a competing frontend CAD state model.

## Performance and replacement rules

Every technical decision must preserve CADContext, avoid duplicate source-CAD parsing, preserve exact B-Rep authority, increase module interchangeability, reduce unnecessary server compute, improve generation speed, scale to large assemblies without freezing the UI, have an explicit concurrency model, and have a commercially safe license position.

Do not let a repository dictate the architecture. Repositories are adapters and must remain replaceable.

## Development roles

- **Client:** project owner. Defines product intent, priorities, acceptance criteria, and approves architecture changes.
- **Software Architect:** ChatGPT. Owns architecture interpretation, technical research, module boundaries, trade-offs, implementation sequencing, acceptance criteria, and architecture decisions. Does not silently change locked architecture.
- **Agentic Developer:** GitHub Copilot. Implements approved tasks inside GitHub Codespaces, follows repository instructions, writes/tests code, and proposes changes through normal Git workflow.
- **UI/UX Designer:** Google Stitch. Produces UI/UX concepts, layouts, interaction patterns, and visual direction. Designs must be translated into product components without moving CAD/engineering logic into presentation code.

## Working protocol

1. Client describes the desired outcome.
2. Architect converts it into a scoped implementation task and acceptance criteria.
3. Stitch is used for UI/UX work when visual design is involved.
4. Copilot implements the approved task in Codespaces.
5. Tests/build/validation run in the Codespace.
6. Architect reviews architecture, interfaces, tests, performance implications, and compliance.
7. Client approves the resulting product change.
8. Only then is the change merged into the main development line.

Architecture changes require an explicit architecture decision; they must not be smuggled in through implementation tasks.
