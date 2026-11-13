"use client";

import { useEffect } from "react";

import { trackMarketingEvent } from "@/lib/marketing-analytics";

export function MarketingAnalytics({ useCase }: { useCase?: string }) {
  useEffect(() => {
    if (useCase) {
      trackMarketingEvent("use_case_view", {
        source_page: window.location.pathname,
        use_case: useCase
      });
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLElement>("[data-track-event]");
      if (!link) return;

      const name = link.dataset.trackEvent;
      if (name === "cta_click") {
        trackMarketingEvent("cta_click", {
          cta: link.dataset.trackCta,
          use_case: link.dataset.useCase
        });
      }
      if (name === "brief_download") {
        trackMarketingEvent("brief_download", { format: link.dataset.briefFormat });
      }
    };

    const handleToggle = (event: Event) => {
      const details = event.target;
      if (!(details instanceof HTMLDetailsElement) || !details.open) return;
      if (details.dataset.trackEvent !== "example_expand") return;

      trackMarketingEvent("example_expand", { example: details.dataset.example });
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("toggle", handleToggle, true);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("toggle", handleToggle, true);
    };
  }, [useCase]);

  return null;
}
