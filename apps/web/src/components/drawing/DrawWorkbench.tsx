"use client";

import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

type ViewName = "Front" | "Back" | "Left" | "Right" | "Top" | "Bottom" | "Isometric";
type DimensionType = "Linear" | "Angular" | "Diameter" | "Radius";

const viewNames: ViewName[] = ["Front", "Back", "Left", "Right", "Top", "Bottom", "Isometric"];

const viewSymbols: Record<ViewName, string> = {
  Front: "↑",
  Back: "↓",
  Left: "←",
  Right: "→",
  Top: "⌃",
  Bottom: "⌄",
  Isometric: "◇",
};

const viewPositions: Record<ViewName, { x: number; y: number }> = {
  Front: { x: 410, y: 250 },
  Back: { x: 410, y: 250 },
  Left: { x: 410, y: 250 },
  Right: { x: 410, y: 250 },
  Top: { x: 410, y: 250 },
  Bottom: { x: 410, y: 250 },
  Isometric: { x: 410, y: 250 },
};

const initialPlacedViewPositions: Record<ViewName, { x: number; y: number }> = {
  ...viewPositions,
  Front: { x: 260, y: 250 },
  Top: { x: 410, y: 390 },
  Right: { x: 560, y: 250 },
};

function PanelSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return <details className="draw-section" open={defaultOpen}><summary>{title}<span aria-hidden="true">⌄</span></summary>{children}</details>;
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="draw-setting"><span>{label}</span>{children}</label>;
}

