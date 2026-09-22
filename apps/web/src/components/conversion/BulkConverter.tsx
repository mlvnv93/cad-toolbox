"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { trackEvent } from "@/lib/analytics";

type QueueStatus = "queued" | "converting" | "complete" | "failed";

type QueueItem = {
  id: string;
  file: File;
  status: QueueStatus;
  error?: string;
  outputName?: string;
  outputUrl?: string;
};

type ConversionFormat = {
  id: string;
  label: string;
  extension: string;
  category: string;
  description: string;
};

const supportedExtensions = [".step", ".stp"];
const conversionApiUrl = process.env.NEXT_PUBLIC_CONVERSION_API_URL ?? process.env.NEXT_PUBLIC_DRAWING_API_URL ?? "http://127.0.0.1:8000";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function inputFormat(file: File): string {
  return file.name.split(".").pop()?.toUpperCase() ?? "UNKNOWN";
}

function makeId(file: File, index: number): string {
  return `${file.name}-${file.size}-${file.lastModified}-${index}`;
}

export default function BulkConverter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [converting, setConverting] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [formats, setFormats] = useState<ConversionFormat[]>([]);
  const [outputFormat, setOutputFormat] = useState("step");

  useEffect(() => {
    fetch(`${conversionApiUrl}/convert/formats`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Conversion formats unavailable.");
        const body = await response.json() as { formats?: ConversionFormat[] };
        setFormats(body.formats ?? []);
      })
      .catch((error: unknown) => {
        setQueueError(error instanceof Error ? error.message : "Conversion formats unavailable.");
      });
  }, []);

  const addFiles = (files: File[]) => {
    const supported = files.filter((file) => supportedExtensions.some((extension) => file.name.toLowerCase().endsWith(extension)));
    const rejected = files.length - supported.length;
    setQueueError(rejected ? `${rejected} file${rejected === 1 ? "" : "s"} skipped. Only STEP and STP files are supported.` : null);
    setItems((current) => {
      const next = [...current];
      supported.forEach((file, index) => {
        if (!next.some((item) => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified)) {
          next.push({ id: makeId(file, current.length + index), file, status: "queued" });
        }
      });
      return next;
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setSelected((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  const clearQueue = () => {
    if (converting) return;
    setItems([]);
    setSelected(new Set());
    setQueueError(null);
  };

  const toggleSelected = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startConversion = async () => {
    const targets = items.filter((item) => selected.size === 0 || selected.has(item.id));
    if (!targets.length || converting) return;

    setConverting(true);
    setQueueError(null);
    trackEvent("cad_convert_start", { format: outputFormat, file_count: String(targets.length) });
    setItems((current) => current.map((item) => targets.some((target) => target.id === item.id) ? { ...item, status: "converting", error: undefined } : item));

    const formData = new FormData();
    targets.forEach((item) => formData.append("files", item.file, item.file.name));
    formData.append("output_format", outputFormat);

    try {
      const response = await fetch(`${conversionApiUrl}/convert`, { method: "POST", body: formData });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? "Conversion service unavailable.");
      }
      const outputUrl = URL.createObjectURL(await response.blob());
      const contentDisposition = response.headers.get("content-disposition");
      const outputName = contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? (targets.length === 1 ? `${targets[0].file.name.replace(/\.(step|stp)$/i, "")}.${outputFormat}` : "CAD3D-KIT-converted.zip");
      setItems((current) => current.map((item) => {
        if (!targets.some((target) => target.id === item.id)) return item;
        return {
          ...item,
          status: "complete",
          error: undefined,
          outputName,
          outputUrl: item.id === targets[0].id ? outputUrl : undefined,
        };
      }));
      trackEvent("cad_convert_success", { format: outputFormat, file_count: String(targets.length) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Conversion failed.";
      setItems((current) => current.map((item) => targets.some((target) => target.id === item.id) ? { ...item, status: "failed", error: message } : item));
      trackEvent("cad_convert_error", { format: outputFormat, error: message });
    } finally {
      setConverting(false);
    }
  };

  const downloadAll = () => {
    items.filter((item) => item.outputUrl).forEach((item) => {
      const link = document.createElement("a");
      link.href = item.outputUrl as string;
      link.download = item.outputName ?? `${item.file.name}.zip`;
      link.click();
    });
  };

  const counts = useMemo(() => ({
    total: items.length,
    complete: items.filter((item) => item.status === "complete").length,
    converting: items.filter((item) => item.status === "converting").length,
    queued: items.filter((item) => item.status === "queued").length,
    failed: items.filter((item) => item.status === "failed").length,
  }), [items]);

  const previewItem = items[0];
  const readyToConvert = items.length > 0 && items.every((item) => item.status === "queued" || item.status === "failed");

  return (
    <main className="convert-kit-page">
      <header className="convert-kit-header">
        <Link className="convert-kit-brand" href="/" aria-label="CAD3D KIT home"><span className="convert-kit-brand-mark" aria-hidden="true" /><span>CAD3D KIT</span></Link>
        <nav className="convert-kit-nav" aria-label="Primary navigation"><Link href="/#products">Products</Link><Link href="/#about">About</Link><Link href="mailto:hello@cadtoolbox.com">Support</Link></nav>
        <div className="convert-kit-header-actions"><Link className="convert-kit-home-link" href="/">Back to Home</Link><ThemeToggle /></div>
      </header>

      <div className="convert-kit-main">
        <div className="convert-kit-intro"><p className="convert-kit-eyebrow">CONVERT</p><h1>Convert your CAD file</h1><p>Package STEP and STP files for use in your workflow.</p></div>
        <div className="convert-kit-grid">
          <section className="convert-kit-card convert-kit-file-card" aria-labelledby="your-file-heading">
            <div className="convert-kit-card-heading"><span className="convert-kit-step">1.</span><div><h2 id="your-file-heading">Your file</h2><p>Upload one or more supported CAD files.</p></div></div>
            <div className={`convert-kit-preview ${dragging ? "is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={handleDrop}>
              {previewItem ? <><span className="convert-kit-file-icon" aria-hidden="true">CAD</span><strong title={previewItem.file.name}>{previewItem.file.name}</strong><span>{formatBytes(previewItem.file.size)} · {inputFormat(previewItem.file)}</span><span className={`convert-kit-status status-${previewItem.status}`}><i />{previewItem.status === "complete" ? "Converted" : previewItem.status === "failed" ? "Conversion failed" : previewItem.status === "converting" ? "Converting" : "Ready to convert"}</span></> : <><span className="convert-kit-preview-icon" aria-hidden="true">+</span><strong>Drop your CAD file here</strong><span>or browse from your computer</span></>}
            </div>
            {previewItem && <dl className="convert-kit-file-details"><div><dt>File name</dt><dd title={previewItem.file.name}>{previewItem.file.name}</dd></div><div><dt>File size</dt><dd>{formatBytes(previewItem.file.size)}</dd></div><div><dt>Input format</dt><dd>{inputFormat(previewItem.file)}</dd></div><div><dt>Part count</dt><dd>Not available</dd></div></dl>}
            <div className="convert-kit-file-actions"><button className="convert-kit-secondary-button" type="button" onClick={() => inputRef.current?.click()}>{previewItem ? "Replace file" : "Browse files"}</button><input ref={inputRef} className="sr-only" type="file" accept=".step,.stp" multiple onChange={handleFileChange} />{items.length > 0 && <span>{items.length} file{items.length === 1 ? "" : "s"} in queue</span>}</div>
          </section>

          <section className="convert-kit-card convert-kit-output-card" aria-labelledby="output-heading">
            <div className="convert-kit-card-heading"><span className="convert-kit-step">2.</span><div><h2 id="output-heading">Choose output format</h2><p>Select an available conversion output.</p></div></div>
            {formats.map((format) => <label className="convert-kit-format-option" key={format.id}><input type="radio" name="output-format" value={format.id} checked={outputFormat === format.id} onChange={() => setOutputFormat(format.id)} /><span><strong>{format.label}</strong><small>{format.description}</small></span><b>{format.category}</b></label>)}
            <p className="convert-kit-support-note">Outputs are generated from STEP/STP input by the CadQuery conversion engine.</p>
            {queueError && <p className="convert-kit-error" role="alert">{queueError}</p>}
            {counts.complete > 0 && <p className="convert-kit-success" role="status">{counts.complete} file{counts.complete === 1 ? "" : "s"} converted successfully.</p>}
            <button className="convert-kit-primary-button" type="button" onClick={startConversion} disabled={!readyToConvert || converting || !outputFormat || formats.length === 0}>{converting ? "Converting..." : "Convert File →"}</button>
          </section>
        </div>

        {items.length > 1 && <section className="convert-kit-queue" aria-labelledby="queue-heading"><div className="convert-kit-queue-heading"><div><p className="convert-kit-eyebrow">BATCH QUEUE</p><h2 id="queue-heading">Files ready to convert</h2></div><button className="convert-kit-text-button" type="button" onClick={clearQueue} disabled={converting}>Clear queue</button></div><div className="convert-kit-queue-list">{items.map((item) => <div className="convert-kit-queue-row" key={item.id}><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelected(item.id)} aria-label={`Select ${item.file.name}`} /><strong title={item.file.name}>{item.file.name}</strong><span>{formatBytes(item.file.size)}</span><span className={`convert-kit-status status-${item.status}`}>{item.status === "complete" ? "Converted" : item.status === "failed" ? "Failed" : item.status === "converting" ? "Converting" : "Ready"}</span>{item.outputUrl ? <a href={item.outputUrl} download={item.outputName}>Download</a> : <button type="button" onClick={() => removeItem(item.id)} disabled={converting}>Remove</button>}</div>)}</div></section>}
        <p className="convert-kit-privacy">Your files are processed for this conversion only and are not stored permanently.</p>
      </div>

      <footer className="convert-kit-footer"><span>CAD3D KIT</span><span>Simple tools for practical CAD workflows.</span>{counts.complete > 0 && <button className="convert-kit-text-button" type="button" onClick={downloadAll}>Download all converted files</button>}</footer>
    </main>
  );
}
