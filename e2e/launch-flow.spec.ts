import { expect, test } from "@playwright/test";

test("user can complete the publish-path roleplay flow", async ({ page }) => {
  const email = `launch-${Date.now()}@example.com`;

  await page.goto("/");

  await page.getByLabel("Name").fill("Launch Tester");
  await page.getByLabel("Organization").fill("Publish Ready Team");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("LaunchReady2026");
  await expect(page.getByRole("link", { name: "Review privacy and retention" })).toBeVisible();
  const consent = page.getByRole("checkbox", { name: /I consent to transcript storage/ });
  await expect(consent).not.toBeChecked();
  await consent.check();
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

test("seller turn submit is single-flight and preserves draft for retry after a recoverable failure", async ({
  page
}) => {
  const email = `launch-single-flight-${Date.now()}@example.com`;

  await page.goto("/");

  await page.getByLabel("Name").fill("Launch Tester");
  await page.getByLabel("Organization").fill("Publish Ready Team");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("LaunchReady2026");
  await page.getByRole("checkbox", { name: /I consent to transcript storage/ }).check();
  await page.locator("form").getByRole("button", { name: "Create workspace" }).click();

  await expect(
    page.getByRole("heading", {
      name: "Drive one complete practice loop from scenario selection to transcript review."
    })
  ).toBeVisible();

  const startButtons = page.getByRole("button", { name: "Start session" });
  await expect(startButtons.first()).toBeVisible();
  await startButtons.first().click();

  await expect(page.getByRole("heading", { name: "Change Management Adoption" })).toBeVisible();
  await expect(page.getByText("1 messages")).toBeVisible();

  const textarea = page.getByLabel("Your seller reply");
  let sellerTurnRequests = 0;
  let pendingSellerTurnRequests = 0;
  let releaseSellerTurnRequest!: () => void;
  const sellerTurnRequestHeld = new Promise<void>((resolve) => {
    releaseSellerTurnRequest = resolve;
  });

  await page.route(/\/api\/sessions\/[^/]+\/message$/, async (route) => {
    sellerTurnRequests += 1;
    pendingSellerTurnRequests += 1;
    try {
      if (sellerTurnRequests === 1) {
        await sellerTurnRequestHeld;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Seller turn failed temporarily. Please retry."
          })
        });
      } else {
        await route.continue();
      }
    } finally {
      pendingSellerTurnRequests -= 1;
    }
  });

  await textarea.press("Control+Enter");
  await page.waitForTimeout(250);
  expect(sellerTurnRequests).toBe(0);
  await expect(page.getByText("1 messages")).toBeVisible();

  const draft =
    "We can run a low-risk pilot with milestone check-ins and manager-visible KPIs in the first two weeks.";
  await textarea.fill(draft);

  await page.evaluate(() => {
    const textareaElement = document.querySelector("textarea");
    if (!(textareaElement instanceof HTMLTextAreaElement)) {
      throw new Error("Seller reply textarea not found.");
    }

    const formElement = textareaElement.closest("form");
    if (!(formElement instanceof HTMLFormElement)) {
      throw new Error("Seller reply form not found.");
    }

    formElement.requestSubmit();
    textareaElement.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        ctrlKey: true,
        metaKey: true,
        bubbles: true,
        cancelable: true
      })
    );
  });

  await expect(page.getByRole("heading", { name: "Seller and buyer exchange" })).toBeVisible();
  await expect(page.getByText("1 messages")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sending..." })).toBeVisible();
  await expect.poll(() => sellerTurnRequests).toBe(1);
  await expect.poll(() => pendingSellerTurnRequests).toBe(1);

  releaseSellerTurnRequest();

  await expect(
    page.getByText("Seller turn failed temporarily. Please retry.", { exact: true })
  ).toBeVisible();
  await expect(textarea).toHaveValue(draft);
  expect(sellerTurnRequests).toBe(1);

  await page.getByRole("button", { name: "Send seller turn" }).click();
  await expect(page.getByText("3 messages")).toBeVisible();
  await expect(textarea).toHaveValue("");
  expect(sellerTurnRequests).toBe(2);
});
