import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { parsePorts, requireFreePort, startDemo } from "./demo-local.mjs";

const ports = parsePorts(
  process.argv.slice(2).length
    ? process.argv.slice(2)
    : ["--web-port", "4330", "--api-port", "4331"]
);
const output = path.resolve("test-results/client-demo-qa");
await mkdir(output, { recursive: true });
const demo = await startDemo(ports);
let browser;
try {
  browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(demo.web);
  await page.getByLabel("Name", { exact: true }).fill("Synthetic Demo Seller");
  await page.getByLabel("Organization", { exact: true }).fill("Synthetic Practice Team");
  await page.getByLabel("Email", { exact: true }).fill(`demo-${randomUUID()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(`Synthetic-${randomUUID()}-Aa7`);
  await page.getByRole("checkbox", { name: /I consent to transcript storage/ }).check();
  await page.locator("form").getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByText("available scenarios")).toBeVisible();
  await page.getByRole("button", { name: "Start session", exact: true }).first().click();
  await page.waitForURL("**/roleplay/**");
  await expect(
    page.getByRole("heading", { name: "Change Management Adoption", exact: true, level: 1 })
  ).toBeVisible();
  await page
    .getByLabel("Your seller reply")
    .fill("We have roleplay features and training content for manager coaching.");
  await page.getByRole("button", { name: "Send seller turn", exact: true }).click();
  await expect(page.getByText("3 messages", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pause for coach", exact: true }).click();
  await expect(page.getByText("1 coach pauses", { exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(output, "coach-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "End session", exact: true }).click();
  await expect(page.locator("header").getByText("Completed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to dashboard", exact: true }).click();
  await page.getByRole("button", { name: "Review transcript", exact: true }).first().click();
  await page.waitForURL("**/roleplay/**");
  await expect(
    page.getByRole("heading", { name: "Change Management Adoption", exact: true, level: 1 })
  ).toBeVisible();
  await expect(
    page.getByText("We have roleplay features and training content for manager coaching.", {
      exact: true
    })
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [name, filename] of [
    ["Change Management Adoption", "transcript-mobile.png"],
    ["What matters in this conversation", "scenario-mobile.png"],
    ["Retrieved evidence in play", "evidence-mobile.png"],
    ["Session details", "details-mobile.png"]
  ]) {
    const heading = page.getByRole("heading", { name, exact: true });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeInViewport();
    await page.screenshot({ path: path.join(output, filename), animations: "disabled" });
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const privacy = await context.request.get(`${demo.web}/privacy`);
  assert.ok((await privacy.text()).includes("Jason_C_Rae@Outlook.com"));
  const deletion = await context.request.delete(`${demo.web}/api/auth/account`);
  assert.equal(deletion.status(), 200);
  await page.goto(demo.web);
  await expect(
    page.locator("form").getByRole("button", { name: "Create workspace", exact: true })
  ).toBeVisible();
  assert.deepEqual(errors, []);
  await browser.close();
  browser = null;
  await demo.close();
  // Windows can release a listener shortly after taskkill returns. Allow that
  // shutdown to finish, while still failing if either owned port stays busy.
  for (const port of [ports.web, ports.api]) {
    const deadline = Date.now() + 10_000;
    while (true) {
      try {
        await requireFreePort(port);
        break;
      } catch (error) {
        if (Date.now() >= deadline) throw error;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }
  await assert.rejects(stat(path.join(demo.directory, "apps/api/data/demo-store.json")), {
    code: "ENOENT"
  });
  const result = {
    checkedAt: new Date().toISOString(),
    revision: demo.revision,
    sourceDirectory: demo.directory,
    health: demo.health,
    ports,
    checks: [
      "Fresh isolated local source and data",
      "Chrome registration and seeded buyer response",
      "Coach pause",
      "Session completion and transcript reopen",
      "390px transcript layout",
      "Approved privacy support contact",
      "Synthetic account deletion",
      "Servers stopped and demo store removed"
    ],
    note: "Local synthetic demo only. External browser requests blocked; no hosted launch or customer data."
  };
  await writeFile(path.join(output, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (browser) await browser.close();
  await demo.close();
}
