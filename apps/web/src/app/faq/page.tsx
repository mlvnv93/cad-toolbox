import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const questions = [
  ["What files does CAD Toolbox support?", "The homepage accepts STEP, IGES, STL, SLDPRT, SLDASM, IPT, IAM, DXF and DWG files. The browser viewer currently loads STEP and STP files."],
  ["Do I need to install anything?", "No. CAD Toolbox is designed to work directly in your browser."],
  ["Are my files uploaded?", "The viewer keeps selected files in the current browser session. Drawing and conversion workflows will clearly indicate when processing is required."],
  ["What is available today?", "You can view STEP and STP models in the browser. Drawing and conversion workflows are being prepared around practical engineering outputs."],
];

export default function FaqPage() {
  return (
    <main className="faq-page">
      <div className="faq-content">
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
        <h1>Frequently asked questions</h1>
        <p>Clear answers about the current CAD Toolbox workflows.</p>
        <section className="faq-list" aria-label="Frequently asked questions">
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </section>
      </div>
    </main>
  );
}