export default function DrawWorkbench() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [placedViews, setPlacedViews] = useState<ViewName[]>(["Front", "Top", "Right"]);
  const [placedViewPositions, setPlacedViewPositions] = useState<Record<ViewName, { x: number; y: number }>>(initialPlacedViewPositions);
  const [selectedView, setSelectedView] = useState<ViewName | null>("Front");
  const [draggedView, setDraggedView] = useState<ViewName | null>(null);
  const [movingView, setMovingView] = useState<ViewName | null>(null);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [dimensionType, setDimensionType] = useState<DimensionType | null>(null);
  const [dimensionPoints, setDimensionPoints] = useState<number[]>([]);
  const [titleBlockOpen, setTitleBlockOpen] = useState(false);
  const [title, setTitle] = useState("800000182_1");
  const [partNumber, setPartNumber] = useState("PART-001");
  const [paperSize, setPaperSize] = useState("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [exporting, setExporting] = useState(false);

  const addView = (view: ViewName) => {
    setPlacedViews((current) => current.includes(view) ? current : [...current, view]);
    setSelectedView(view);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (nextFile) {
      setFile(nextFile);
      setTitle(nextFile.name.replace(/\.(step|stp)$/i, ""));
    }
  };

  const beginDimension = (type: DimensionType) => {
    setDimensionType(type);
    setDimensionPoints([]);
  };

  const selectSheetPoint = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!dimensionType || dimensionPoints.length >= (dimensionType === "Linear" ? 2 : 1)) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 820;
    setDimensionPoints((points) => [...points, x]);
  };

  const movePlacedView = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!movingView) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 820;
    const y = ((event.clientY - bounds.top) / bounds.height) * 560;
    setPlacedViewPositions((positions) => ({ ...positions, [movingView]: { x, y } }));
  };

  const exportDrawing = async () => {
    if (!file || exporting) return;
    setExporting(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("paper_size", paperSize);
      data.append("orientation", orientation);
      const response = await fetch(`${process.env.NEXT_PUBLIC_DRAWING_API_URL}/drawings`, { method: "POST", body: data });
      if (!response.ok) throw new Error("Drawing export failed");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title || "drawing"}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("We could not export the drawing. Load a STEP file and try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="drawing-generator">
      <header className="drawing-header">
        <Link className="brand-lockup" href="/"><span className="brand-mark" aria-hidden="true" /><span>CAD Toolbox</span></Link>
        <div className="drawing-header-actions">
          <Link className="back-link" href="/"><span aria-hidden="true">←</span> Back to CAD Toolbox</Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="drawing-filebar">
        <label className="drawing-file-button"><span aria-hidden="true">↥</span> Load CAD<input type="file" accept=".step,.stp" onChange={handleFileChange} /></label>
        <span className="drawing-file-name">{file?.name || "No CAD file loaded"}</span>
        <span className="drawing-workflow-hint">Load CAD <b>›</b> Configure sheet <b>›</b> Place views <b>›</b> Export</span>
      </div>

      <div className="drawing-workbench">
        <aside className={`drawing-panel drawing-settings-panel ${leftOpen ? "" : "is-collapsed"}`}>
          <button className="drawing-collapse" type="button" onClick={() => setLeftOpen((open) => !open)} aria-label={leftOpen ? "Collapse drawing settings" : "Expand drawing settings"}>{leftOpen ? "‹" : "›"}</button>
          {leftOpen && <div className="drawing-panel-content">
            <div className="drawing-panel-heading"><span className="drawing-panel-kicker">Drawing settings</span><h1>Sheet setup</h1></div>
            <PanelSection title="File information">
              <SettingRow label="Part / Assembly"><select><option>Part</option><option>Assembly</option></select></SettingRow>
              <SettingRow label="File"><span className="draw-value">{file?.name || "Not loaded"}</span></SettingRow>
            </PanelSection>
            <PanelSection title="Sheet">
              <SettingRow label="Units"><select><option>Millimetres (mm)</option><option>Inches (in)</option></select></SettingRow>
              <SettingRow label="Paper size"><select value={paperSize} onChange={(event) => setPaperSize(event.target.value)}><option value="A4">A4</option><option value="A3">A3</option><option value="A2">A2</option><option value="A1">A1</option></select></SettingRow>
              <SettingRow label="Orientation"><span className="draw-segmented"><button className={orientation === "portrait" ? "is-selected" : ""} type="button" onClick={() => setOrientation("portrait")}>Portrait</button><button className={orientation === "landscape" ? "is-selected" : ""} type="button" onClick={() => setOrientation("landscape")}>Landscape</button></span></SettingRow>
              <SettingRow label="Drawing scale"><select><option>Automatic · 1:1</option><option>1:2</option><option>1:5</option><option>1:10</option><option>2:1</option></select></SettingRow>
              <SettingRow label="Template"><select><option>CAD Toolbox — A3</option><option>Plain sheet</option></select></SettingRow>
              <SettingRow label="Projection"><select><option>Third angle</option><option>First angle</option></select></SettingRow>
            </PanelSection>
            <PanelSection title="Line display">
              <SettingRow label="Line display"><select><option>Technical</option><option>Monochrome</option></select></SettingRow>
              <SettingRow label="Hidden lines"><input type="checkbox" defaultChecked /></SettingRow>
              <SettingRow label="Centre lines"><input type="checkbox" /></SettingRow>
            </PanelSection>
          </div>}
        </aside>

        <section className="drawing-stage" aria-label="Technical drawing preview">
          <div className="drawing-stage-topline"><span>DRAWING PREVIEW</span><span>{paperSize} · {orientation.toUpperCase()} · mm</span></div>
          <div className="drawing-sheet-wrap">
            <svg className="drawing-sheet" viewBox="0 0 820 560" role="img" aria-label="Technical drawing sheet. Drop views here to place them." onClick={selectSheetPoint} onPointerMove={movePlacedView} onPointerUp={() => setMovingView(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (draggedView) addView(draggedView); }}>
              <rect className="sheet-paper" x="18" y="18" width="784" height="524" />
              <path className="sheet-border" d="M35 35h750v490H35zM52 52h716v456H52z" />
              <path className="sheet-zone" d="M52 420h716M560 420v88M650 420v88" />
              <text className="sheet-label" x="64" y="80">CAD TOOLBOX / ENGINEERING DRAWING</text>
              {placedViews.map((view) => {
                const base = placedViewPositions[view];
                const x = base.x;
                const y = base.y;
                return <g key={view} className={`sheet-view ${selectedView === view ? "is-selected" : ""}`} transform={`translate(${x} ${y})`} onClick={(event) => { event.stopPropagation(); setSelectedView(view); }} onPointerDown={(event) => { event.stopPropagation(); setSelectedView(view); setMovingView(view); }}>
                  <rect className="sheet-view-hit" x="-80" y="-54" width="160" height="108" />
                  <path className="view-geometry" d={view === "Isometric" ? "M-38 15L0-34 43-12 6 38ZM0-34v44M-38 15l44 23M43-12L6 38" : "M-58 30V-24H58V30M-38-24v54M38-24v54M-58 4H58"} />
                  <path className="view-centreline" d="M-70 0H70M0-44V44" />
                  <text className="view-label" x="0" y="72" textAnchor="middle">{view.toUpperCase()}</text>
                </g>;
              })}
              {showDimensions && <g className="sheet-dimension"><path d="M260 174H370M260 166v16M370 166v16" /><text x="315" y="160" textAnchor="middle">120</text></g>}
              {dimensionType && <text className="sheet-selection-hint" x="410" y="510" textAnchor="middle">{dimensionType} dimension · {dimensionPoints.length ? "Select the next point" : "Select a point on the sheet"}</text>}
              {showAnnotations && <g className="sheet-title-block"><text x="570" y="442">TITLE BLOCK</text><text x="570" y="464">{title || "UNTITLED DRAWING"}</text><text x="570" y="485">{partNumber} · REV A</text><text x="570" y="503">CAD TOOLBOX · {file ? "STEP" : "NO MODEL"}</text></g>}
            </svg>
          </div>
          <p className="drawing-stage-hint">{dimensionType ? `${dimensionType} Dimension — Select ${dimensionType === "Linear" ? "two points, edges or vertices" : "a feature on the drawing"}` : "Drag a view to the sheet · Select a view to reposition it"}</p>
        </section>

        <aside className={`drawing-panel drawing-structure-panel ${rightOpen ? "" : "is-collapsed"}`}>
          <button className="drawing-collapse" type="button" onClick={() => setRightOpen((open) => !open)} aria-label={rightOpen ? "Collapse drawing structure" : "Expand drawing structure"}>{rightOpen ? "›" : "‹"}</button>
          {rightOpen && <div className="drawing-panel-content">
            <div className="drawing-panel-heading"><span className="drawing-panel-kicker">Drawing structure</span><h1>Model tree</h1></div>
            <PanelSection title="Views">
              <p className="draw-context-hint">Drag a view to the sheet</p>
              <div className="draw-view-list">{viewNames.map((view) => <button className={`draw-view-row ${placedViews.includes(view) ? "is-placed" : ""}`} draggable onDragStart={() => setDraggedView(view)} onClick={() => addView(view)} key={view} type="button"><span className="draw-drag-handle">⠿</span><span className="draw-view-symbol">{viewSymbols[view]}</span><span>{view}</span><span className="draw-view-state">{placedViews.includes(view) ? "✓" : "＋"}</span></button>)}</div>
            </PanelSection>
            <PanelSection title="Dimensions">
              <SettingRow label="Show dimensions"><input type="checkbox" checked={showDimensions} onChange={(event) => setShowDimensions(event.target.checked)} /></SettingRow>
              <button className="draw-outline-button" type="button" onClick={() => beginDimension("Linear")}>＋ Add Dimension</button>
              {dimensionType && <div className="draw-dimension-tools"><p>{dimensionType} Dimension — Select {dimensionType === "Linear" ? "two points, edges or vertices" : "a feature"}</p><div className="draw-dimension-types">{(["Linear", "Angular", "Diameter", "Radius"] as DimensionType[]).map((type) => <button className={dimensionType === type ? "is-active" : ""} type="button" onClick={() => beginDimension(type)} key={type}>{type}</button>)}</div></div>}
              <div className="draw-existing"><span>Existing dimensions</span><button type="button" onClick={() => beginDimension("Linear")}>120 mm</button></div>
            </PanelSection>
            <PanelSection title="Annotations">
              <SettingRow label="Show annotations"><input type="checkbox" checked={showAnnotations} onChange={(event) => setShowAnnotations(event.target.checked)} /></SettingRow>
              <button className="draw-list-action" type="button" onClick={() => setShowAnnotations(true)}><span>⊕</span> Centre marks</button>
              <button className="draw-list-action" type="button" onClick={() => setShowAnnotations(true)}><span>⊕</span> Centre lines</button>
              <button className="draw-list-action" type="button" onClick={() => setShowAnnotations(true)}><span>⊕</span> Notes</button>
              <SettingRow label="Title block"><input type="checkbox" checked={showAnnotations} onChange={(event) => setShowAnnotations(event.target.checked)} /></SettingRow>
            </PanelSection>
            <PanelSection title="Title block">
              <button className="draw-outline-button" type="button" onClick={() => setTitleBlockOpen(true)}>Edit Title Block</button>
              <p className="draw-muted">{title || "Untitled drawing"}<br />{partNumber} · Rev A</p>
            </PanelSection>
          </div>}
        </aside>

        <nav className="drawing-toolbar" aria-label="Drawing tools">
          <div className="draw-toolbar-group"><ToolbarButton icon="⌁" label="Select" active /><ToolbarButton icon="✥" label="Pan" /><ToolbarButton icon="＋" label="Zoom" /><ToolbarButton icon="□" label="Fit" /></div>
          <div className="draw-toolbar-group"><ToolbarButton icon="◈" label="Shaded" active /><ToolbarButton icon="⌗" label="Hidden Lines" /><ToolbarButton icon="▧" label="Edges" /></div>
          <div className="draw-toolbar-group"><ToolbarButton icon="∥" label="Dimensions" active={showDimensions} onClick={() => setShowDimensions((show) => !show)} /><ToolbarButton icon="⌘" label="Annotations" active={showAnnotations} onClick={() => setShowAnnotations((show) => !show)} /></div>
          <div className="draw-toolbar-group draw-toolbar-end"><ToolbarButton icon="▣" label="Screenshot" /><button className="draw-export-button" type="button" onClick={exportDrawing} disabled={exporting}>{exporting ? "Exporting..." : "Export PDF"}<span aria-hidden="true">↗</span></button></div>
        </nav>
      </div>

      {titleBlockOpen && <div className="draw-modal-backdrop" role="presentation"><form className="draw-modal" onSubmit={(event) => { event.preventDefault(); setTitleBlockOpen(false); }}><div className="draw-modal-heading"><div><span className="drawing-panel-kicker">Title block</span><h2>Edit title block</h2></div><button type="button" onClick={() => setTitleBlockOpen(false)} aria-label="Close title block editor">×</button></div><label>Drawing title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Part number<input value={partNumber} onChange={(event) => setPartNumber(event.target.value)} /></label><label>Revision<input defaultValue="A" /></label><div className="draw-modal-actions"><button type="button" onClick={() => setTitleBlockOpen(false)}>Cancel</button><button className="draw-export-button" type="submit">Apply changes</button></div></form></div>}
    </main>
  );
}

function ToolbarButton({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick?: () => void }) {
  return <button className={`draw-toolbar-button ${active ? "is-active" : ""}`} type="button" onClick={onClick} title={label}><span aria-hidden="true">{icon}</span><small>{label}</small></button>;
}