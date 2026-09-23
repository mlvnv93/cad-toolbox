export type DrawingPreviewEntity =
  | { type: "LINE"; start: { x: number; y: number }; end: { x: number; y: number }; layer: string }
  | { type: "CIRCLE"; center: { x: number; y: number }; radius: number; layer: string }
  | { type: "ARC"; center: { x: number; y: number }; radius: number; start_angle: number; end_angle: number; layer: string }
  | { type: "TEXT"; position: { x: number; y: number }; text: string; height: number; layer: string };

type DrawingViewKey = "front" | "top" | "right";

export type DrawingPreview = {
  units: string;
  sheet_width_mm: number;
  sheet_height_mm: number;
  scale: number;
  layers: string[];
  entities: DrawingPreviewEntity[];
  views: Record<DrawingViewKey, DrawingPreviewEntity[]>;
  view_positions: Record<DrawingViewKey, { x: number; y: number }>;
};

export function createDrawingPreviewRequest(apiUrl: string | undefined, file: File, paperSize: string, orientation: string, projectionType: string): { url: string; body: FormData } {
  const baseUrl = (apiUrl || "http://127.0.0.1:8000").replace(/\/$/, "");
  const body = new FormData();
  body.append("file", file);
  body.append("paper_size", paperSize);
  body.append("orientation", orientation);
  body.append("projection_type", projectionType);
  return { url: `${baseUrl}/draw/preview`, body };
}
