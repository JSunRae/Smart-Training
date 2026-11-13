export type MarketingEventName =
  | "cta_click"
  | "use_case_view"
  | "example_expand"
  | "enquiry_start"
  | "enquiry_submit"
  | "enquiry_success"
  | "brief_download";

export type MarketingEventProperties = Record<string, string | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, string | undefined>>;
  }
}

export function trackMarketingEvent(
  name: MarketingEventName,
  properties: MarketingEventProperties = {}
): void {
  if (typeof window === "undefined") return;

  const allowedKeys = new Set(["cta", "use_case", "source_page", "source_cta", "example", "format"]);
  const safeProperties = Object.fromEntries(
    Object.entries(properties).filter(
      ([key, value]) => allowedKeys.has(key) && typeof value === "string" && value.length <= 160
    )
  );
  const event = { event: name, ...safeProperties };
  window.dataLayer?.push(event);
  window.dispatchEvent(new CustomEvent("smart-training:analytics", { detail: event }));
}
