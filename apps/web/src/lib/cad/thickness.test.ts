import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  classifyThickness,
  measureCylindricalThickness,
  rejectedThicknessMeasurement,
  type ThicknessMeasurement,
} from "./thickness.ts";

function measurement(distance: number, reliable = true): ThicknessMeasurement {
  return {
    sourceFaceId: 1,
    targetFaceId: 2,
    point: { x: 0, y: 0, z: 0 },
    direction: { x: 0, y: 0, z: 1 },
    distance,
    sourceSurface: "PLANAR",
    targetSurface: "PLANAR",
    method: "OPPOSING_FACE_DISTANCE",
    reliable,
  };
}

test("classifies clustered measurements as constant thickness", () => {
  const result = classifyThickness([1.5, 1.49, 1.51, 1.5, 1.5].map((value) => measurement(value)));
  assert.equal(result.status, "CONSTANT_THICKNESS");
  assert.equal(result.nominalThickness, 1.5);
  assert.equal(result.reliableSampleCount, 5);
});

test("classifies two reliable thickness populations as variable", () => {
  const result = classifyThickness([1.5, 1.5, 1.49, 2, 2.01, 2].map((value) => measurement(value)));
  assert.equal(result.status, "VARIABLE_THICKNESS");
  assert.equal(result.minThickness, 1.49);
  assert.equal(result.maxThickness, 2.01);
});

test("returns insufficient evidence for too few reliable samples", () => {
  const result = classifyThickness([measurement(1.5), measurement(1.5)]);
  assert.equal(result.status, "INSUFFICIENT_EVIDENCE");
  assert.equal(result.reliableSampleCount, 2);
});

test("accepts small numerical variation within configured tolerance", () => {
  const result = classifyThickness([1.5, 1.501, 1.499, 1.502, 1.498].map((value) => measurement(value)), {
    absoluteTolerance: 0.002,
    relativeTolerance: 0.001,
    minimumReliableSamples: 5,
  });
  assert.equal(result.status, "CONSTANT_THICKNESS");
  assert.ok((result.maxDeviation ?? Infinity) <= (result.tolerance ?? 0) + 1e-12);
});

test("measures compatible cylindrical inner and outer radii", () => {
  const result = measureCylindricalThickness(
    {
      faceId: 10,
      radius: 6.5,
      point: { x: 0, y: 0, z: 0 },
      axis: { x: 0, y: 0, z: 1 },
      compatibleWithOtherFace: true,
    },
    {
      faceId: 11,
      radius: 5,
      point: { x: 0, y: 0, z: 0 },
      axis: { x: 0, y: 0, z: 1 },
      compatibleWithOtherFace: true,
    }
  );
  assert.equal(result?.distance, 1.5);
  assert.equal(result?.method, "CYLINDER_RADIAL_DIFFERENCE");
  assert.equal(result?.reliable, true);
});

test("rejects arbitrary nearby faces instead of treating distanceBetween as thickness", () => {
  const result = classifyThickness([
    rejectedThicknessMeasurement(1, 2, "The target is not proven to be the opposing material boundary."),
    rejectedThicknessMeasurement(3, 4, "Normal-ray intersection is unavailable."),
  ]);
  assert.equal(result.status, "INSUFFICIENT_EVIDENCE");
  assert.equal(result.reliableSampleCount, 0);
  assert.equal(result.rejectedSampleCount, 2);
});
