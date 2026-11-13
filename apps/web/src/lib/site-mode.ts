export type SiteMode = "workspace" | "marketing" | "pilot";
type SiteEnvironment = Record<string, string | undefined>;

export function readSiteMode(
  env: SiteEnvironment = {
    SMART_TRAINING_SITE_MODE: process.env.SMART_TRAINING_SITE_MODE,
    NETLIFY: process.env.NETLIFY
  }
): SiteMode {
  const value = env.SMART_TRAINING_SITE_MODE?.trim();
  if (!value) return env.NETLIFY === "true" ? "marketing" : "workspace";
  if (value === "marketing" || value === "pilot" || value === "workspace") return value;
  throw new Error("SMART_TRAINING_SITE_MODE must be marketing, pilot, or workspace.");
}

export function trainingEnabled(): boolean {
  return readSiteMode() !== "marketing";
}

// Netlify cannot reach Render's private service-discovery hostname. Validate at
// build time so an app deploy cannot silently proxy logins to localhost.
export function validateNetlifyDeployment(env: SiteEnvironment): void {
  if (env.NETLIFY !== "true") return;
  const mode = readSiteMode(env);
  if (mode === "workspace") {
    throw new Error("Use marketing or pilot mode for a Netlify deployment.");
  }
  if (mode === "marketing") return;
  const value = env.INTERNAL_API_ORIGIN?.trim();
  let origin: URL;
  try {
    origin = new URL(value || "");
  } catch {
    throw new Error("Netlify pilot mode requires INTERNAL_API_ORIGIN as a public HTTPS origin.");
  }
  if (
    origin.protocol !== "https:" ||
    !origin.hostname.includes(".") ||
    origin.hostname.endsWith(".localhost") ||
    origin.hostname.endsWith(".local") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(origin.hostname) ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    origin.pathname !== "/"
  ) {
    throw new Error(
      "INTERNAL_API_ORIGIN must be a public HTTPS origin without credentials or a path."
    );
  }
  if (env.INTERNAL_API_HOSTPORT?.trim() || env.NEXT_PUBLIC_API_ORIGIN?.trim()) {
    throw new Error(
      "On Netlify, set only INTERNAL_API_ORIGIN; clear private-host and public fallbacks."
    );
  }
}
