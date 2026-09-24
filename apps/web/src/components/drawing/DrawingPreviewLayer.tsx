import { memo, useMemo, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { DrawingPreview } from "./draw-preview";

type ViewName = "Front" | "Back" | "Left" | "Right" | "Top" | "Bottom" | "Isometric";
type Props = { preview: DrawingPreview | null; view: ViewName; position: { x: number; y: number }; selected: boolean; onSelect: () => void; onPointerDown: (event: ReactPointerEvent<SVGGElement>) => void };
const backendViewName: Record<ViewName, "front" | "top" | "right" | null> = { Front: "front", Top: "top", Right: "right", Back: null, Left: null, Bottom: null, Isometric: null };
const visibleStyle: CSSProperties = { stroke: "currentColor", strokeWidth: 0.35, fill: "none", vectorEffect: "non-scaling-stroke" };
const hiddenStyle: CSSProperties = { ...visibleStyle, strokeDasharray: "2.5 2", opacity: 0.55 };
const HIT_PADDING = 2;
const LABEL_GAP = 5;

type GeometryPaths = { visible: string; hidden: string };
type GeometryBounds = { minX: number; minY: number; maxX: number; maxY: number };

function DrawingPreviewLayer({ preview, view, position, selected, onSelect, onPointerDown }: Props) {
  const sourceName = backendViewName[view];
  const entities = sourceName && preview?.views?.[sourceName] ? preview.views[sourceName] : [];

  const geometry = useMemo(() => {
    if (!preview || !sourceName || entities.length === 0) return null;
    const bounds: GeometryBounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    const visible: string[] = [];
    const hidden: string[] = [];
    for (const entity of entities) {
      if (entity.type !== "LINE") continue;
      const x1 = entity.start.x;
      const y1 = entity.start.y;
      const x2 = entity.end.x;
      const y2 = entity.end.y;
      bounds.minX = Math.min(bounds.minX, x1, x2);
      bounds.minY = Math.min(bounds.minY, y1, y2);
      bounds.maxX = Math.max(bounds.maxX, x1, x2);
      bounds.maxY = Math.max(bounds.maxY, y1, y2);
      (entity.layer === "hidden" ? hidden : visible).push(`M ${x1} ${y1} L ${x2} ${y2}`);
    }
    if (!Number.isFinite(bounds.minX)) return null;
    return { paths: { visible: visible.join(" "), hidden: hidden.join(" ") } as GeometryPaths, bounds };
  }, [entities, preview, sourceName]);

  if (!preview || !sourceName) return <g className={`sheet-view ${selected ? "is-selected" : ""}`} transform={`translate(${position.x} ${position.y})`} onClick={(event) => { event.stopPropagation(); onSelect(); }} onPointerDown={(event) => { event.stopPropagation(); onSelect(); onPointerDown(event); }}><rect className="sheet-view-hit" x="-30" y="-20" width="60" height="40" /><text className="view-label" x="0" y="0" textAnchor="middle">LOAD CAD</text><text className="view-label" x="0" y="7" textAnchor="middle">TO PREVIEW</text><text className="view-label" x="0" y="27" textAnchor="middle">{view.toUpperCase()}</text></g>;
  if (!geometry) return null;

  const { bounds, paths } = geometry;
  const geometryCenter = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  const delta = { x: position.x - geometryCenter.x, y: position.y - geometryCenter.y };
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const hitX = bounds.minX + delta.x - HIT_PADDING;
  const hitY = bounds.minY + delta.y - HIT_PADDING;
  const hitWidth = Math.max(width + HIT_PADDING * 2, 8);
  const hitHeight = Math.max(height + HIT_PADDING * 2, 8);
  const labelY = bounds.maxY + delta.y + LABEL_GAP;

  return <g className={`sheet-view ${selected ? "is-selected" : ""}`} onClick={(event) => { event.stopPropagation(); onSelect(); }} onPointerDown={(event) => { event.stopPropagation(); onSelect(); onPointerDown(event); }}>
    <rect className="sheet-view-hit" x={hitX} y={hitY} width={hitWidth} height={hitHeight} />
    <g transform={`translate(${delta.x} ${delta.y})`}>
      {paths.visible && <path d={paths.visible} style={visibleStyle} />}
      {paths.hidden && <path d={paths.hidden} style={hiddenStyle} />}
    </g>
    <text className="view-label" x={position.x} y={labelY} textAnchor="middle">{view.toUpperCase()}</text>
  </g>;
}

export default memo(DrawingPreviewLayer, (previous, next) => previous.preview === next.preview && previous.view === next.view && previous.position.x === next.position.x && previous.position.y === next.position.y && previous.selected === next.selected);
