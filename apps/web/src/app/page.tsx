"use client";

import { useState } from "react";
import CadViewer from "@/components/cad/CadViewer";
import { trackEvent } from "@/lib/analytics";

export default function Home() {
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
        "http://127.0.0.1:8000/drawings",
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
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">
            CAD TOOLBOX
          </h1>

          <p className="mt-2 text-gray-600">
            Free online CAD tools for engineers.
          </p>
        </header>

        <div className="mb-6 rounded-xl bg-white p-6 shadow">
          <label className="mb-2 block text-sm font-medium">
            Upload STEP / STP
          </label>

          <input
            type="file"
            accept=".step,.stp"
            onChange={handleFileChange}
            className="block w-full text-sm"
          />

          {file && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                Selected: {file.name}
              </p>

              <button
                type="button"
                onClick={generateDrawing}
                disabled={generating}
                className="mt-4 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {generating
                  ? "Generating Drawing..."
                  : "Generate Drawing PDF"}
              </button>
            </div>
          )}
        </div>

        <section className="overflow-hidden rounded-xl bg-white shadow">
          <div className="h-[600px]">
            <CadViewer file={file} />
          </div>
        </section>
      </div>
    </main>
  );
}