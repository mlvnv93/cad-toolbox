import type { FaceInfo, GeometryAnalysis } from "./geometry";

export interface ThicknessResult {
  status: "candidate" | "insufficient-data";
  candidate: number | null;
  tolerance: number;
  measurements: number[];
  method: "opposed-planar-face-centroids" | "unavailable";
  confidence: number;
  warnings: string[];
}

export interface SheetMetalAnalysis {
  isCandidate: boolean;
  confidence: number;
  thickness: ThicknessResult;
  planarFaces: FaceInfo[];
  candidateBendFaces: FaceInfo[];
  holesOrCutouts: "unavailable";
  warnings: string[];
}

const dot = (a: [number, number, number], b: [number, number, number]) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function detectThickness(analysis: GeometryAnalysis): ThicknessResult {
  const planarFaces = analysis.faces.filter(
    (face) => face.surfaceType === "planar" && face.normal && face.centroid
  );
  if (planarFaces.length < 2) {
    return {
      status: "insufficient-data",
      candidate: null,
      tolerance: 0,
      measurements: [],
      method: "unavailable",
      confidence: 0,
      warnings: ["At least two analytic planar faces are required; the current importer labels surfaces as unknown."],
    };
  }
  const measurements: number[] = [];
  for (const first of planarFaces) {
    for (const second of planarFaces) {
      if (first.id >= second.id || !first.normal || !second.normal || !first.centroid || !second.centroid) continue;
      if (dot(first.normal, second.normal) > -0.999) continue;
      measurements.push(Math.abs(dot(first.normal, [
        second.centroid[0] - first.centroid[0],
        second.centroid[1] - first.centroid[1],
        second.centroid[2] - first.centroid[2],
      ])));
    }
  }
  if (measurements.length === 0) {
    return {
      status: "insufficient-data", candidate: null, tolerance: 0, measurements,
      method: "opposed-planar-face-centroids", confidence: 0,
      warnings: ["No opposed planar face pair was available for thickness measurement."],
    };
  }
  const candidate = Math.min(...measurements);
  const tolerance = Math.max(candidate * 0.05, 0.01);
  const matching = measurements.filter((value) => Math.abs(value - candidate) <= tolerance).length;
  return {
    status: "candidate", candidate, tolerance, measurements,
    method: "opposed-planar-face-centroids", confidence: matching / measurements.length,
    warnings: ["Thickness is an approximate centroid-to-centroid estimate and is not suitable for unfolding."],
  };
}

export function analyseSheetMetal(analysis: GeometryAnalysis): SheetMetalAnalysis {
  const planarFaces = analysis.faces.filter((face) => face.surfaceType === "planar");
  const thickness = detectThickness(analysis);
  const warnings = [...analysis.warnings, ...thickness.warnings];
  return {
    isCandidate: planarFaces.length > 0 && thickness.status === "candidate" && thickness.confidence >= 0.5,
    confidence: thickness.confidence,
    thickness,
    planarFaces,
    candidateBendFaces: [],
    holesOrCutouts: "unavailable",
    warnings,
  };
}