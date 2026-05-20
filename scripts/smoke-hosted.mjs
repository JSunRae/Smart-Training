const cli = parseArgs(process.argv.slice(2));
const apiOrigin = cli.api || readRequiredEnv("SMART_TRAINING_API_ORIGIN");
const webOrigin = cli.web || readOptionalEnv("SMART_TRAINING_WEB_ORIGIN");
const expectedStorageBackend =
  cli.expectStorageBackend ||
  process.env.SMART_TRAINING_EXPECT_STORAGE_BACKEND?.trim() ||
  "postgres";
const expectedOpenAiTextEnabled = readBooleanExpectation(
  "SMART_TRAINING_EXPECT_OPENAI_TEXT_ENABLED",
  false,
  cli.expectOpenAiTextEnabled
);
const expectedVoiceLabEnabled = readBooleanExpectation(
  "SMART_TRAINING_EXPECT_VOICE_LAB_ENABLED",
  false,
  cli.expectVoiceLabEnabled
);
const expectedSupportEmail =
  cli.supportEmail || readOptionalEnv("SMART_TRAINING_EXPECT_SUPPORT_EMAIL");
const expectedSupportUrl = cli.supportUrl || readOptionalEnv("SMART_TRAINING_EXPECT_SUPPORT_URL");

const state = {
  cookie: "",
  sessionId: "",
  scenarioId: ""
};

const email = `smoke-${Date.now()}@example.com`;

try {
  await verifyHealth();
  await verifyPublicLaunchPosture();
  await registerAccount();
  await verifyDashboard("initial");
  await startSession();
  await sendSellerTurn();
  await requestCoach();
  await completeSession();
  await verifyDashboard("completed");
  await deleteAccount();
  await verifyLoggedOut();
  writeSuccess("Hosted smoke test passed.");
} catch (error) {
  console.error("");
  console.error("Hosted smoke test failed.");
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
}

async function verifyHealth() {
  const response = await request("/api/health", { method: "GET" }, false);
  const body = await readJson(response);

  if (body.status !== "ok") {
    throw new Error(`Health check did not return status ok: ${JSON.stringify(body)}`);
  }

  if (expectedStorageBackend && body.storageBackend !== expectedStorageBackend) {
    throw new Error(
      `Expected storage backend ${expectedStorageBackend} but received ${body.storageBackend}.`
    );
  }

  if (body.openAiTextEnabled !== expectedOpenAiTextEnabled) {
    throw new Error(
      `Expected openAiTextEnabled=${expectedOpenAiTextEnabled} but received ${body.openAiTextEnabled}.`
    );
  }

  if (body.voiceLabEnabled !== expectedVoiceLabEnabled) {
    throw new Error(
      `Expected voiceLabEnabled=${expectedVoiceLabEnabled} but received ${body.voiceLabEnabled}.`
    );
  }

  writeStep(
    `Health ok (${body.storageBackend}, openAiTextEnabled=${body.openAiTextEnabled}, voiceLabEnabled=${body.voiceLabEnabled})`
  );
}

async function verifyPublicLaunchPosture() {
  if (!webOrigin) {
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
  if (!privacyHtml.includes("30-day retention")) {
    throw new Error("Hosted /privacy page did not expose the expected retention language.");
  }

  if (
    privacyHtml.includes("This deployment has not configured a public support contact yet.")
  ) {
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

  writeStep("Hosted privacy page ok");
}

async function registerAccount() {
  const response = await request(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        name: "Hosted Smoke",
        organizationName: "Hosted Smoke Team",
        password: "LaunchReady2026",
        acceptTranscriptConsent: true
      })
    },
    false
  );

  state.cookie = readSessionCookie(response);
  if (!state.cookie) {
    throw new Error("Registration did not return a session cookie.");
  }

  writeStep("Registration ok");
}

async function verifyDashboard(mode) {
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
  await request("/api/auth/account", { method: "DELETE" });
  state.cookie = "";
  writeStep("Account deletion ok");
}

async function verifyLoggedOut() {
  const response = await fetch(`${apiOrigin}/api/dashboard`, {
    headers: {
      Accept: "application/json"
    }
  });
  const body = await readJson(response);

  if (response.status !== 401 || body.error !== "Not authenticated.") {
    throw new Error("Post-delete dashboard check did not return 401.");
  }

  writeStep("Post-delete auth check ok");
}

async function request(pathname, init, requireSession = true) {
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

  if (!response.ok) {
    const body = await readJson(response);
    throw new Error(`${pathname} failed with ${response.status}: ${JSON.stringify(body)}`);
  }

  return response;
}

async function readJson(response) {
  const raw = await response.text();
  return raw ? JSON.parse(raw) : null;
}

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }

  return value;
}

function readOptionalEnv(name) {
  return process.env[name]?.trim() || "";
}

function readBooleanExpectation(name, defaultValue, override = "") {
  const raw = (override || process.env[name] || "").trim().toLowerCase();
  if (!raw) {
    return defaultValue;
  }

  if (["1", "true", "yes", "on"].includes(raw)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(raw)) {
    return false;
  }

  throw new Error(`Invalid boolean value for ${name}: ${raw}`);
}

function parseArgs(argv) {
  const parsed = {
    api: "",
    expectOpenAiTextEnabled: "",
    expectStorageBackend: "",
    expectVoiceLabEnabled: "",
    supportEmail: "",
    supportUrl: "",
    web: ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1] || "";

    if (token === "--api") {
      parsed.api = next;
      index += 1;
      continue;
    }

    if (token === "--web") {
      parsed.web = next;
      index += 1;
      continue;
    }

    if (token === "--support-email") {
      parsed.supportEmail = next;
      index += 1;
      continue;
    }

    if (token === "--support-url") {
      parsed.supportUrl = next;
      index += 1;
      continue;
    }

    if (token === "--expect-storage-backend") {
      parsed.expectStorageBackend = next;
      index += 1;
      continue;
    }

    if (token === "--expect-openai-text-enabled") {
      parsed.expectOpenAiTextEnabled = next;
      index += 1;
      continue;
    }

    if (token === "--expect-voice-lab-enabled") {
      parsed.expectVoiceLabEnabled = next;
      index += 1;
      continue;
    }
  }

  return parsed;
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
