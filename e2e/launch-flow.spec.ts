import { expect, test } from "@playwright/test";

test("user can complete the publish-path roleplay flow", async ({ page }) => {
  const email = `launch-${Date.now()}@example.com`;

  await page.goto("/");

  await page.getByLabel("Name").fill("Launch Tester");
  await page.getByLabel("Organization").fill("Publish Ready Team");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("LaunchReady2026");
  await expect(page.getByRole("link", { name: "Review privacy and retention" })).toBeVisible();
  await page.locator("form").getByRole("button", { name: "Create workspace" }).click();

  await expect(
    page.getByRole("heading", {
      name: "Drive one complete practice loop from scenario selection to transcript review."
    })
  ).toBeVisible();
  await expect(page.getByText("available scenarios")).toBeVisible();
  await expect(page.getByRole("button", { name: "Voice lab" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Privacy and retention" })).toBeVisible();

  const startButtons = page.getByRole("button", { name: "Start session" });
  await expect(startButtons.first()).toBeVisible();
  await startButtons.nth(0).click();

  await expect(page.getByRole("heading", { name: "Change Management Adoption" })).toBeVisible();
  await expect(page.getByText("1 messages")).toBeVisible();

  await page
    .getByLabel("Your seller reply")
    .fill(
      "We de-risk adoption with a two-team pilot, weekly manager scorecards, and a measured checkpoint inside the first 14 days."
    );
  await page.getByRole("button", { name: "Send seller turn" }).click();

  await expect(page.getByText("3 messages")).toBeVisible();
  await expect(page.getByText("Pause for coach")).toBeVisible();

  await page.getByRole("button", { name: "Pause for coach" }).click();
  await expect(page.getByText("1 coach pauses", { exact: true })).toBeVisible();
  await expect(page.getByText("COACH", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "End session" }).click();
  await expect(page.locator("header").getByText("Completed", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Back to dashboard" }).click();
  await expect(page.getByText("saved transcripts")).toBeVisible();
  await expect(page.getByRole("button", { name: "Review transcript" })).toBeVisible();
});
