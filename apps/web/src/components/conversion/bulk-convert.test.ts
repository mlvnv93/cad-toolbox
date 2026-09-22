import assert from "node:assert/strict";
import test from "node:test";
import { canStartConversion, isSupportedInput, parseDownloadName } from "./bulk-convert.ts";

test("accepts only STEP and STP inputs", () => {
  assert.equal(isSupportedInput("Bracket.step"), true);
  assert.equal(isSupportedInput("Housing.STP"), true);
  assert.equal(isSupportedInput("Bracket.iges"), false);
});

test("requires files and an output format and blocks active requests", () => {
  assert.equal(canStartConversion(1, "stl", false), true);
  assert.equal(canStartConversion(0, "stl", false), false);
  assert.equal(canStartConversion(1, "", false), false);
  assert.equal(canStartConversion(1, "stl", true), false);
});

test("uses the server download filename when available", () => {
  assert.equal(parseDownloadName('attachment; filename="CAD3D-KIT-converted.zip"', "fallback.zip"), "CAD3D-KIT-converted.zip");
  assert.equal(parseDownloadName(null, "fallback.zip"), "fallback.zip");
});
