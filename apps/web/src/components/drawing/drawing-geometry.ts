export type DrawingPreviewEntity =
  | { type: "LINE"; start: { x: number; y: number }; end: { x: number; y: number } }
  | { type: "CIRCLE"; center: { x: number; y: number }; radius: number }
  | { type: "ARC"; center: { x: number; y: number }; radius: number; startAngle: number; endAngle: number }
  | { type: "TEXT"; position: { x: number; y: number }; text: string; height: number };

export interface DrawingBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function include(bounds: DrawingBounds, x: number, y: number): void {
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
}

export function calculateDrawingBounds(entities: readonly DrawingPreviewEntity[]): DrawingBounds | null {
  if (entities.length === 0) return null;
  const bounds: DrawingBounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const entity of entities) {
    if (entity.type === "LINE") {
      include(bounds, entity.start.x, entity.start.y);
      include(bounds, entity.end.x, entity.end.y);
    } else if (entity.type === "CIRCLE" || entity.type === "ARC") {
      include(bounds, entity.center.x - entity.radius, entity.center.y - entity.radius);
      include(bounds, entity.center.x + entity.radius, entity.center.y + entity.radius);
    } else {
      include(bounds, entity.position.x, entity.position.y - entity.height);
      include(bounds, entity.position.x + entity.text.length * entity.height * 0.6, entity.position.y);
    }
  }
  return bounds;
}

export function drawingBoundsCenter(bounds: DrawingBounds): { x: number; y: number } {
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
}
