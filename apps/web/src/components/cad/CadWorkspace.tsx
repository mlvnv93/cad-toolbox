"use client";

import { useState } from "react";
import Link from "next/link";
import CadViewer from "@/components/cad/CadViewer";
import { trackEvent } from "@/lib/analytics";
import ThemeToggle from "@/components/ThemeToggle";

export default function CadWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    const extension = selectedFile.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (extension !== "step" && extension !== "stp") {
      alert("Please select a STEP or STP file.");
      return;
    }

    setFile(selectedFile);

    trackEvent("step_upload", {
      file_type: extension,
    });
  };

  const generateDrawing = async () => {
    if (!file) return;

    setGenerating(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DRAWING_API_URL}/drawings`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Drawing generation failed.");
      }

      const blob = await response.blob();
      trackEvent("drawing_generated", {
        file_type: file.name.toLowerCase().endsWith(".stp")
          ? "stp"
          : "step",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${file.name.replace(/\.(step|stp)$/i, "")}_drawing.pdf`;
      document.body.appendChild(link);
      link.click();
      trackEvent("pdf_download", {
        file_type: file.name.toLowerCase().endsWith(".stp")
          ? "stp"
          : "step",
      });
      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Failed to generate drawing.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="cad-viewer-page">
      <div className="cad-viewer-header">
        <header className="workspace-header">
          <Link className="brand-lockup" href="/">
            <span className="brand-mark" aria-hidden="true" />
            <span>CAD Toolbox</span>
          </Link>
          <div className="workspace-header-actions">
            <Link className="back-link" href="/">
              <span aria-hidden="true">←</span> Back to CAD Toolbox
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <div className="cad-file-actions">
          <label className="cad-file-button" title="Open STEP or STP file"><span aria-hidden="true">↥</span> Open model<input type="file" accept=".step,.stp" onChange={handleFileChange} /></label>
          <span className="cad-current-file">{file?.name || "No model loaded"}</span>
          {file && <button type="button" onClick={generateDrawing} disabled={generating} className="cad-drawing-button">{generating ? "Generating..." : "Export drawing PDF"}</button>}
        </div>
      </div>
      <div className="cad-viewer-frame">
          <CadViewer file={file} />
      </div>
    </main>
  );
}
