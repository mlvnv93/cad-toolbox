export type SurfaceType = "planar" | "non-planar" | "unknown";

export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
}

export interface FaceInfo {
  id: string;
  meshIndex: number;
  triangleStart: number;
  triangleEnd: number;
  area: number;
  normal: [number, number, number] | null;
  centroid: [number, number, number] | null;
  surfaceType: SurfaceType;
}

export interface GeometryAnalysis {
  solidCount: number;
  faces: FaceInfo[];
  bounds: BoundingBox | null;
  topology: {
    edges: "unavailable";
    vertices: "mesh-derived";
    adjacency: "unavailable";
  };
  warnings: string[];
}

type MeshData = {
  attributes: {
    position: { array: ArrayLike<number> };
  };
  index: { array: ArrayLike<number> };
  brep_faces?: Array<{
    first: number;
    last: number;
  }>;
};

type GeometryNode = {
  meshes: number[];
  children?: GeometryNode[];
};

type Point = [number, number, number];

const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const subtract = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Point, b: Point): Point => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Point, b: Point): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (point: Point, factor: number): Point => [point[0] * factor, point[1] * factor, point[2] * factor];
const length = (point: Point): number => Math.hypot(point[0], point[1], point[2]);

function pointAt(positions: ArrayLike<number>, index: number): Point {
  return [positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]];
}

function collectMeshIndices(node: GeometryNode, result: number[]): void {
  result.push(...node.meshes);
  for (const child of node.children ?? []) collectMeshIndices(child, result);
}

function createBounds(meshes: MeshData[]): BoundingBox | null {
  const min: Point = [Infinity, Infinity, Infinity];
  const max: Point = [-Infinity, -Infinity, -Infinity];
  let hasPoint = false;
  for (const mesh of meshes) {
    const positions = mesh.attributes.position.array;
    for (let index = 0; index < positions.length; index += 3) {
      hasPoint = true;
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], positions[index + axis]);
        max[axis] = Math.max(max[axis], positions[index + axis]);
      }
    }
  }
  return hasPoint ? { min, max, size: subtract(max, min) } : null;
}

function analyseFace(mesh: MeshData, meshIndex: number, faceIndex: number, range: { first: number; last: number }): FaceInfo {
  const positions = mesh.attributes.position.array;
  const indices = mesh.index.array;
  let area = 0;
  let normal: Point = [0, 0, 0];
  let centroid: Point = [0, 0, 0];
  let triangleCount = 0;
  let referenceNormal: Point | null = null;
  let planar = true;
  for (let triangle = range.first; triangle <= range.last; triangle += 1) {
    const a = pointAt(positions, indices[triangle * 3]);
    const b = pointAt(positions, indices[triangle * 3 + 1]);
    const c = pointAt(positions, indices[triangle * 3 + 2]);
    const crossProduct = cross(subtract(b, a), subtract(c, a));
    const triangleArea = length(crossProduct) / 2;
    const triangleNormal = length(crossProduct) > 0 ? scale(crossProduct, 1 / length(crossProduct)) : null;
    if (triangleNormal) {
      referenceNormal ??= triangleNormal;
      planar = planar && Math.abs(dot(referenceNormal, triangleNormal)) >= 0.999;
    }
    area += triangleArea;
    normal = add(normal, crossProduct);
    centroid = add(centroid, scale(add(add(a, b), c), triangleArea));
    triangleCount += 1;
  }
  const normalLength = length(normal);
  return {
    id: `mesh-${meshIndex}-face-${faceIndex}`,
    meshIndex,
    triangleStart: range.first,
    triangleEnd: range.last,
    area,
    normal: normalLength > 0 ? scale(normal, 1 / normalLength) : null,
    centroid: area > 0 && triangleCount > 0 ? scale(centroid, 1 / (area * 3)) : null,
    surfaceType: planar && referenceNormal ? "planar" : "non-planar",
  };
}

export function analyseGeometry(root: GeometryNode, meshes: MeshData[]): GeometryAnalysis {
  const meshIndices: number[] = [];
  collectMeshIndices(root, meshIndices);
  const faces = meshIndices.flatMap((meshIndex) => {
    const mesh = meshes[meshIndex];
    return (mesh?.brep_faces ?? []).map((range, faceIndex) => analyseFace(mesh, meshIndex, faceIndex, range));
  });
  const warnings = [
    "OCCT analytic surface, edge, vertex, and adjacency queries are unavailable in occt-import-js.",
  ];
  if (faces.length === 0) warnings.push("The importer returned no B-Rep face ranges for mesh analysis.");
  return {
    solidCount: meshIndices.length,
    faces,
    bounds: createBounds(meshIndices.map((index) => meshes[index]).filter(Boolean)),
    topology: { edges: "unavailable", vertices: "mesh-derived", adjacency: "unavailable" },
    warnings,
  };
}