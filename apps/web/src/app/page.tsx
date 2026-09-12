"use client";

import { useState } from "react";
import CadViewer from "@/components/cad/CadViewer";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);

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
            <p className="mt-3 text-sm text-gray-600">
              Selected: {file.name}
            </p>
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