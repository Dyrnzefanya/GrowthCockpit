import { expect, test } from "@playwright/test";

test("loads the Phase 0 placeholder", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Du Anyam Performance Marketing OS" }),
  ).toBeVisible();
  await expect(page.getByText("Project foundation is ready.")).toBeVisible();
});
