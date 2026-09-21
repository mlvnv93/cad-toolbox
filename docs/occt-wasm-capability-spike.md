# OCCT-WASM Capability Spike

## Scope

This is an isolated capability probe. It does not replace `occt-import-js`, modify the viewer or `/draw`, or implement sheet-metal recognition, unfolding, or DXF generation.

The probe uses `occt-wasm@5.3.0` as a development dependency. Its npm metadata declares `MIT OR Apache-2.0`; the bundled WASM output is documented by the package as `LGPL-2.1-only`, so distribution requires a licensing review.

Run with the external fixture from the repository root:

```powershell
$env:CAD_TEST_FIXTURE = 'C:\Users\mlvnv\Downloads\Saç Metal 20.step'
Push-Location apps\web
pnpm test -- occt-wasm-capability.test.ts
Pop-Location
```

If `CAD_TEST_FIXTURE` is unset or missing, the test is skipped and the generic test suite remains successful.

## Verified API surface

The TypeScript declarations expose:

- STEP import into an OCCT shape handle.
- Solid, shell, face, edge, wire, and vertex enumeration.
- Exact analytic bounding boxes, volume, area, and center of mass.
- Face surface classification through `surfaceType`.
- Plane normals through `surfaceNormal` and UV bounds.
- Cylinder radius through `getFaceCylinderData`; no direct cylinder-axis result was exposed by the public method.
- Face edge enumeration, `sharedEdges`, `adjacentFaces`, edge hashes, curve type, and curve length.
- Pairwise `distanceBetween` for shape handles.

## Thickness limitation

`distanceBetween` proves that pairwise geometric distance is available, but it is not a constant-thickness analysis. The public API does not provide a direct operation that selects the opposing face along a face normal, intersects a normal ray with the solid boundary, samples the complete face interior, or validates a thickness distribution. Therefore this spike must not claim that the real part is uniformly 1.5 mm thick.

## Comparison

| Capability | Current `occt-import-js` | `occt-wasm` probe |
|---|---|---|
| STEP import | Verified; returns tessellated mesh hierarchy | Verified API; returns analytic shape handle |
| Mesh/tessellation | Verified | Exposed through `tessellate` / `meshShape` |
| B-Rep face mapping | Verified through `brep_faces` triangle ranges | Shape face handles and hashes |
| Analytic face type | Not exposed | Exposed through `surfaceType` |
| Plane parameters/normal | Mesh-derived normals only | `surfaceNormal` and UV bounds |
| Cylinder parameters | Not exposed | Radius exposed; axis not directly exposed by public API |
| Edge access | Not exposed | Face edges, edge hashes, curve type and length |
| Face adjacency | Not exposed | `sharedEdges` and `adjacentFaces` |
| Actual thickness measurement | Not exposed | Pairwise distance exposed; reliable uniform-thickness validation not exposed as one operation |

## Architecture conclusion

Keep `occt-import-js` for the existing viewer and add `occt-wasm` as a separate analytic backend only if its bundle, browser requirements, and LGPL WASM licensing are acceptable. It can provide the missing B-Rep topology and analytic surface access without replacing the viewer pipeline. A reliable sheet-metal thickness validator still needs a CAD-domain algorithm built on these primitives, with explicit sampling and tolerance policy; this spike does not implement that algorithm.