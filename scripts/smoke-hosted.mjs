import { randomBytes, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

const USAGE = `Hosted smoke path for a live pilot deployment.

Usage:
  pnpm smoke:hosted -- --api <API_ORIGIN> [options]

Required:
  --api <origin>                         Hosted API origin.
                                         Falls back to SMART_TRAINING_API_ORIGIN.

Optional:
  --web <origin>                         Hosted web origin.
                                         Falls back to SMART_TRAINING_WEB_ORIGIN.
  --support-email <email>                Expected support email on /privacy.
                                         Falls back to SMART_TRAINING_EXPECT_SUPPORT_EMAIL.
  --support-url <url>                    Expected support portal URL on /privacy.
                                         Falls back to SMART_TRAINING_EXPECT_SUPPORT_URL.
  --expect-storage-backend <value>       Expected /api/health storageBackend.
                                         Defaults to SMART_TRAINING_EXPECT_STORAGE_BACKEND or postgres.
  --expect-openai-text-enabled <bool>    Expected /api/health openAiTextEnabled.
                                         Defaults to SMART_TRAINING_EXPECT_OPENAI_TEXT_ENABLED or false.
  --expect-voice-lab-enabled <bool>      Expected /api/health voiceLabEnabled.
                                         Defaults to SMART_TRAINING_EXPECT_VOICE_LAB_ENABLED or false.
  --help, -h                             Show this help.

For a hosted API, provide an operator-issued synthetic invitation through
SMART_TRAINING_SMOKE_EMAIL and SMART_TRAINING_SMOKE_INVITATION_TOKEN.

What this verifies:
  - /api/health returns the expected launch posture
  - optional hosted /privacy page exposes retention and support-contact posture
  - register -> dashboard -> session start -> seller turn -> coach -> complete flow works
  - completed session appears on dashboard
  - account deletion invalidates auth

Examples:
  pnpm smoke:hosted -- --api https://api.example.com
  pnpm smoke:hosted -- --api https://api.example.com --web https://app.example.com --support-email pilot-support@example.com
  $env:SMART_TRAINING_API_ORIGIN = "https://api.example.com"
  pnpm smoke:hosted
`;

class UsageError extends Error {}

let currentStep = "initialize";
let apiOrigin = "";
let webOrigin = "";
let expectedStorageBackend = "postgres";
let expectedOpenAiTextEnabled = false;
let expectedVoiceLabEnabled = false;
let expectedSupportEmail = "";
let expectedSupportUrl = "";

const state = {
  cookie: "",
  sessionId: "",
  scenarioId: ""
};

export async function runHostedSmoke(argv = process.argv.slice(2), env = process.env) {
  const config = resolveSmokeConfig(argv, env);
  if (config.help) {
    writeUsage();
    return 0;
  }

  apiOrigin = config.apiOrigin;
  webOrigin = config.webOrigin;
  expectedStorageBackend = config.expectedStorageBackend;
  expectedOpenAiTextEnabled = config.expectedOpenAiTextEnabled;
  expectedVoiceLabEnabled = config.expectedVoiceLabEnabled;
  expectedSupportEmail = config.expectedSupportEmail;
  expectedSupportUrl = config.expectedSupportUrl;

  currentStep = "initialize";
  state.cookie = "";
  state.sessionId = "";
  state.scenarioId = "";

  await verifyHealth();
  await verifyPublicLaunchPosture();
  await registerAccount(config.registration);
  await verifyDashboard("initial");
  await startSession();
  await sendSellerTurn();
  await requestCoach();
  await completeSession();
  await verifyDashboard("completed");
  const deletedAccountCookie = await deleteAccount();
  await verifyDeletedAccountCookie(deletedAccountCookie);
  writeSuccess("Hosted smoke test passed.");
  return 0;
}

async function verifyHealth() {
  currentStep = "health";
  const response = await request("/api/health", { method: "GET" }, false);
  const body = await readJson(response);

  validateHealthBody(body, {
    expectedOpenAiTextEnabled,
    expectedStorageBackend,
    expectedVoiceLabEnabled
  });

  writeStep(
    `Health ok (${body.storageBackend}, openAiTextEnabled=${body.openAiTextEnabled}, voiceLabEnabled=${body.voiceLabEnabled})`
  );
}

async function verifyPublicLaunchPosture() {
  currentStep = "privacy";
  if (!webOrigin) {
    writeStep("Hosted privacy page skipped (no web origin configured)");
    return;
  }

  const privacyResponse = await fetch(`${webOrigin}/privacy`, {
    headers: {
      Accept: "text/html"
    }
  });
  if (!privacyResponse.ok) {
    throw new Error(`/privacy failed with ${privacyResponse.status}.`);
  }

  const privacyHtml = await privacyResponse.text();
  validatePrivacyHtml(privacyHtml, { expectedSupportEmail, expectedSupportUrl });

  writeStep("Hosted privacy page ok");
}

async function registerAccount(registration) {
  currentStep = "register";
  const { email, invitationToken } = registration ?? { email: `smoke-${randomUUID()}@example.com` };
  const response = await request(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        name: "Hosted Smoke",
        ...(invitationToken ? { invitationToken } : { organizationName: "Hosted Smoke Team" }),
        password: `${randomBytes(18).toString("base64url")}Aa7`,
        acceptTranscriptConsent: true
      }),
      redirect: "error"
    },
    false,
    true
  );

  state.cookie = readSessionCookie(response);
  if (!state.cookie) {
    throw new Error("Registration did not return a session cookie.");
  }

  writeStep("Registration ok");
}

