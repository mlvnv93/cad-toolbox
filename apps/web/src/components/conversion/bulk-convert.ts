export const supportedInputExtensions = [".step", ".stp"] as const;

export function isSupportedInput(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return supportedInputExtensions.some((extension) => lowerName.endsWith(extension));
}

export function canStartConversion(
  fileCount: number,
  outputFormat: string,
  converting: boolean,
): boolean {
  return fileCount > 0 && outputFormat.trim().length > 0 && !converting;
}

export function parseDownloadName(
  contentDisposition: string | null,
  fallback: string,
): string {
  return contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? fallback;
}
