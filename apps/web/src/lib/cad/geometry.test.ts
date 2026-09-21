import { strict as assert } from "node:assert";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { analyseGeometry } from "./geometry.ts";
import { analyseSheetMetal, detectThickness } from "./sheet-metal.ts";

const require = createRequire(import.meta.url);
type ImportedNode = { meshes: number[]; children: ImportedNode[] };
const occtimportjs: () => Promise<{
  ReadStepFile: (buffer: Uint8Array, params: null) => {
    success: boolean;
    root: ImportedNode;
    meshes: Array<{
      attributes: { position: { array: ArrayLike<number> } };
      index: { array: ArrayLike<number> };
      brep_faces?: Array<{ first: number; last: number }>;
    }>;
  };
}> = require("occt-import-js");

test("STEP loading succeeds and exposes a solid, faces, and bounds", async () => {
  const occt = await occtimportjs();
  const fixture = readFileSync(
    new URL("../../../node_modules/occt-import-js/test/testfiles/simple-basic-cube/cube.stp", import.meta.url)
  );
  const result = occt.ReadStepFile(new Uint8Array(fixture), null);

  assert.equal(result.success, true);
  const analysis = analyseGeometry(result.root, result.meshes);
  assert.equal(analysis.solidCount, 1);
  assert.ok(analysis.faces.length > 0);
  assert.ok(analysis.faces.every((face) => face.area > 0));
  assert.ok(analysis.faces.some((face) => face.surfaceType === "planar"));
  assert.ok(analysis.bounds);
  assert.ok(analysis.bounds.size.every((size) => size > 0));
});

const realFixturePath = process.env.CAD_TEST_FIXTURE;
const realFixtureSkipReason = !realFixturePath
  ? "CAD_TEST_FIXTURE is not set"
  : !existsSync(realFixturePath)
    ? `CAD_TEST_FIXTURE does not exist: ${realFixturePath}`
    : undefined;

test(
  "real STEP fixture loads through the existing OCCT pipeline",
  { skip: realFixtureSkipReason },
  async () => {
    const occt = await occtimportjs();
    const fixture = readFileSync(realFixturePath as string);
    const result = occt.ReadStepFile(new Uint8Array(fixture), null);

    assert.equal(result.success, true);
    const analysis = analyseGeometry(result.root, result.meshes);
    const sheetMetal = analyseSheetMetal(analysis);

    assert.ok(analysis.solidCount > 0);
    assert.ok(analysis.faces.length > 0);
    assert.ok(analysis.bounds);
    assert.ok(analysis.bounds.size.every((size) => size > 0));
    assert.ok(["candidate", "insufficient-data"].includes(sheetMetal.thickness.status));

    console.info("Real fixture geometry analysis", {
      fixture: realFixturePath,
      solids: analysis.solidCount,
      faces: analysis.faces.length,
      bounds: analysis.bounds,
      thickness: sheetMetal.thickness,
    });
  }
);

test("thickness analysis returns a structured result when topology is unavailable", () => {
  const result = detectThickness({
    solidCount: 1,
    faces: [],
    bounds: null,
    topology: { edges: "unavailable", vertices: "mesh-derived", adjacency: "unavailable" },
    warnings: [],
  });
  assert.equal(result.status, "insufficient-data");
  assert.equal(result.candidate, null);
  assert.ok(result.warnings.length > 0);
});

test("sheet-metal analysis does not overclaim without analytic planar faces", () => {
  const result = analyseSheetMetal({
    solidCount: 1,
    faces: [],
    bounds: null,
    topology: { edges: "unavailable", vertices: "mesh-derived", adjacency: "unavailable" },
    warnings: [],
  });
  assert.equal(result.isCandidate, false);
  assert.equal(result.candidateBendFaces.length, 0);
  assert.equal(result.holesOrCutouts, "unavailable");
});