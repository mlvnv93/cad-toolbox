export type ThicknessStatus =
  | "CONSTANT_THICKNESS"
  | "VARIABLE_THICKNESS"
  | "INSUFFICIENT_EVIDENCE";

export type ThicknessSurface = "PLANAR" | "CYLINDRICAL";

export interface ThicknessMeasurement {
  sourceFaceId: number;
  targetFaceId: number;
  point: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  distance: number;
  sourceSurface: ThicknessSurface;
  targetSurface: ThicknessSurface;
  method: "OPPOSING_FACE_DISTANCE" | "CYLINDER_RADIAL_DIFFERENCE";
  reliable: boolean;
  reason?: string;
}

export interface ThicknessAnalysis {
  status: ThicknessStatus;
  nominalThickness?: number;
  minThickness?: number;
  maxThickness?: number;
  maxDeviation?: number;
  tolerance: number;
  measurements: ThicknessMeasurement[];
  reliableSampleCount: number;
  rejectedSampleCount: number;
  reason?: string;
}

export interface ThicknessClassificationOptions {
  absoluteTolerance: number;
  relativeTolerance: number;
  minimumReliableSamples: number;
}

export interface CylindricalFaceDescriptor {
  faceId: number;
  radius: number;
  point: { x: number; y: number; z: number };
  axis: { x: number; y: number; z: number };
  compatibleWithOtherFace: boolean;
}

export const DEFAULT_THICKNESS_OPTIONS: ThicknessClassificationOptions = {
  absoluteTolerance: 0.02,
  relativeTolerance: 0.02,
  minimumReliableSamples: 5,
};

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function invalidOptions(options: ThicknessClassificationOptions): string | null {
  if (!Number.isFinite(options.absoluteTolerance) || options.absoluteTolerance < 0) {
    return "absoluteTolerance must be a finite non-negative number.";
  }
  if (!Number.isFinite(options.relativeTolerance) || options.relativeTolerance < 0) {
    return "relativeTolerance must be a finite non-negative number.";
  }
  if (!Number.isInteger(options.minimumReliableSamples) || options.minimumReliableSamples < 1) {
    return "minimumReliableSamples must be a positive integer.";
  }
  return null;
}

function makeTolerance(nominal: number, options: ThicknessClassificationOptions): number {
  return Math.max(options.absoluteTolerance, nominal * options.relativeTolerance);
}

function clusters(values: number[], tolerance: number): number[][] {
  const sorted = [...values].sort((left, right) => left - right);
  const result: number[][] = [];
  for (const value of sorted) {
    const current = result[result.length - 1];
    if (!current || value - current[current.length - 1] > tolerance) {
      result.push([value]);
    } else {
      current.push(value);
    }
  }
  return result;
}

export function classifyThickness(
  measurements: ThicknessMeasurement[],
  options: ThicknessClassificationOptions = DEFAULT_THICKNESS_OPTIONS
): ThicknessAnalysis {
  const optionError = invalidOptions(options);
  const reliable = measurements.filter(
    (measurement) => measurement.reliable && Number.isFinite(measurement.distance) && measurement.distance > 0
  );
  const rejectedSampleCount = measurements.length - reliable.length;
  const base = {
    tolerance: options.absoluteTolerance,
    measurements,
    reliableSampleCount: reliable.length,
    rejectedSampleCount,
  };

  if (optionError) {
    return { ...base, status: "INSUFFICIENT_EVIDENCE", reason: optionError };
  }
  if (reliable.length < options.minimumReliableSamples) {
    return {
      ...base,
      status: "INSUFFICIENT_EVIDENCE",
      reason: `Only ${reliable.length} reliable thickness measurements are available; ${options.minimumReliableSamples} are required.`,
    };
  }

  const values = reliable.map((measurement) => measurement.distance);
  const nominalThickness = median(values);
  const tolerance = makeTolerance(nominalThickness, options);
  const minThickness = Math.min(...values);
  const maxThickness = Math.max(...values);
  const maxDeviation = Math.max(...values.map((value) => Math.abs(value - nominalThickness)));
  const thicknessClusters = clusters(values, tolerance);
  const outlierClusters = thicknessClusters.filter((cluster) => cluster.length >= 2);
  const comparisonEpsilon = Number.EPSILON * Math.max(1, nominalThickness, tolerance) * 16;

  if (maxDeviation <= tolerance + comparisonEpsilon) {
    return {
      ...base,
      status: "CONSTANT_THICKNESS",
      nominalThickness,
      minThickness,
      maxThickness,
      maxDeviation,
      tolerance,
    };
  }

  if (thicknessClusters.length >= 2 && outlierClusters.length >= 2) {
    return {
      ...base,
      status: "VARIABLE_THICKNESS",
      nominalThickness,
      minThickness,
      maxThickness,
      maxDeviation,
      tolerance,
      reason: "Reliable measurements form multiple thickness populations outside the configured tolerance.",
    };
  }

  return {
    ...base,
    status: "INSUFFICIENT_EVIDENCE",
    nominalThickness,
    minThickness,
    maxThickness,
    maxDeviation,
    tolerance,
    reason: "Reliable measurements are inconsistent, but do not establish a second thickness population.",
  };
}

export function measureCylindricalThickness(
  outerFace: CylindricalFaceDescriptor,
  innerFace: CylindricalFaceDescriptor
): ThicknessMeasurement | null {
  if (!outerFace.compatibleWithOtherFace || !innerFace.compatibleWithOtherFace) return null;
  if (!Number.isFinite(outerFace.radius) || !Number.isFinite(innerFace.radius)) return null;
  if (outerFace.radius <= innerFace.radius) return null;

  const distance = outerFace.radius - innerFace.radius;
  return {
    sourceFaceId: outerFace.faceId,
    targetFaceId: innerFace.faceId,
    point: outerFace.point,
    direction: outerFace.axis,
    distance,
    sourceSurface: "CYLINDRICAL",
    targetSurface: "CYLINDRICAL",
    method: "CYLINDER_RADIAL_DIFFERENCE",
    reliable: true,
  };
}

export function rejectedThicknessMeasurement(
  sourceFaceId: number,
  targetFaceId: number,
  reason: string,
  sourceSurface: ThicknessSurface = "PLANAR",
  targetSurface: ThicknessSurface = "PLANAR"
): ThicknessMeasurement {
  return {
    sourceFaceId,
    targetFaceId,
    point: { x: 0, y: 0, z: 0 },
    direction: { x: 0, y: 0, z: 0 },
    distance: 0,
    sourceSurface,
    targetSurface,
    method: "OPPOSING_FACE_DISTANCE",
    reliable: false,
    reason,
  };
}