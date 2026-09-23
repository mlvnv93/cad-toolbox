import type { PointerEvent as ReactPointerEvent } from "react";
import type { DrawingPreview } from "./draw-preview";

type ViewName = "Front" | "Back" | "Left" | "Right" | "Top" | "Bottom" | "Isometric";

type Props = {
  preview: DrawingPreview | null;
  view: ViewName;
  position: { x: number; y: number };
  selected: boolean;
  onSelect: () => void;
  onPointerDown: (event: ReactPointerEvent<SVGGElement>) => void;
};

const backendViewName: Record<ViewName, "front" | "top" | "right" | null> = {
  Front: "front",
  Top: "top",
  Right: "right",
  Back: null,
  Left: null,
  Bottom: null,
  Isometric: null,
};

export default function DrawingPreviewLayer({ preview, view, position, selected, onSelect, onPointerDown }: Props) {
  const sourceName = backendViewName[view];
  const entities = sourceName && preview?.views?.[sourceName] ? preview.views[sourceName] : [];

  if (!preview || !sourceName) {
    return (
      <g className={`sheet-view ${selected ? "is-selected" : ""}`} transform={`translate(${position.x} ${position.y})`} onClick={(event) => { event.stopPropagation(); onSelect(); }} onPointerDown={(event) => { event.stopPropagation(); onSelect(); onPointerDown(event); }}>
        <rect className="sheet-view-hit" x="-80" y="-54" width="160" height="108" />
        <text className="view-label" x="0" y="0" textAnchor="middle">LOAD CAD</text>
        <text className="view-label" x="0" y="20" textAnchor="middle">TO PREVIEW</text>
        <text className="view-label" x="0" y="72" textAnchor="middle">{view.toUpperCase()}</text>
      </g>
    );
  }

  const sx = 750 / preview.sheet_width_mm;
  const sy = 490 / preview.sheet_height_mm;
  const sourceOrigin = preview.view_positions[sourceName];
  const sourcePx = { x: 35 + sourceOrigin.x * sx, y: 35 + sourceOrigin.y * sy };
  const delta = { x: position.x - sourcePx.x, y: position.y - sourcePx.y };

  return (
    <g className={`sheet-view ${selected ? "is-selected" : ""}`} onClick={(event) => { event.stopPropagation(); onSelect(); }} onPointerDown={(event) => { event.stopPropagation(); onSelect(); onPointerDown(event); }}>
      <rect className="sheet-view-hit" x={position.x - 80} y={position.y - 54} width="160" height="108" />
      <g transform={`translate(${delta.x} ${delta.y})`}>
        {entities.map((entity, index) => {
          if (entity.type !== "LINE") return null;
          const x1 = 35 + entity.start.x * sx;
          const y1 = 35 + entity.start.y * sy;
          const x2 = 35 + entity.end.x * sx;
          const y2 = 35 + entity.end.y * sy;
          return <line key={`${view}-${index}`} className={entity.layer === "hidden" ? "view-hidden-line" : "view-geometry-line"} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
      <text className="view-label" x={position.x} y={position.y + 72} textAnchor="middle">{view.toUpperCase()}</text>
    </g>
  );
}
