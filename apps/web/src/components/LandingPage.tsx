"use client";

import Link from "next/link";
import { useState } from "react";
import CadViewer from "@/components/cad/CadViewer";
import ThemeToggle from "@/components/ThemeToggle";
import { trackEvent } from "@/lib/analytics";

const supportedExtensions = [
  "step",
  "stp",
  "iges",
  "igs",
  "stl",
  "sldprt",
  "sldasm",
  "ipt",
  "iam",
  "dxf",
  "dwg",
];

const products = [
  {
    name: "VIEW",
    description: "Explore and inspect your 3D model directly in your browser.",
    cta: "Open Viewer",
    href: "/viewer",
    tone: "product-view",
    icon: "cube-icon",
  },
  {
    name: "DRAW",
    description: "Create technical drawings from your model.",
    cta: "Create Drawing",
    href: "/draw",
    tone: "product-draw",
    icon: "document-icon",
  },
  {
    name: "CONVERT",
    description: "Convert between multiple CAD formats.",
    cta: "Convert File",
    href: "/convert",
    tone: "product-convert",
    icon: "convert-icon",
  },
];

function isSupportedFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension ? supportedExtensions.includes(extension) : false;
}

export default function LandingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const selectFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return;

    if (!isSupportedFile(selectedFile)) {
      setFileError("Please choose a supported CAD file.");
      return;
    }

    setFileError(null);
    setFile(selectedFile);
    trackEvent("step_upload", {
      file_type: selectedFile.name.split(".").pop()?.toLowerCase() ?? "unknown",
    });
  };

  return (
    <main className="landing-page">
      <header className="landing-header page-container">
        <Link className="landing-brand" href="/" aria-label="CAD Toolbox home">
          <span className="landing-brand-cad">CAD</span>
          <span>Toolbox</span>
        </Link>
        <div className="landing-header-actions">
          <ThemeToggle />
        </div>
      </header>

      <section className="landing-hero page-container">
        <h1>The simple way to work with CAD</h1>
        <p className="landing-subtitle">Open, inspect, document and convert your CAD files — directly in your browser.<br />No installation required.</p>
      </section>

      <section className="upload-section page-container" aria-labelledby="upload-heading">
        <label
          className={`upload-zone${isDragging ? " upload-zone-dragging" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => { event.preventDefault(); setIsDragging(false); selectFile(event.dataTransfer.files[0]); }}
        >
          <input
            className="upload-input"
            type="file"
            accept={supportedExtensions.map((extension) => `.${extension}`).join(",")}
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          <span className="upload-cloud" aria-hidden="true"><span /></span>
          <span className="upload-title" id="upload-heading">Drop your CAD file here</span>
          <span className="upload-or">or</span>
          <span className="browse-button">Browse files</span>
        </label>
        <p className="supported-formats">Supports STEP, IGES, STL, SLDPRT, SLDASM, IPT, IAM, DXF, DWG and more.</p>
        {fileError && <p className="upload-error" role="alert">{fileError}</p>}
        {file && (
          <div className="landing-loaded-file">
            <span className="file-status-dot" aria-hidden="true" />
            <span>{file.name}</span>
            <span>Model loaded below</span>
          </div>
        )}
      </section>

      {file && <section className="landing-viewer page-container"><CadViewer file={file} /></section>}

      <section className="products-section page-container" id="products" aria-labelledby="products-heading">
        <div className="section-label"><span /> Choose a workflow</div>
        <h2 id="products-heading" className="sr-only">CAD Toolbox products</h2>
        <div className="product-grid">
          {products.map((product) => (
            <Link className={`product-card ${product.tone}`} href={product.href} key={product.name}>
              <span className="product-icon" aria-hidden="true"><span className={product.icon} /></span>
              <span className="product-name">{product.name}</span>
              <span className="product-description">{product.description}</span>
              <span className="product-link">{product.cta} <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="capabilities page-container" id="capabilities">
        <div className="capability-item"><span className="capability-icon capability-lock" aria-hidden="true" /><div><strong>Privacy first.</strong><p>Your files stay yours.</p></div></div>
        <div className="capability-item"><span className="capability-icon capability-screen" aria-hidden="true" /><div><strong>No installation.</strong><p>Work directly in your browser.</p></div></div>
        <div className="capability-item"><span className="capability-icon capability-grid" aria-hidden="true" /><div><strong>Wide format support.</strong><p>Use the files you already have.</p></div></div>
        <div className="capability-item"><span className="capability-icon capability-arrows" aria-hidden="true" /><div><strong>Built for interoperability.</strong><p>Keep your workflow moving.</p></div></div>
      </section>

      <footer className="landing-footer page-container" id="footer">
        <Link className="landing-brand" href="/"><span className="landing-brand-cad">CAD</span><span>Toolbox</span></Link>
        <p>Simpler CAD workflows for everyone.</p>
        <nav aria-label="Footer navigation"><Link href="/faq">FAQ</Link><Link href="#privacy">Privacy</Link><Link href="#terms">Terms</Link><Link href="mailto:hello@cadtoolbox.com">Support</Link><Link href="#about">About</Link></nav>
      </footer>
    </main>
  );
}