async function verifyDashboard(mode) {
  currentStep = `dashboard:${mode}`;
  const response = await request("/api/dashboard", { method: "GET" });
  const body = await readJson(response);

  if (!Array.isArray(body.scenarios) || body.scenarios.length === 0) {
    throw new Error("Dashboard returned no scenarios.");
  }

  if (mode === "initial" && body.sessions.length !== 0) {
    throw new Error("Initial dashboard should not contain prior sessions for the smoke user.");
  }

  if (mode === "completed" && body.sessions.length === 0) {
    throw new Error("Completed dashboard did not include the finished session.");
  }

  const preferredScenario =
    body.scenarios.find((scenario) => scenario.key === "frontline-coaching-consistency") ??
    body.scenarios[0];
  state.scenarioId = preferredScenario?.id || "";
  if (!state.scenarioId) {
    throw new Error("Dashboard did not return a selectable scenario.");
  }

  writeStep(`Dashboard ok (${mode})`);
}

async function startSession() {
  currentStep = "session:start";
  const response = await request("/api/sessions/start", {
    method: "POST",
    body: JSON.stringify({ scenarioId: state.scenarioId })
  });
  const body = await readJson(response);

  state.sessionId = body.session?.id || "";
  if (!state.sessionId) {
    throw new Error("Session start did not return a session id.");
  }

  writeStep("Session start ok");
}

async function sendSellerTurn() {
  currentStep = "session:seller-turn";
  const response = await request(`/api/sessions/${state.sessionId}/message`, {
    method: "POST",
    body: JSON.stringify({
      content:
        "We de-risk adoption with a two-team pilot, shared success metrics, and a weekly checkpoint against your change targets."
    })
  });
  const body = await readJson(response);

  if (body.reply?.role !== "ASSISTANT") {
    throw new Error("Seller turn did not return a buyer reply.");
  }

  writeStep("Seller turn ok");
}

async function requestCoach() {
  currentStep = "session:coach";
  const response = await request(`/api/sessions/${state.sessionId}/coach`, {
    method: "POST"
  });
  const body = await readJson(response);

  if (body.reply?.role !== "COACH") {
    throw new Error("Coach pause did not return a coach reply.");
  }

  writeStep("Coach pause ok");
}

async function completeSession() {
  currentStep = "session:complete";
  const response = await request(`/api/sessions/${state.sessionId}/complete`, {
    method: "POST"
  });
  const body = await readJson(response);

  if (body.session?.status !== "COMPLETED") {
    throw new Error("Session completion did not return COMPLETED status.");
  }

  writeStep("Session completion ok");
}

async function deleteAccount() {
  currentStep = "account:delete";
  const previousCookie = state.cookie;
  await request("/api/auth/account", { method: "DELETE" });
  state.cookie = "";
  writeStep("Account deletion ok");
  return previousCookie;
}

async function verifyDeletedAccountCookie(previousCookie) {
  currentStep = "auth:post-delete";
  const response = await fetch(`${apiOrigin}/api/dashboard`, {
    headers: {
      Accept: "application/json",
      Cookie: previousCookie
    }
  });
  const body = await readJson(response);

  if (response.status !== 401 || body.error !== "Not authenticated.") {
    throw new Error("Dashboard did not reject the deleted account's session cookie with 401.");
  }

  writeStep("Deleted account's session cookie rejected");
}

