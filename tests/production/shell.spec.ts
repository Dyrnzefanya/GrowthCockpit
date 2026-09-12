import { test, expect } from "../support/auth";
test("production blocks the gallery and serves the shell within the paint budget", async ({
  page,
}, info) => {
  const gallery = await page.goto("/dev/gallery");
  expect(gallery?.status()).toBe(404);
  await expect(
    page.getByText("ILLUSTRATIVE CONTENT", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Component gallery" }),
  ).toHaveCount(0);
  await page.goto("/today");
  await expect(page.getByText("PROD", { exact: true })).toBeVisible();
  await expect(page.locator("h1")).toHaveText("Today");
  const fcp = await page.evaluate(
    () =>
      performance
        .getEntriesByType("paint")
        .find((entry) => entry.name === "first-contentful-paint")?.startTime,
  );
  expect(fcp).toBeDefined();
  expect(fcp!).toBeLessThanOrEqual(1500);
  await info.attach("shell-first-contentful-paint", {
    body: JSON.stringify({
      fcpMs: fcp,
      environment: "local Chromium, warm local server, no throttling",
    }),
    contentType: "application/json",
  });
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings$/);
});
