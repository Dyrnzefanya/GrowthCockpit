import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { admin, invitedSession } from "../support/auth";
import { testEnvironment } from "../support/environment";
test.describe.configure({ mode: "serial" });

test("TEST-2.1 protected routes reject anonymous and forged requests", async ({
  request,
  page,
}) => {
  for (const path of [
    "/today",
    "/performance",
    "/leads",
    "/leads/a",
    "/funnel",
    "/experiments",
    "/playbook",
    "/workflows",
    "/workflows/templates",
    "/reports",
    "/integrations",
    "/settings",
    "/dev/gallery",
  ]) {
    const response = await request.get(path, {
      maxRedirects: 0,
      headers: {
        "x-middleware-subrequest": "proxy:proxy:proxy:proxy:proxy",
        "x-workspace-path": "/login",
      },
    });
    expect(response.status()).toBe(307);
    expect(
      new URL(response.headers().location, testEnvironment.APP_BASE_URL)
        .pathname,
    ).toBe("/login");
    expect(
      new URL(
        response.headers().location,
        testEnvironment.APP_BASE_URL,
      ).searchParams.get("next"),
    ).toBe(path);
  }
  await page.goto("/login?next=https://evil.test");
  await expect(page.locator('input[name="next"]')).toHaveValue("/today");
  await page.goto(
    "/auth/confirm?type=email&token_hash=invalid&next=//evil.test",
  );
  await expect(page).toHaveURL(/\/login\?error=link$/);
  await expect(
    page.getByText("This sign-in link could not be used.", { exact: false }),
  ).toBeVisible();
  const anon = createClient(
    testEnvironment.NEXT_PUBLIC_SUPABASE_URL,
    testEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false } },
  );
  expect(
    (
      await anon.auth.signUp({
        email: `uninvited-${randomUUID()}@example.test`,
        password: randomUUID(),
      })
    ).error,
  ).not.toBeNull();
  expect((await anon.from("profiles").select("*")).error).not.toBeNull();
  expect((await anon.from("app_settings").select("*")).error).not.toBeNull();
  await page
    .getByLabel("Email", { exact: true })
    .fill(`unknown-${randomUUID()}@example.test`);
  await page.getByRole("button", { name: "Email sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText(
    "If your account is invited",
  );
  await expect(page).toHaveTitle("Du Anyam Performance Marketing OS");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("TEST-2.5 real email login, settings audit, logout and two-tab expiry", async ({
  page,
  context,
}, info) => {
  const account = await invitedSession(page);
  try {
    await page.context().clearCookies();
    await page.goto("/settings");
    await expect(page).toHaveURL(/login\?next=/);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByRole("button", { name: "Email sign-in link" }).click();
    await expect(page.getByRole("status")).toContainText(
      "If your account is invited",
    );
    let emailLink = "";
    await expect
      .poll(async () => {
        const response = await fetch("http://127.0.0.1:54324/api/v1/messages");
        const inbox = await response.json();
        const message = inbox.messages.find(
          (item: { To: { Address: string }[] }) =>
            item.To.some((to) => to.Address === account.email),
        );
        if (!message) return false;
        const mail = await (
          await fetch(`http://127.0.0.1:54324/api/v1/message/${message.ID}`)
        ).json();
        emailLink =
          String(mail.HTML)
            .match(/href="([^"]+)"/)?.[1]
            .replaceAll("&amp;", "&") ?? "";
        return Boolean(emailLink);
      })
      .toBe(true);
    await page.goto(emailLink);
    await expect(page).toHaveURL(/\/settings$/);
    const sessionCookies = (await context.cookies()).filter((cookie) =>
      cookie.name.startsWith("sb-"),
    );
    expect(sessionCookies.length).toBeGreaterThan(0);
    for (const cookie of sessionCookies) {
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.secure).toBe(true);
      expect(cookie.sameSite).toBe("Lax");
    }
    expect(await page.evaluate(() => document.cookie.includes("sb-"))).toBe(
      false,
    );
    await page.getByLabel("Full name", { exact: true }).fill("   ");
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await expect(
      page.getByText(
        "Enter a name between 1 and 120 characters. Nothing was saved.",
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
      "   ",
    );
    await page
      .getByLabel("Full name", { exact: true })
      .fill("Local verification operator");
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await expect(
      page.getByText("Profile saved.", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Save preferences", exact: true })
      .click();
    await expect(
      page.getByText("Preferences saved.", { exact: true }),
    ).toBeVisible();
    const row = await admin
      .from("app_settings")
      .select("updated_by,updated_at")
      .eq("key", "workspace.timezone")
      .single();
    expect(row.data?.updated_by).toBe(account.id);
    expect(Date.parse(row.data!.updated_at)).toBeGreaterThan(
      Date.now() - 60_000,
    );
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    for (const width of [1280, 1920, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`settings-${width}.png`),
        fullPage: true,
      });
      await page.getByRole("button", { name: "Account", exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("menuitem", { name: "Sign out", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "Account", exact: true }),
      ).toBeFocused();
    }
    const otherTab = await context.newPage();
    await otherTab.goto("/leads");
    await page.getByRole("button", { name: "Account", exact: true }).click();
    await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await otherTab.reload();
    await expect(otherTab).toHaveURL(/login\?next=%2Fleads/);
    await page.goto("/today");
    await expect(page).toHaveURL(/login\?next=%2Ftoday/);
  } finally {
    await admin.auth.admin.deleteUser(account.id);
  }
});

test("TEST-2.4 malformed settings and missing profile are recoverable", async ({
  page,
}) => {
  const account = await invitedSession(page);
  try {
    await admin
      .from("app_settings")
      .update({ value: { invalid: true } })
      .eq("key", "workspace.timezone");
    await page.goto("/settings");
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Some settings need attention" }),
    ).toContainText("using its documented default");
    await expect(
      page.getByRole("combobox", { name: "Business timezone", exact: true }),
    ).toHaveValue("Asia/Jakarta");
    await admin.from("profiles").delete().eq("id", account.id);
    await page.reload();
    await expect(
      page.getByText(/Your profile is unavailable or access is restricted/),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Primary navigation" }),
    ).toBeVisible();
  } finally {
    await admin
      .from("app_settings")
      .update({ value: "Asia/Jakarta" })
      .eq("key", "workspace.timezone");
    await admin.auth.admin.deleteUser(account.id);
  }
});
