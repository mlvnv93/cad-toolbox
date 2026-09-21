import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function ConvertPage() {
  return (
    <main className="workspace-shell">
      <div className="workspace-frame">
        <header className="workspace-header">
          <Link className="brand-lockup" href="/"><span className="brand-mark" aria-hidden="true" /><span>CAD Toolbox</span></Link>
          <div className="workspace-header-actions">
            <Link className="back-link" href="/"><span aria-hidden="true">←</span> Back to CAD Toolbox</Link>
            <ThemeToggle />
          </div>
        </header>
        <section className="workspace-intro placeholder-page">
          <p className="eyebrow"><span className="eyebrow-line" /> Convert / coming next</p>
          <h1>Move CAD files into the format the next step needs.</h1>
          <p>Conversion workflows are on the way. For now, open a model and inspect it in the browser.</p>
          <Link className="primary-button" href="/viewer">Open the viewer <span aria-hidden="true">↗</span></Link>
        </section>
      </div>
    </main>
  );
}