async function request(pathname, init, requireSession = true, redactError = false) {
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (requireSession && state.cookie) {
    headers.set("Cookie", state.cookie);
  }

  const response = await fetch(`${apiOrigin}${pathname}`, {
    ...init,
    headers
  });

  if (redactError && !response.ok) {
    throw new Error(`${pathname} failed with ${response.status}. Check the synthetic account and its invitation.`);
  }
  await assertOkJsonResponse(response, pathname);
  return response;
}

export async function readJson(response) {
  const raw = await response.text();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      `Expected JSON response but received ${response.headers.get("content-type") || "unknown content type"}: ${truncate(raw)}`
    );
  }
}

export async function assertOkJsonResponse(response, pathname) {
  if (!response.ok) {
    const body = await readJson(response);
    throw new Error(`${pathname} failed with ${response.status}: ${JSON.stringify(body)}`);
  }

  return response;
}

function readRequiredEnv(name, env = process.env) {
  const value = env[name]?.trim();
  if (!value) {
    throw new UsageError(`Missing required environment variable ${name}.`);
  }

  return value;
}

function readOptionalEnv(name, env = process.env) {
  return env[name]?.trim() || "";
}

export function readBooleanExpectation(name, defaultValue, override = "", env = process.env) {
  const raw = (override || env[name] || "").trim().toLowerCase();
  if (!raw) {
    return defaultValue;
  }

  if (["1", "true", "yes", "on"].includes(raw)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(raw)) {
    return false;
  }

  throw new UsageError(
    `Invalid boolean value for ${name}: ${raw}. Use true/false, yes/no, on/off, or 1/0.`
  );
}

export function parseArgs(argv) {
  const parsed = {
    api: "",
    expectOpenAiTextEnabled: "",
    expectStorageBackend: "",
    expectVoiceLabEnabled: "",
    help: false,
    supportEmail: "",
    supportUrl: "",
    web: ""
  };

  const valueFlags = new Map([
    ["--api", "api"],
    ["--web", "web"],
    ["--support-email", "supportEmail"],
    ["--support-url", "supportUrl"],
    ["--expect-storage-backend", "expectStorageBackend"],
    ["--expect-openai-text-enabled", "expectOpenAiTextEnabled"],
    ["--expect-voice-lab-enabled", "expectVoiceLabEnabled"]
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1] || "";

    if (token === "--help" || token === "-h") {
      parsed.help = true;
      continue;
    }

    if (valueFlags.has(token)) {
      if (!next || next.startsWith("--")) {
        throw new UsageError(`Flag ${token} requires a value.`);
      }

      parsed[valueFlags.get(token)] = next;
      index += 1;
      continue;
    }

    throw new UsageError(`Unknown argument: ${token}`);
  }

  return parsed;
}

export function resolveSmokeConfig(argv, env = process.env) {
  const cli = parseArgs(argv);
  if (cli.help) {
    return { help: true };
  }

  const config = {
    apiOrigin: normalizeOrigin(
      cli.api || readRequiredEnv("SMART_TRAINING_API_ORIGIN", env),
      "--api / SMART_TRAINING_API_ORIGIN"
    ),
    expectedOpenAiTextEnabled: readBooleanExpectation(
      "SMART_TRAINING_EXPECT_OPENAI_TEXT_ENABLED",
      false,
      cli.expectOpenAiTextEnabled,
      env
    ),
    expectedStorageBackend:
      cli.expectStorageBackend || env.SMART_TRAINING_EXPECT_STORAGE_BACKEND?.trim() || "postgres",
    expectedSupportEmail:
      cli.supportEmail || readOptionalEnv("SMART_TRAINING_EXPECT_SUPPORT_EMAIL", env),
    expectedSupportUrl:
      cli.supportUrl || readOptionalEnv("SMART_TRAINING_EXPECT_SUPPORT_URL", env),
    expectedVoiceLabEnabled: readBooleanExpectation(
      "SMART_TRAINING_EXPECT_VOICE_LAB_ENABLED",
      false,
      cli.expectVoiceLabEnabled,
      env
    ),
    help: false,
    webOrigin: normalizeOptionalOrigin(
      cli.web || readOptionalEnv("SMART_TRAINING_WEB_ORIGIN", env),
      "--web / SMART_TRAINING_WEB_ORIGIN"
    )
  };
  const origin = new URL(config.apiOrigin);
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname);
  const email = readOptionalEnv("SMART_TRAINING_SMOKE_EMAIL", env).toLowerCase();
  const invitationToken = readOptionalEnv("SMART_TRAINING_SMOKE_INVITATION_TOKEN", env);
  if (email || invitationToken || !loopback) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !/^[A-Za-z0-9_-]{43}$/.test(invitationToken)) {
      throw new UsageError("Provide a synthetic email and invitation via SMART_TRAINING_SMOKE_EMAIL and SMART_TRAINING_SMOKE_INVITATION_TOKEN.");
    }
    if (!loopback && origin.protocol !== "https:") {
      throw new UsageError("An HTTPS API origin is required for a hosted smoke invitation.");
    }
    return { ...config, registration: { email, invitationToken } };
  }
  return config;
}

