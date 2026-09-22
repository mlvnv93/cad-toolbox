export type AnalyticsEvent =
  | "step_upload"
  | "drawing_generated"
  | "pdf_download"
  | "cad_convert_start"
  | "cad_convert_success"
  | "cad_convert_error";

export function trackEvent(
  event: AnalyticsEvent,
  properties?: Record<string, string>
) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("cad-toolbox-analytics", {
      detail: {
        event,
        properties,
      },
    })
  );

  console.info("[CAD Toolbox Analytics]", event, properties);
}