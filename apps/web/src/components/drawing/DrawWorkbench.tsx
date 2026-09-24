"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import DrawingPreviewLayer from "./DrawingPreviewLayer";
import { createDrawingPreviewRequest, type DrawingPreview } from "./draw-preview";
import { createDrawingExportRequest, type DrawingExportFormat } from "./draw-export";

type ViewName = "Front" | "Back" | "Left" | "Right" | "Top" | "Bottom" | "Isometric";
type DimensionType = "Linear" | "Angular" | "Diameter" | "Radius";
type Position = { x: number; y: number };
const viewNames: ViewName[] = ["Front", "Back", "Left", "Right", "Top", "Bottom", "Isometric"];
const viewSymbols: Record<ViewName, string> = { Front: "F", Back: "B", Left: "L", Right: "R", Top: "T", Bottom: "D", Isometric: "I" };
const paperDimensions: Record<string, [number, number]> = { A4: [210, 297], A3: [297, 420], A2: [420, 594], A1: [594, 841] };

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <details className="draw-section" open><summary>{title}<span aria-hidden="true">v</span></summary>{children}</details>;
}
function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="draw-setting"><span>{label}</span>{children}</label>;
}
function sheetDimensions(size: string, orientation: "portrait" | "landscape"): [number, number] {
  const [width, height] = paperDimensions[size] ?? paperDimensions.A4;
  return orientation === "portrait" ? [width, height] : [height, width];
}
function defaultPositions(width: number, height: number): Record<ViewName, Position> {
  return { Front: { x: width * .32, y: height * .4 }, Back: { x: width * .32, y: height * .4 }, Left: { x: width * .32, y: height * .4 }, Right: { x: width * .68, y: height * .4 }, Top: { x: width * .32, y: height * .68 }, Bottom: { x: width * .32, y: height * .16 }, Isometric: { x: width * .5, y: height * .4 } };
}

