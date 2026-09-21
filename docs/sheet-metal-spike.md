# Sheet-Metal Integration Spike

## Existing CAD architecture

- `apps/web/src/components/cad/CadWorkspace.tsx` validates STEP/STP files and passes the browser `File` to the existing viewer.
- `apps/web/src/components/cad/CadViewer.tsx` starts one `Worker` per load, receives typed mesh buffers, and renders them with native Three.js and `OrbitControls`.
- `apps/web/public/cad-step.worker.js` loads `occt-import-js` from `/occt-import-js.js`, initializes OpenCascade asynchronously, and calls `ReadStepFile` with millimetre output.
- The current worker protocol returns the OCCT hierarchy, tessellated positions/normals/indices, timings, and viewer statistics. It does not send raw OCCT objects to React.
- The existing `/draw` route uses `DrawWorkbench` and the separate Python/FastAPI drawing engine. Its export path is server-side PDF generation and is intentionally unchanged by this spike.
- Existing automated tests are Python `pytest` tests for the drawing engine. There was no frontend test runner or CAD-domain test module before this spike.

## Feasibility boundary

`occt-import-js` 0.0.23 exposes tessellated geometry plus `brep_faces` triangle ranges. Its public browser API does not expose analytic face surface types, edge curves, vertices, face adjacency, or persistent OCCT shape handles. The new analysis boundary therefore consumes the existing mesh representation and reports exact mesh-derived measurements separately from inferred candidates. Unsupported topology is represented as `unknown` or a warning; the analyzer must not claim a model is definitely sheet metal.

## Fixture status

The requested `Saç Metal 20.step` file remains outside the repository and is never copied or modified. The real-fixture test reads the path from `CAD_TEST_FIXTURE`; when the variable is unset or the file is missing, Node reports that test as skipped with a clear reason.

Run the generic suite from `apps/web` with:

```powershell
pnpm test
```

Run the real fixture test locally from the repository root with:

```powershell
$env:CAD_TEST_FIXTURE = 'C:\Users\mlvnv\Downloads\Saç Metal 20.step'
Push-Location apps\web
pnpm test
Pop-Location
```

The environment variable is intentionally session-scoped and is not required for the generic suite.

## Next step after the spike

Expose analytic topology from a purpose-built OCCT WASM build, or add a separately maintained worker-side OCCT binding that returns stable face/edge identifiers and measurements. Only then should bend recognition and unfolding be attempted.