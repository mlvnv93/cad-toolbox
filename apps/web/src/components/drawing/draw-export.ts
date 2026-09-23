export type DrawingExportFormat = "pdf" | "dxf";

export function createDrawingExportRequest(
  apiUrl: string | undefined,
  format: DrawingExportFormat,
  file: File,
  paperSize: string,
  orientation: "portrait" | "landscape",
  projectionType: string,
): { url: string; body: FormData; filenameExtension: DrawingExportFormat } {
  const data = new FormData();
  data.append("file", file);
  data.append("paper_size", paperSize);
  data.append("orientation", orientation);
  data.append("projection_type", projectionType);

  return {
    url: `${apiUrl}/${format === "dxf" ? "draw/dxf" : "drawings"}`,
    body: data,
    filenameExtension: format,
  };
}