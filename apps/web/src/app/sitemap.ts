import type { MetadataRoute } from "next";

import { readSiteMode } from "@/lib/site-mode";

const PUBLIC_PATHS = [
  "/",
  "/privacy",
  "/pilot-brief",
  "/use-cases/sales-enablement",
  "/use-cases/train-the-trainer",
  "/use-cases/consultants-and-teachers"
];

export default function sitemap(): MetadataRoute.Sitemap {
  if (readSiteMode() === "workspace") return [];

  return PUBLIC_PATHS.map((path) => ({
    url: `https://training.jasonrae.ai${path}`,
    changeFrequency: "monthly" as const,
    priority: path === "/" ? 1 : 0.7
  }));
}
