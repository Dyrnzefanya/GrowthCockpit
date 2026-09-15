import { test, expect } from "../support/auth";
import AxeBuilder from "@axe-core/playwright";

for (const width of [1280, 1920, 390]) {
  test(`operator refinement: headers and date interaction at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "today",
      "performance",
      "leads",
      "experiments",
      "dev/gallery",
    ]) {
      await page.goto("/" + route);
      const heading = page.locator("h1");
      const header = page.locator("main > header, main > div > header").first();
      await expect(heading).toBeVisible();
      await expect(
        header.getByRole("button", { name: /^Date range:/ }),
      ).toBeVisible();
      await expect(page.getByText("To · Jakarta", { exact: true })).toHaveCount(
        0,
      );
      await expect(
        page.getByRole("form", { name: "Global date range" }),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect((await heading.boundingBox())!.y).toBeLessThan(125);
      if (route === "performance" && width >= 1280) {
        const card = page.locator("section").filter({
          has: page.getByRole("heading", {
            name: "Meta Ads belum terhubung",
            exact: true,
          }),
        });
        expect((await card.boundingBox())!.width).toBeLessThanOrEqual(768);
      }
      await page.screenshot({
        path: info.outputPath(route.replaceAll("/", "-") + ".png"),
        fullPage: true,
        caret: "initial",
      });
    }

    await page.goto("/performance?keep=yes&from=bad&to=2026-02-30");
    const trigger = page.getByRole("button", { name: /^Date range:/ });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Reporting date range" });
    const from = dialog.getByLabel("From", { exact: true });
    const to = dialog.getByLabel("To", { exact: true });
    await expect(from).toBeFocused();
    await expect(from).toHaveValue("");
    await expect(to).toHaveValue("");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    for (let index = 0; index < 8; index++) {
      await page.keyboard.press("Tab");
      expect(
        await dialog.evaluate((element) =>
          element.contains(document.activeElement),
        ),
      ).toBe(true);
    }
    await from.fill("2026-09-20");
    await to.fill("2026-09-11");
    await dialog.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(dialog).toBeVisible();
    expect(
      await to.evaluate(
        (input: HTMLInputElement) => input.validity.customError,
      ),
    ).toBe(true);
    await from.fill("2026-09-01");
    const fromBox = (await from.boundingBox())!;
    const toBox = (await to.boundingBox())!;
    expect(toBox.x - fromBox.x - fromBox.width).toBeGreaterThanOrEqual(8);
    if (width === 390) expect(fromBox.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({
      path: info.outputPath("date-dialog.png"),
      caret: "initial",
    });
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await dialog.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(trigger).toContainText("2026-09-01 – 2026-09-11");
    expect(new URL(page.url()).searchParams.get("keep")).toBe("yes");
    await page.reload();
    await trigger.click();
    await expect(from).toHaveValue("2026-09-01");
    await expect(to).toHaveValue("2026-09-11");
    await from.fill("2026-09-02");
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(from).toHaveValue("2026-09-01");
    await dialog.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(trigger).toHaveText("Date range");
    await expect(page).toHaveURL(/performance\?keep=yes$/);
  });
}
