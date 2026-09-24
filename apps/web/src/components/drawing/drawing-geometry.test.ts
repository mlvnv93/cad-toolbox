import assert from "node:assert/strict";
import test from "node:test";
import { calculateDrawingBounds, drawingBoundsCenter } from "./drawing-geometry.ts";

test("calculates bounds from line, circle, arc, and text entities", () => {
  const bounds = calculateDrawingBounds([
    { type: "LINE", start: { x: 10, y: 20 }, end: { x: 30, y: 40 } },
    { type: "CIRCLE", center: { x: 50, y: 50 }, radius: 5 },
    { type: "ARC", center: { x: -10, y: 0 }, radius: 3, startAngle: 0, endAngle: Math.PI },
    { type: "TEXT", position: { x: 0, y: 60 }, text: "AB", height: 5 },
  ]);

  assert.deepEqual(bounds, { minX: -13, minY: -3, maxX: 55, maxY: 60 });
  assert.deepEqual(drawingBoundsCenter(bounds!), { x: 21, y: 28.5 });
});

test("returns no bounds for an empty view", () => {
  assert.equal(calculateDrawingBounds([]), null);
});
