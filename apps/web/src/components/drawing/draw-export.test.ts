import assert from "node:assert/strict";
import test from "node:test";
import { createDrawingExportRequest } from "./draw-export.ts";

test("DXF export request uses the DXF endpoint and drawing configuration", () => {
  const file = new File(["STEP"], "part.step");
  const request = createDrawingExportRequest(
    "https://api.example.test",
    "dxf",
    file,
    "A3",
    "landscape",
    "FIRST_ANGLE",
  );

  assert.equal(request.url, "https://api.example.test/draw/dxf");
  assert.equal(request.filenameExtension, "dxf");
  assert.equal(request.body.get("file"), file);
  assert.equal(request.body.get("paper_size"), "A3");
  assert.equal(request.body.get("orientation"), "landscape");
  assert.equal(request.body.get("projection_type"), "FIRST_ANGLE");
});

test("PDF export request preserves the existing drawings endpoint", () => {
  const request = createDrawingExportRequest(
    "http://127.0.0.1:8000",
    "pdf",
    new File(["STEP"], "part.step"),
    "A4",
    "portrait",
    "THIRD_ANGLE",
  );

  assert.equal(request.url, "http://127.0.0.1:8000/drawings");
  assert.equal(request.filenameExtension, "pdf");
});