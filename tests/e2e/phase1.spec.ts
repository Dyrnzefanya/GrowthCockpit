import { test, expect } from "../support/auth";
import AxeBuilder from "@axe-core/playwright";
const routes = [
  "today",
  "performance",
  "leads",
  "leads/new",
  "funnel",
  "experiments",
  "playbook",
  "workflows",
  "reports",
  "integrations",
  "settings",
  "login",
];
test("TEST-1.1 all twelve routes are honest and reachable", async ({
  page,
}, info) => {
  // Thirteen navigations now include real Auth verification on a cold dev server.
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("404"))
      errors.push(message.text());
  });
  for (const route of routes) {
    const response = await page.goto("/" + route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    if (
      ![
        "login",
        "experiments",
        "playbook",
        "workflows",
        "leads",
        "leads/new",
        "funnel",
        "integrations",
      ].includes(route)
    )
      await expect(page.locator("main")).toContainText(/Phase \d/);
    if (!["workflows", "leads", "funnel", "integrations"].includes(route))
      await expect(page.locator("tbody tr")).toHaveCount(0);
    if (route !== "login") {
      const settings = page
        .getByRole("navigation", { name: "Primary navigation" })
        .getByRole("link", { name: "Settings", exact: true });
      await expect(settings).toBeInViewport();
    }
    await page.screenshot({
      caret: "initial",
      path: info.outputPath(route.replaceAll("/", "-") + ".png"),
      fullPage: true,
    });
  }
  const missing = await page.goto("/does-not-exist");
  expect(missing?.status()).toBe(404);
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("TEST-1.2 axe shell and representative routes", async ({ page }) => {
  for (const path of [
    "/today",
    "/performance",
    "/leads",
    "/experiments",
    "/dev/gallery",
  ]) {
    await page.goto(path);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations, path).toEqual([]);
  }
});
test("TEST-1.3 responsive navigation, focus, and screenshots", async ({
  page,
}, info) => {
  for (const width of [1280, 1920, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/today");
    await expect(
      page.getByRole("heading", { name: "Today", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      caret: "initial",
      path: info.outputPath("today-" + width + ".png"),
      fullPage: true,
    });
    if (width === 390) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      const drawer = page.getByRole("dialog");
      await expect(drawer).toBeVisible();
      await page.screenshot({
        caret: "initial",
        path: info.outputPath("navigation-mobile.png"),
        fullPage: true,
      });
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "Open navigation" }),
      ).toBeFocused();
      await page.getByRole("button", { name: "Open navigation" }).click();
      await drawer.getByRole("link", { name: "Leads", exact: true }).click();
      await expect(page).toHaveURL(/\/leads$/);
      await expect(drawer).not.toBeVisible();
    }
  }
  await page.goto("/today");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  expect(
    await page
      .getByRole("link", { name: "Skip to content" })
      .evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});
test("TEST-1.4 table sorting, pagination, visibility, empty, loading and drawer", async ({
  page,
}, info) => {
  await page.goto("/dev/gallery");
  const table = page.getByRole("region", { name: "Illustrative inquiries" });
  await expect(table.locator("tbody tr")).toHaveCount(10);
  await page.getByRole("button", { name: "Inquiry", exact: true }).click();
  await page.getByRole("button", { name: "Inquiry", exact: true }).click();
  await expect(table.locator("tbody tr").first()).toContainText("200");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 of 20")).toBeVisible();
  await page.getByRole("button", { name: "Columns" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Company" }).click();
  await page.keyboard.press("Escape");
  await expect(
    table.getByRole("columnheader", { name: "Company" }),
  ).toHaveCount(0);
  await table.getByRole("button", { name: /View/ }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByLabel("Example rows").selectOption("1");
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Example rows").selectOption("0");
  await expect(page.getByRole("heading", { name: "No records" })).toBeVisible();
  await page.getByLabel("Show table loading").click();
  await expect(
    page.getByRole("status", { name: "Loading table" }),
  ).toBeVisible();
  await page.getByLabel("Show table loading").click();
  await page.getByLabel("Example rows").selectOption("200");
  await page.getByRole("button", { name: "Columns" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Company" }).click();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await table.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    caret: "initial",
    path: info.outputPath("gallery-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    caret: "initial",
    path: info.outputPath("gallery-desktop.png"),
    fullPage: true,
  });
  for (const title of ["Empty", "Error", "Loading", "Inputs & controls"]) {
    await page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
      .screenshot({
        path: info.outputPath(title.replaceAll(/[^a-zA-Z]/g, "-") + ".png"),
      });
  }
});
test("TEST-1.5 filter URL round-trip and invalid values", async ({ page }) => {
  await page.goto("/dev/gallery?from=bad&to=2026-02-30&keep=yes");
  const form = page.getByRole("form", { name: "Filter records" });
  await expect(form.getByLabel("From", { exact: true })).toHaveValue("");
  await form.getByLabel("Search", { exact: true }).fill("inquiry 001");
  await form.getByLabel("From", { exact: true }).fill("2026-09-20");
  await form.getByLabel("To", { exact: true }).fill("2026-09-11");
  await form.getByRole("button", { name: "Apply" }).click();
  expect(
    await form
      .locator('input[name="to"]')
      .evaluate((input: HTMLInputElement) => input.validity.customError),
  ).toBe(true);
  await form.getByLabel("From", { exact: true }).fill("2026-09-01");
  await form.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/q=inquiry/);
  await page.reload();
  await expect(form.getByLabel("Search", { exact: true })).toHaveValue(
    "inquiry 001",
  );
  await expect(page.locator("tbody tr")).toHaveCount(1);
  expect(new URL(page.url()).searchParams.get("keep")).toBe("yes");
});
test("confirmation, retry, tabs and keyboard trap work", async ({ page }) => {
  await page.goto("/dev/gallery");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Illustrative retry completed.")).toBeVisible();
  await page.getByRole("button", { name: "Open confirmation" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let index = 0; index < 6; index++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open confirmation" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Open confirmation" }).click();
  await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByText("Illustrative action confirmed.")).toBeVisible();
  await page.getByRole("tab", { name: "Details", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toContainText(
    "Illustrative details",
  );
});
