import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

import { resolveApiOrigin } from "./src/lib/api-origin";
import { readSiteMode, validateNetlifyDeployment } from "./src/lib/site-mode";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
const apiOrigin = resolveApiOrigin(process.env);
validateNetlifyDeployment(process.env);
const siteMode = readSiteMode(process.env);
const noindex =
  process.env.NETLIFY === "true" &&
  (siteMode === "pilot" || process.env.CONTEXT !== "production");

const securityHeaders = [
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()"
  }
];

const nextConfig: NextConfig = {
  // This is a public build mode, never a credential. Rebuild when changing it.
  env: { SMART_TRAINING_SITE_MODE: siteMode },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: path.resolve(workspaceRoot)
  },
  async rewrites() {
    if (siteMode === "marketing") return [];
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`
      }
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          ...(noindex ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : [])
        ]
      }
    ];
  }
};

export default nextConfig;