export function normalizeOrigin(value, sourceLabel) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Expected HTTP or HTTPS.");
    return url.origin;
  } catch {
    throw new UsageError(`${sourceLabel} must be an absolute URL. Received: ${value}`);
  }
}

export function normalizeOptionalOrigin(value, sourceLabel) {
  if (!value) {
    return "";
  }

  return normalizeOrigin(value, sourceLabel);
}

export function validateHealthBody(body, expectations) {
  if (!body || body.status !== "ok") {
    throw new Error(`Health check did not return status ok: ${JSON.stringify(body)}`);
  }

  if (
    expectations.expectedStorageBackend &&
    body.storageBackend !== expectations.expectedStorageBackend
  ) {
    throw new Error(
      `Expected storage backend ${expectations.expectedStorageBackend} but received ${body.storageBackend}.`
    );
  }

  if (body.openAiTextEnabled !== expectations.expectedOpenAiTextEnabled) {
    throw new Error(
      `Expected openAiTextEnabled=${expectations.expectedOpenAiTextEnabled} but received ${body.openAiTextEnabled}.`
    );
  }

  if (body.voiceLabEnabled !== expectations.expectedVoiceLabEnabled) {
    throw new Error(
      `Expected voiceLabEnabled=${expectations.expectedVoiceLabEnabled} but received ${body.voiceLabEnabled}.`
    );
  }
}

export function validatePrivacyHtml(
  privacyHtml,
  { expectedSupportEmail = "", expectedSupportUrl = "" } = {}
) {
  if (!privacyHtml.includes("30-day retention")) {
    throw new Error("Hosted /privacy page did not expose the expected retention language.");
  }

  if (privacyHtml.includes("This deployment has not configured a public support contact yet.")) {
    throw new Error("Hosted /privacy page is still missing an operator-facing support contact.");
  }

  if (expectedSupportEmail && !privacyHtml.includes(expectedSupportEmail)) {
    throw new Error(
      `Hosted /privacy page did not include the expected support email ${expectedSupportEmail}.`
    );
  }

  if (expectedSupportUrl && !privacyHtml.includes(expectedSupportUrl)) {
    throw new Error(
      `Hosted /privacy page did not include the expected support URL ${expectedSupportUrl}.`
    );
  }

  if (!expectedSupportEmail && !expectedSupportUrl) {
    const exposesSupportLink =
      privacyHtml.includes("mailto:") || privacyHtml.includes("Support portal:");
    if (!exposesSupportLink) {
      throw new Error("Hosted /privacy page did not expose a support email or support portal.");
    }
  }
}

function truncate(value, maxLength = 240) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function writeUsage(stream = "stdout") {
  const output = stream === "error" ? console.error : console.log;
  output(USAGE);
}

function readSessionCookie(response) {
  const raw = response.headers.get("set-cookie");
  return raw ? raw.split(";")[0] : "";
}

function writeStep(message) {
  console.log(`- ${message}`);
}

function writeSuccess(message) {
  console.log("");
  console.log(message);
}

async function main() {
  try {
    const exitCode = await runHostedSmoke(process.argv.slice(2), process.env);
    process.exitCode = exitCode;
  } catch (error) {
    console.error("");
    if (error instanceof UsageError) {
      console.error(`Usage error: ${error.message}`);
      console.error("");
      writeUsage("error");
      process.exitCode = 2;
      return;
    }

    console.error(`Hosted smoke test failed during step: ${currentStep}`);
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
