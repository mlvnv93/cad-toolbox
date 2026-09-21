import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { OcctKernel } from "occt-wasm";
import { classifyThickness, rejectedThicknessMeasurement } from "./thickness.ts";

const fixturePath = process.env.CAD_TEST_FIXTURE;
const skipReason = !fixturePath
  ? "CAD_TEST_FIXTURE is not set"
  : !existsSync(fixturePath)
    ? `CAD_TEST_FIXTURE does not exist: ${fixturePath}`
    : undefined;

test(
  "real fixture reports insufficient evidence without opposing-boundary measurements",
  { skip: skipReason },
  async () => {
    const kernel = await OcctKernel.init();
    try {
      const shape = kernel.importStep(readFileSync(fixturePath as string, "utf8"));
      const faces = kernel.getSubShapes(shape, "face");
      const rejected = faces.map((face, index) => rejectedThicknessMeasurement(
        kernel.hashCode(face, 1_000_000_007),
        index,
        "occt-wasm does not expose the normal-ray/opposing-boundary operation required for a reliable planar thickness sample."
      ));
      const result = classifyThickness(rejected);

      console.info("M5 real fixture thickness result", {
        status: result.status,
        sampleCount: result.measurements.length,
        reliableSampleCount: result.reliableSampleCount,
        rejectedSampleCount: result.rejectedSampleCount,
        nominalThickness: result.nominalThickness,
        minThickness: result.minThickness,
        maxThickness: result.maxThickness,
        maxDeviation: result.maxDeviation,
        tolerance: result.tolerance,
        methods: [...new Set(result.measurements.map((sample) => sample.method))],
        reason: result.reason,
      });

      assert.equal(result.status, "INSUFFICIENT_EVIDENCE");
      assert.equal(result.reliableSampleCount, 0);
      assert.equal(result.rejectedSampleCount, faces.length);
    } finally {
      kernel[Symbol.dispose]();
    }
  }
);