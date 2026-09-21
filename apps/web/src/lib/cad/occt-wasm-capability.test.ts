import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { OcctKernel, type ShapeHandle } from "occt-wasm";

const fixturePath = process.env.CAD_TEST_FIXTURE;
const skipReason = !fixturePath
  ? "CAD_TEST_FIXTURE is not set"
  : !existsSync(fixturePath)
    ? `CAD_TEST_FIXTURE does not exist: ${fixturePath}`
    : undefined;

function readStepText(path: string): string {
  return readFileSync(path, "utf8");
}

function shapeId(kernel: OcctKernel, shape: ShapeHandle): number {
  return kernel.hashCode(shape, 1_000_000_007);
}

test(
  "occt-wasm exposes analytic B-Rep capabilities for the real STEP fixture",
  { skip: skipReason },
  async () => {
    const kernel = await OcctKernel.init();

    try {
      const shape = kernel.importStep(readStepText(fixturePath as string));
      const solids = kernel.getSubShapes(shape, "solid");
      const shells = kernel.getSubShapes(shape, "shell");
      const faces = kernel.getSubShapes(shape, "face");
      const edges = kernel.getSubShapes(shape, "edge");
      const bounds = kernel.getBoundingBox(shape);

      assert.ok(solids.length > 0, "the STEP import should contain a solid");
      assert.ok(faces.length > 0, "the STEP import should contain faces");

      const surfaceCounts = {
        plane: 0,
        cylinder: 0,
        other: 0,
      };
      const cylinders: Array<{ face: number; radius: number }> = [];
      const normals: Array<{ face: number; normal: { x: number; y: number; z: number } }> = [];

      for (const face of faces) {
        const surface = kernel.surfaceType(face);
        if (surface === "plane") {
          surfaceCounts.plane += 1;
          const uv = kernel.uvBounds(face);
          normals.push({ face: shapeId(kernel, face), normal: kernel.surfaceNormal(face, (uv.uMin + uv.uMax) / 2, (uv.vMin + uv.vMax) / 2) });
        } else if (surface === "cylinder") {
          surfaceCounts.cylinder += 1;
          const cylinder = kernel.getFaceCylinderData(face);
          if (cylinder) cylinders.push({ face: shapeId(kernel, face), radius: cylinder.radius });
        } else {
          surfaceCounts.other += 1;
        }
      }

      const firstFace = faces[0];
      const firstFaceEdges = kernel.getSubShapes(firstFace, "edge");
      const firstFaceAdjacency = kernel.adjacentFaces(shape, firstFace);
      const sharedEdgeSamples = faces.slice(0, 8).flatMap((face, index) => {
        const nextFace = faces[index + 1];
        if (!nextFace) return [];
        return kernel.sharedEdges(face, nextFace).map((edge) => ({
          faceA: shapeId(kernel, face),
          faceB: shapeId(kernel, nextFace),
          edge: shapeId(kernel, edge),
          curveType: kernel.curveType(edge),
          length: kernel.curveLength(edge),
        }));
      });

      const thicknessPairDistance = faces.length >= 2
        ? kernel.distanceBetween(faces[0], faces[1])
        : null;

      console.info("OCCT-WASM capability result", {
        package: "occt-wasm@5.3.0",
        fixture: fixturePath,
        solids: solids.length,
        shells: shells.length,
        faces: faces.length,
        edges: edges.length,
        bounds,
        surfaceCounts,
        cylinderSamples: cylinders.slice(0, 10),
        planeNormalSamples: normals.slice(0, 10),
        firstFace: {
          edgeCount: firstFaceEdges.length,
          adjacentFaceCount: firstFaceAdjacency.length,
        },
        sharedEdgeSamples,
        thicknessCapability: {
          pairDistanceSample: thicknessPairDistance,
          reliableUniformThickness: false,
          reason: "The public API exposes pairwise shape distance but no direct normal-ray intersection, opposing-face selection, or uniform-thickness validator.",
        },
      });
    } finally {
      kernel[Symbol.dispose]();
    }
  }
);