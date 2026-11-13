import type { MetadataRoute } from "next";

import { readSiteMode } from "@/lib/site-mode";

export default function robots(): MetadataRoute.Robots {
  const publicMarketingSite = readSiteMode() !== "workspace";

  return {
    rules: {
      userAgent: "*",
      allow: publicMarketingSite ? ["/", "/use-cases/", "/pilot-brief", "/privacy"] : [],
      disallow: publicMarketingSite
        ? ["/api/", "/dashboard", "/start", "/roleplay/", "/voice-lab"]
        : ["/"]
    },
    sitemap: publicMarketingSite ? "https://training.jasonrae.ai/sitemap.xml" : undefined
  };
}
