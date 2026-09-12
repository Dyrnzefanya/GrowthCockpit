import { expect, test } from "../support/auth";

test("opens the workspace through the root redirect", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Today", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/today$/);
});
