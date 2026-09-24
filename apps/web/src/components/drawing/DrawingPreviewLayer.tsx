import { memo, useMemo, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { DrawingPreview } from "./draw-preview";

type ViewName = "Front" | "Back" | "Left" | "Right" | "Top" | "Bottom" | "Isometric";
type Props = { preview: DrawingPreview | null; view: ViewName; position: { x: number; y: number }; selected: boolean; onSelect: () => void; onPointerDown: (event: ReactPointerEvent<SVGGElement>) => void };
const backendViewName: Record<ViewName, "front" | "top" | "right" | null> = { Front: "front", Top: "top", Right: "right", Back: null, Left: null, Bottom: null, Isometric: null };
const visibleStyle: CSSProperties = { stroke: "currentColor", strokeWidth: 1.25, fill: "none", vectorEffect: "non-scaling-stroke" };
const hiddenStyle: CSSProperties = { ...visibleStyle, strokeDasharray: "5 4", opacity: 0.55 };
const SHEET_X = 35, SHEET_Y = 35, SHEET_W = 750, SHEET_H = 490;

function DrawingPreviewLayer({ preview, view, position, selected, onSelect, onPointerDown }: Props) {
  const sourceName = backendViewName[view];
  const entities = sourceName && preview?.views?.[sourceName] ? preview.views[sourceName] : [];
  const fit = preview ? Math.min(SHEET_W / preview.sheet_width_mm, SHEET_H / preview.sheet_height_mm) : 1;
  const sheetOffsetX = preview ? SHEET_X + (SHEET_W - preview.sheet_width_mm * fit) / 2 : SHEET_X;
  const sheetOffsetY = preview ? SHEET_Y + (SHEET_H - preview.sheet_height_mm * fit) / 2 : SHEET_Y;
  const sourceOrigin = sourceName && preview ? preview.view_positions[sourceName] : { x: 0, y: 0 };
  const sourcePx = { x: sheetOffsetX + sourceOrigin.x * fit, y: sheetOffsetY + sourceOrigin.y * fit };
  const delta = { x: position.x - sourcePx.x, y: position.y - sourcePx.y };

  const geometry = useMemo(() => entities.map((entity, index) => {
    if (entity.type !== "LINE") return null;
    const x1 = sheetOffsetX + entity.start.x * fit;
    const y1 = sheetOffsetY + entity.start.y * fit;
    const x2 = sheetOffsetX + entity.end.x * fit;
    const y2 = sheetOffsetY + entity.end.y * fit;
    return <line key={`${view}-${index}`} x1={x1} y1={y1} x2={x2} y2={y2} style={entity.layer === "hidden" ? hiddenStyle : visibleStyle} />;
  }), [entities, fit, sheetOffsetX, sheetOffsetY, view]);

  if (!preview || !sourceName) return <g className={`sheet-view ${selected ? "is-selected" : ""}`} transform={`translate(${position.x} ${position.y})`} onClick={(event) => { event.stopPropagation(); onSelect(); }} onPointerDown={(event) => { event.stopPropagation(); onSelect(); onPointerDown(event); }}><rect className="sheet-view-hit" x="-80" y="-54" width="160" height="108" /><text className="view-label" x="0" y="0" textAnchor="middle">LOAD CAD</text><text className="view-label" x="0" y="20" textAnchor="middle">TO PREVIEW</text><text className="view-label" x="0" y="72" textAnchor="middle">{view.toUpperCase()}</text></g>;

  return <g className={`sheet-view ${selected ? "is-selected" : ""}`} onClick={(event) => { event.stopPropagation(); onSelect(); }} onPointerDown={(event) => { event.stopPropagation(); onSelect(); onPointerDown(event); }}>
    <rect className="sheet-view-hit" x={position.x - 80} y={position.y - 54} width={160} height={108} />
    <g transform={`translate(${delta.x} ${delta.y})`}>{geometry}</g>
    <text className="view-label" x={position.x} y={position.y + 72} textAnchor="middle">{view.toUpperCase()}</text>
  </g>;
}

export default memo(DrawingPreviewLayer, (previous, next) => previous.preview === next.preview && previous.view === next.view && previous.position.x === next.position.x && previous.position.y === next.position.y && previous.selected === next.selected);
