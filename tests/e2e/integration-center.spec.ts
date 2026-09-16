import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { test, expect, admin } from "../support/auth";

test("Integration Center keeps stored credentials out of HTML, browser assets, and coming-soon controls", async ({
  page,
}) => {
  const secret = `phase13-vault-${randomUUID()}-credential`;
  const replacement = `phase13-vault-${randomUUID()}-replacement`;
  const browserText: string[] = [];
  const consoleText: string[] = [];
  page.on("console", (message) => consoleText.push(message.text()));
  page.on("response", async (response) => {
    if (/text|javascript|json/.test(response.headers()["content-type"] ?? ""))
      browserText.push(await response.text().catch(() => ""));
  });
  try {
    await page.goto("/settings/integrations");
    await expect(
      page.getByRole("heading", { name: "Settings · Integrations" }),
    ).toBeVisible();
    const meta = page.getByRole("article").filter({ hasText: "Meta Ads" });
    await meta.getByLabel("Ad Account ID").fill("123456789");
    await meta.getByLabel("Access Token").fill(secret);
    await meta.getByRole("button", { name: "Save configuration" }).click();
    await expect(
      meta.getByText("Configuration saved.", { exact: false }),
    ).toBeVisible();
    await expect(meta.getByLabel("Access Token")).toHaveValue("");
    await expect(page.getByText("GrowthCockpit Settings")).toBeVisible();
    await expect(
      page.getByText("Existing value is never returned.").first(),
    ).toBeVisible();
    for (const name of [
      "Google Analytics 4",
      "Google Search Console",
      "Google Ads",
    ]) {
      const card = page.getByRole("article").filter({ hasText: name });
      await expect(card.getByText("COMING SOON")).toBeVisible();
      await expect(card.getByRole("textbox")).toHaveCount(0);
      await expect(card.getByRole("button")).toHaveCount(0);
    }
    await meta.getByLabel("Access Token").fill(replacement);
    await meta.getByRole("button", { name: "Replace configuration" }).click();
    await expect
      .poll(async () => {
        const result = await admin.rpc("resolve_integration_provider", {
          p_provider: "meta",
        });
        return (result.data as { secrets?: { access_token?: string } } | null)
          ?.secrets?.access_token;
      })
      .toBe(replacement);
    const resolved = await admin.rpc("resolve_integration_provider", {
      p_provider: "meta",
    });
    expect(resolved.error).toBeNull();
    expect(resolved.data).toMatchObject({
      secrets: { access_token: replacement },
    });
    expect(JSON.stringify(resolved.data)).not.toContain(secret);
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
        .violations,
    ).toEqual([]);
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    expect(await page.content()).not.toContain(secret);
    expect(await page.content()).not.toContain(replacement);
    expect(browserText.join("\n")).not.toContain(secret);
    expect(browserText.join("\n")).not.toContain(replacement);
    expect(consoleText.join("\n")).not.toContain(secret);
    expect(consoleText.join("\n")).not.toContain(replacement);
  } finally {
    const removed = await admin.rpc("remove_integration_provider", {
      p_provider: "meta",
      p_actor: null,
      p_correlation: randomUUID(),
    });
    expect(
      removed.error === null || removed.error.message === "NOT_CONFIGURED",
    ).toBe(true);
  }
});