export default function DrawWorkbench() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<DrawingPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [paperSize, setPaperSize] = useState("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [projectionType, setProjectionType] = useState("THIRD_ANGLE");
  const [placedViews, setPlacedViews] = useState<ViewName[]>(["Front", "Top", "Right"]);
  const [positions, setPositions] = useState<Record<ViewName, Position>>(defaultPositions(210, 297));
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
  const [exportFormat, setExportFormat] = useState<DrawingExportFormat>("pdf");
  const [exporting, setExporting] = useState(false);
  const [gridVisible, setGridVisible] = useState(false);
  const [gridSpacing, setGridSpacing] = useState("10");
  const [customGridSpacing, setCustomGridSpacing] = useState(10);
  const [fullscreen, setFullscreen] = useState(false);
  const workbenchRef = useRef<HTMLDivElement>(null);
  const [fallbackWidth, fallbackHeight] = useMemo(() => sheetDimensions(paperSize, orientation), [paperSize, orientation]);
  const sheetWidth = preview?.sheet_width_mm ?? fallbackWidth;
  const sheetHeight = preview?.sheet_height_mm ?? fallbackHeight;
  const scaleLabel = preview?.scale_label ?? "calculating...";
  const gridSize = gridSpacing === "custom" ? customGridSpacing : Number(gridSpacing);
  const border = Math.min(5, Math.max(2, sheetWidth * .02));
  const titleBlockHeight = 32;
  const titleBlockWidth = Math.min(70, sheetWidth * .34);
  const titleBlockX = sheetWidth - titleBlockWidth - border;
  const titleBlockY = sheetHeight - titleBlockHeight - border;

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === workbenchRef.current);
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !document.fullscreenElement) setFullscreen(false); };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("keydown", onEscape);
    return () => { document.removeEventListener("fullscreenchange", onFullscreenChange); document.removeEventListener("keydown", onEscape); };
  }, []);
  const toggleFullscreen = async () => { if (document.fullscreenElement === workbenchRef.current) await document.exitFullscreen(); else if (workbenchRef.current?.requestFullscreen) await workbenchRef.current.requestFullscreen(); else setFullscreen((value) => !value); };
  const loadPreview = async (nextFile: File) => {
    setPreviewLoading(true); setPreviewError(false); setPreview(null);
    try {
      const request = createDrawingPreviewRequest(process.env.NEXT_PUBLIC_DRAWING_API_URL, nextFile, paperSize, orientation, projectionType);
      const response = await fetch(request.url, { method: "POST", body: request.body });
      if (!response.ok) throw new Error("Preview generation failed");
      const nextPreview = await response.json() as DrawingPreview;
      setPreview(nextPreview);
      setPositions((current) => ({ ...current, Front: nextPreview.view_positions.front, Top: nextPreview.view_positions.top, Right: nextPreview.view_positions.right }));
    } catch { setPreview(null); setPreviewError(true); } finally { setPreviewLoading(false); }
  };
  useEffect(() => { if (!file) return; const timer = window.setTimeout(() => { void loadPreview(file); }, 150); return () => window.clearTimeout(timer); }, [file, paperSize, orientation, projectionType]);
  const addView = (view: ViewName) => { setPlacedViews((current) => current.includes(view) ? current : [...current, view]); setSelectedView(view); };
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => { const nextFile = event.target.files?.[0]; if (nextFile) { setFile(nextFile); setPreview(null); setPreviewError(false); setTitle(nextFile.name.replace(/\.(step|stp)$/i, "")); setPositions(defaultPositions(fallbackWidth, fallbackHeight)); } };
  const beginDimension = (type: DimensionType) => { setDimensionType(type); setDimensionPoints([]); };
  const handleSheetClick = (event: React.MouseEvent<SVGSVGElement>) => { if (!dimensionType) return; const bounds = event.currentTarget.getBoundingClientRect(); setDimensionPoints((current) => current.length >= 4 ? current : [...current, ((event.clientX - bounds.left) / bounds.width) * sheetWidth, ((event.clientY - bounds.top) / bounds.height) * sheetHeight]); };
  const moveView = (event: React.PointerEvent<SVGSVGElement>) => { if (!movingView) return; const bounds = event.currentTarget.getBoundingClientRect(); setPositions((current) => ({ ...current, [movingView]: { x: ((event.clientX - bounds.left) / bounds.width) * sheetWidth, y: ((event.clientY - bounds.top) / bounds.height) * sheetHeight } })); };
  const exportDrawing = async () => { if (!file || exporting) return; setExporting(true); try { const request = createDrawingExportRequest(process.env.NEXT_PUBLIC_DRAWING_API_URL, exportFormat, file, paperSize, orientation, projectionType); const response = await fetch(request.url, { method: "POST", body: request.body }); if (!response.ok) throw new Error("Drawing export failed"); const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = `${title || "drawing"}.${request.filenameExtension}`; link.click(); URL.revokeObjectURL(url); } catch { window.alert("We could not export the drawing. Load a STEP file and try again."); } finally { setExporting(false); } };
  const loadStatus = !file ? "No CAD model loaded" : previewError ? "Model load failed" : previewLoading ? "Loading STEP model..." : preview ? "STEP model loaded" : "Preparing model...";

  return <main className="drawing-generator">
    <header className="drawing-header"><Link className="brand-lockup" href="/"><span className="brand-mark" aria-hidden="true" /><span>CAD Toolbox</span></Link><div className="drawing-header-actions"><Link className="back-link" href="/">Back to CAD Toolbox</Link><ThemeToggle /></div></header>
    <div className="drawing-filebar"><label className="drawing-file-button">Load CAD<input type="file" accept=".step,.stp" onChange={handleFileChange} /></label><span className="drawing-file-name">{file?.name || "No CAD file loaded"}</span><span className="drawing-workflow-hint">Load CAD &gt; Configure sheet &gt; Place views &gt; Export</span></div>
    <div ref={workbenchRef} className={`drawing-workbench ${fullscreen ? "is-fullscreen" : ""}`}>
      <aside className={`drawing-panel drawing-settings-panel ${leftOpen ? "" : "is-collapsed"}`}><button className="drawing-collapse" type="button" onClick={() => setLeftOpen((value) => !value)} aria-label="Toggle drawing settings">{leftOpen ? "<" : ">"}</button>{leftOpen && <div className="drawing-panel-content"><div className="drawing-panel-heading"><span className="drawing-panel-kicker">Drawing settings</span><h1>Sheet setup</h1></div><PanelSection title="File information"><SettingRow label="File"><span className="draw-value">{file?.name || "Not loaded"}</span></SettingRow><div className="draw-load-status" role="status">{loadStatus}</div></PanelSection><PanelSection title="Sheet"><SettingRow label="Paper size"><select value={paperSize} onChange={(event) => setPaperSize(event.target.value)}><option>A4</option><option>A3</option><option>A2</option><option>A1</option></select></SettingRow><SettingRow label="Orientation"><span className="draw-segmented"><button type="button" className={orientation === "portrait" ? "is-selected" : ""} onClick={() => setOrientation("portrait")}>Portrait</button><button type="button" className={orientation === "landscape" ? "is-selected" : ""} onClick={() => setOrientation("landscape")}>Landscape</button></span></SettingRow><SettingRow label="Drawing scale"><select value="auto" aria-label={`Automatic drawing scale ${scaleLabel}`}><option value="auto">Automatic - {scaleLabel}</option></select></SettingRow><SettingRow label="Projection"><select value={projectionType} onChange={(event) => setProjectionType(event.target.value)}><option value="THIRD_ANGLE">Third angle</option><option value="FIRST_ANGLE">First angle</option></select></SettingRow></PanelSection><PanelSection title="Grid"><SettingRow label="Grid"><input type="checkbox" checked={gridVisible} onChange={(event) => setGridVisible(event.target.checked)} /></SettingRow><SettingRow label="Spacing"><select value={gridSpacing} onChange={(event) => setGridSpacing(event.target.value)}><option value="1">1 mm</option><option value="2">2 mm</option><option value="5">5 mm</option><option value="10">10 mm</option><option value="20">20 mm</option><option value="25">25 mm</option><option value="50">50 mm</option><option value="custom">Custom</option></select></SettingRow>{gridSpacing === "custom" && <SettingRow label="Custom (mm)"><input type="number" min="0.1" value={customGridSpacing} onChange={(event) => setCustomGridSpacing(Number(event.target.value))} /></SettingRow>}</PanelSection></div>}</aside>
      <section className="drawing-stage" aria-label="Technical drawing preview"><div className="drawing-stage-topline"><span>DRAWING PREVIEW</span><span>{paperSize} · {orientation.toUpperCase()} · mm · {scaleLabel}</span></div><div className="drawing-sheet-wrap"><svg className="drawing-sheet" viewBox={`0 0 ${sheetWidth} ${sheetHeight}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Technical drawing sheet ${paperSize} ${orientation}`} onClick={handleSheetClick} onPointerMove={moveView} onPointerUp={() => setMovingView(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (draggedView) addView(draggedView); }}><defs><pattern id="drawing-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse"><path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} className="drawing-grid-line" fill="none" /></pattern></defs><rect className="sheet-paper" x="0" y="0" width={sheetWidth} height={sheetHeight} />{gridVisible && <rect x="0" y="0" width={sheetWidth} height={sheetHeight} fill="url(#drawing-grid)" aria-hidden="true" />}<rect className="sheet-border" x={border} y={border} width={sheetWidth - border * 2} height={sheetHeight - border * 2} /><line className="sheet-zone" x1={border} y1={sheetHeight - titleBlockHeight - border} x2={sheetWidth - border} y2={sheetHeight - titleBlockHeight - border} /><rect className="sheet-zone" x={titleBlockX} y={titleBlockY} width={titleBlockWidth} height={titleBlockHeight} />{placedViews.map((view) => <DrawingPreviewLayer key={view} preview={preview} view={view} position={positions[view]} selected={selectedView === view} onSelect={() => setSelectedView(view)} onPointerDown={() => setMovingView(view)} />)}{previewLoading && <text className="sheet-selection-hint" x={sheetWidth / 2} y={sheetHeight - 10} textAnchor="middle">Generating model views...</text>}{previewError && <text className="sheet-selection-hint" x={sheetWidth / 2} y={sheetHeight - 10} textAnchor="middle">Model preview unavailable - export remains available</text>}{showDimensions && <text className="sheet-dimension" x={sheetWidth * .31} y={sheetHeight * .18} textAnchor="middle">120</text>}{dimensionType && <text className="sheet-selection-hint" x={sheetWidth / 2} y={sheetHeight - 10} textAnchor="middle">{dimensionType} dimension - {dimensionPoints.length ? "Select the next point" : "Select a point on the sheet"}</text>}{showAnnotations && <g className="sheet-title-block"><text x={titleBlockX + 4} y={titleBlockY + 7}>TITLE BLOCK</text><text x={titleBlockX + 4} y={titleBlockY + 15}>{title || "UNTITLED DRAWING"}</text><text x={titleBlockX + 4} y={titleBlockY + 23}>{partNumber} - REV A</text><text x={titleBlockX + 4} y={titleBlockY + 30}>CAD TOOLBOX - {file ? "STEP" : "NO MODEL"}</text></g>}</svg></div><p className="drawing-stage-hint">{dimensionType ? `${dimensionType} Dimension - Select ${dimensionType === "Linear" ? "two points, edges or vertices" : "a feature on the drawing"}` : "Drag a view to the sheet - Select a view to reposition it"}</p></section>
      <aside className={`drawing-panel drawing-structure-panel ${rightOpen ? "" : "is-collapsed"}`}><button className="drawing-collapse" type="button" onClick={() => setRightOpen((value) => !value)} aria-label="Toggle drawing structure">{rightOpen ? ">" : "<"}</button>{rightOpen && <div className="drawing-panel-content"><div className="drawing-panel-heading"><span className="drawing-panel-kicker">Drawing structure</span><h1>Model tree</h1></div><PanelSection title="Views"><p className="draw-context-hint">Drag a view to the sheet</p><div className="draw-view-list">{viewNames.map((view) => <button className={`draw-view-row ${placedViews.includes(view) ? "is-placed" : ""}`} draggable onDragStart={() => setDraggedView(view)} onClick={() => addView(view)} key={view} type="button"><span className="draw-view-symbol">{viewSymbols[view]}</span><span>{view}</span><span className="draw-view-state">{placedViews.includes(view) ? "Loaded" : "Add"}</span></button>)}</div></PanelSection><PanelSection title="Dimensions"><SettingRow label="Show dimensions"><input type="checkbox" checked={showDimensions} onChange={(event) => setShowDimensions(event.target.checked)} /></SettingRow><button className="draw-outline-button" type="button" onClick={() => beginDimension("Linear")}>Add Dimension</button>{dimensionType && <div className="draw-dimension-tools"><p>{dimensionType} Dimension - Select {dimensionType === "Linear" ? "two points, edges or vertices" : "a feature"}</p><div className="draw-dimension-types">{(["Linear", "Angular", "Diameter", "Radius"] as DimensionType[]).map((type) => <button className={dimensionType === type ? "is-active" : ""} type="button" onClick={() => beginDimension(type)} key={type}>{type}</button>)}</div></div>}<div className="draw-existing"><span>Existing dimensions</span><button type="button" onClick={() => beginDimension("Linear")}>120 mm</button></div></PanelSection><PanelSection title="Annotations"><SettingRow label="Show annotations"><input type="checkbox" checked={showAnnotations} onChange={(event) => setShowAnnotations(event.target.checked)} /></SettingRow><button className="draw-list-action" type="button" onClick={() => setShowAnnotations(true)}>Centre marks</button><button className="draw-list-action" type="button" onClick={() => setShowAnnotations(true)}>Centre lines</button><button className="draw-list-action" type="button" onClick={() => setShowAnnotations(true)}>Notes</button></PanelSection><PanelSection title="Title block"><button className="draw-outline-button" type="button" onClick={() => setTitleBlockOpen(true)}>Edit Title Block</button><p className="draw-muted">{title || "Untitled drawing"}<br />{partNumber} - Rev A</p></PanelSection></div>}</aside>
      <nav className="drawing-toolbar" aria-label="Drawing tools"><ToolbarButton icon="S" label="Select" active /><ToolbarButton icon="P" label="Pan" /><ToolbarButton icon="Z" label="Zoom" /><ToolbarButton icon="F" label="Fit" /><ToolbarButton icon="D" label="Dimensions" active={showDimensions} onClick={() => setShowDimensions((value) => !value)} /><ToolbarButton icon="A" label="Annotations" active={showAnnotations} onClick={() => setShowAnnotations((value) => !value)} /><ToolbarButton icon="[]" label={fullscreen ? "Exit fullscreen" : "Fullscreen"} active={fullscreen} onClick={toggleFullscreen} /><select aria-label="Export format" value={exportFormat} onChange={(event) => setExportFormat(event.target.value as DrawingExportFormat)} disabled={exporting}><option value="pdf">PDF</option><option value="dxf">DXF</option></select><button className="draw-export-button" type="button" onClick={exportDrawing} disabled={exporting}>{exporting ? "Exporting..." : `Export ${exportFormat.toUpperCase()}`}</button></nav>
    </div>
    {titleBlockOpen && <div className="draw-modal-backdrop" role="presentation"><form className="draw-modal" onSubmit={(event) => { event.preventDefault(); setTitleBlockOpen(false); }}><div className="draw-modal-heading"><div><span className="drawing-panel-kicker">Title block</span><h2>Edit title block</h2></div><button type="button" onClick={() => setTitleBlockOpen(false)} aria-label="Close title block editor">X</button></div><label>Drawing title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Part number<input value={partNumber} onChange={(event) => setPartNumber(event.target.value)} /></label><label>Revision<input defaultValue="A" /></label><div className="draw-modal-actions"><button type="button" onClick={() => setTitleBlockOpen(false)}>Cancel</button><button className="draw-export-button" type="submit">Apply changes</button></div></form></div>}
  </main>;
}

function ToolbarButton({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick?: () => void }) { return <button className={`draw-toolbar-button ${active ? "is-active" : ""}`} type="button" onClick={onClick} title={label}><span aria-hidden="true">{icon}</span><small>{label}</small></button>; }
