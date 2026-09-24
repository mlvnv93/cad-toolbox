import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { DrawingPreview } from "./draw-preview";

type ViewName = "Front" | "Back" | "Left" | "Right" | "Top" | "Bottom" | "Isometric";
type Props = { preview: DrawingPreview | null; view: ViewName; position: { x: number; y: number }; selected: boolean; onSelect: () => void; onPointerDown: (event: ReactPointerEvent<SVGGElement>) => void };
const backendViewName: Record<ViewName, "front" | "top" | "right" | null> = { Front: "front", Top: "top", Right: "right", Back: null, Left: null, Bottom: null, Isometric: null };
const visibleStyle: CSSProperties = { stroke: "currentColor", strokeWidth: 1.25, fill: "none", vectorEffect: "non-scaling-stroke" };
const hiddenStyle: CSSProperties = { ...visibleStyle, strokeDasharray: "5 4", opacity: 0.55 };

const SHEET_X = 35;
const SHEET_Y = 35;
const SHEET_W = 750;
const SHEET_H = 490;

export default function DrawingPreviewLayer({ preview, view, position, selected, onSelect, onPointerDown }: Props) {
  const sourceName = backendViewName[view];
  const entities = sourceName && preview?.views?.[sourceName] ? preview.views[sourceName] : [];
  if (!preview || !sourceName) return <g className={`sheet-view ${selected ? "is-selected" : ""}`} transform={`translate(${position.x} ${position.y})`} onClick={(event) => { event.stopPropagation(); onSelect(); }} onPointerDown={(event) => { event.stopPropagation(); onSelect(); onPointerDown(event); }}><rect className="sheet-view-hit" x="-80" y="-54" width="160" height="108" /><text className="view-label" x="0" y="0" textAnchor="middle">LOAD CAD</text><text className="view-label" x="0" y="20" textAnchor="middle">TO PREVIEW</text><text className="view-label" x="0" y="72" textAnchor="middle">{view.toUpperCase()}</text></g>;

  // Backend entities are already in drawing millimetres, including the selected drawing scale.
  // Use one uniform sheet transform so X/Y are never stretched independently.
  const fit = Math.min(SHEET_W / preview.sheet_width_mm, SHEET_H / preview.sheet_height_mm);
  const renderedSheetW = preview.sheet_width_mm * fit;
  const renderedSheetH = preview.sheet_height_mm * fit;
  const sheetOffsetX = SHEET_X + (SHEET_W - renderedSheetW) / 2;
  const sheetOffsetY = SHEET_Y + (SHEET_H - renderedSheetH) / 2;
  const sourceOrigin = preview.view_positions[sourceName];
  const sourcePx = { x: sheetOffsetX + sourceOrigin.x * fit, y: sheetOffsetY + sourceOrigin.y * fit };
  const delta = { x: position.x - sourcePx.x, y: position.y - sourcePx.y };

  return <g className={`sheet-view ${selected ? "is-selected" : ""}`} onClick={(event) => { event.stopPropagation(); onSelect(); }} onPointerDown={(event) => { event.stopPropagation(); onSelect(); onPointerDown(event); }}>
    <rect className="sheet-view-hit" x={position.x - 80} y={position.y - 54} width={160} height={108} />
    <g transform={`translate(${delta.x} ${delta.y})`}>
      {entities.map((entity, index) => {
        if (entity.type !== "LINE") return null;
        const x1 = sheetOffsetX + entity.start.x * fit;
        const y1 = sheetOffsetY + entity.start.y * fit;
        const x2 = sheetOffsetX + entity.end.x * fit;
        const y2 = sheetOffsetY + entity.end.y * fit;
        return <line key={`${view}-${index}`} x1={x1} y1={y1} x2={x2} y2={y2} style={entity.layer === "hidden" ? hiddenStyle : visibleStyle} />;
      })}
    </g>
    <text className="view-label" x={position.x} y={position.y + 72} textAnchor="middle">{view.toUpperCase()}</text>
  </g>;
}
