import AxeBuilder from "@axe-core/playwright";
import { test, expect, admin } from "../support/auth";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { shiftDate, toJakartaDate } from "../../src/domain/dates";

test("Phase 11 stale measurement, persisted evidence, snooze/dismiss, audited settings and responsive Today", async ({
  page,
}, info) => {
  const accountId = randomUUID(),
    campaignId = `phase11-${Date.now()}`,
    today = toJakartaDate(new Date()),
    yesterday = shiftDate(today, -1);
  test.setTimeout(120000);
  const run = () =>
    page.evaluate(async () => {
      const response = await fetch("/api/jobs/JOB-EVALUATE-RULES", {
        method: "POST",
      });
      return { status: response.status, body: await response.json() };
    });
  const previous = await admin
    .from("sync_state")
    .select("*")
    .eq("integration", "meta")
    .eq("resource", "ingest")
    .maybeSingle();
  if (previous.error) throw new Error("Cannot snapshot local test state");
  const account = await admin.from("ad_accounts").insert({
    id: accountId,
    platform: "meta",
    external_account_id: campaignId,
    name: "Phase 11 local fixture",
    currency: "IDR",
    timezone: "Asia/Jakarta",
    is_active: true,
  });
  if (account.error)
    throw new Error(`Local account fixture failed: ${account.error.code}`);
  try {
    const fact = await admin.from("ad_metrics_daily").insert({
      ad_account_id: accountId,
      platform: "meta",
      campaign_id: campaignId,
      campaign_name: "Phase 11 stale campaign",
      metric_date: yesterday,
      spend: 500,
      impressions: 1000,
      clicks: 30,
      currency: "IDR",
      source_timezone: "Asia/Jakarta",
    });
    if (fact.error)
      throw new Error(`Local ad fixture failed: ${fact.error.code}`);
    const stale = await admin.from("sync_state").upsert(
      {
        integration: "meta",
        resource: "ingest",
        last_success_at: new Date(Date.now() - 72 * 3600000).toISOString(),
        cursor: null,
        last_error: null,
      },
      { onConflict: "integration,resource" },
    );
    if (stale.error) throw new Error("Cannot install stale local fixture");
    const url = "/api/jobs/JOB-EVALUATE-RULES";
    await page.request.get(url);
    const started = Date.now();
    const response = await run();
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    const result = response.body;
    expect(result.status).toBe("success");
    expect(Date.now() - started).toBeLessThan(30000);
    const scope = `${accountId}:${campaignId}`;
    const evaluations = await admin
      .from("rule_evaluations")
      .select("id,verdict,rule_version")
      .eq("scope_id", scope);
    expect(evaluations.error).toBeNull();
    expect(evaluations.data).toHaveLength(9);
    expect(evaluations.data?.every((row) => row.verdict === "SUPPRESSED")).toBe(
      true,
    );
    await page.goto("/today");
    await expect(
      page.getByText(/Target CPQL belum dikonfigurasi/),
    ).toBeVisible();
    await expect(
      page.getByText("Rekomendasi kampanye ditekan — perbaiki pengukuran."),
    ).toBeVisible();
    const card = page.getByRole("listitem").filter({
      has: page.getByRole("heading", { name: /Phase 11 stale campaign/ }),
    });
    await expect(card).toBeVisible();
    await card.getByText(/Bukti, periode dan batasan/).click();
    await expect(card.getByText(/Meta: stale/).first()).toBeVisible();
    for (const width of [390, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`phase11-today-${width}.png`),
        fullPage: true,
      });
    }
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await card.getByRole("button", { name: "Snooze", exact: true }).click();
    await expect(card).toHaveCount(0);
    const snoozed = await admin
      .from("alerts")
      .select("id,snooze_until")
      .eq("alert_key", `decision:R-00:campaign:${scope}`)
      .single();
    expect(snoozed.data?.snooze_until).toBeTruthy();
    // Expire only this synthetic local snooze, then verify duration behavior.
    await admin
      .from("alerts")
      .update({
        snooze_until: new Date(Date.now() - 1).toISOString(),
        suppressed_until: new Date(Date.now() - 1).toISOString(),
      })
      .eq("id", snoozed.data!.id);
    await page.goto("/today");
    await expect(card).toBeVisible();
    await card.getByLabel("Alasan dismiss").fill("Review fixture tomorrow");
    await card.getByRole("button", { name: "Dismiss sampai besok" }).click();
    await expect(card).toHaveCount(0);
    await run();
    await page.goto("/today");
    await expect(card).toHaveCount(0);
    await page.goto(`/performance/meta?scope=${encodeURIComponent(scope)}`);
    await expect(
      page.getByRole("heading", { name: "Riwayat evaluasi aturan" }),
    ).toBeVisible();
    await expect(page.getByText(/SUPPRESSED/).first()).toBeVisible();
    await page.goto("/settings");
    const threshold = page
      .locator("form")
      .filter({ has: page.getByLabel("R-03 · Kenaikan CPL", { exact: true }) });
    await threshold.getByRole("textbox").fill("-1");
    await threshold
      .getByRole("button", { name: "Simpan", exact: true })
      .click();
    await expect(threshold.getByRole("status")).toContainText("di luar batas");
    await threshold.getByRole("textbox").fill("0.3");
    await threshold
      .getByRole("button", { name: "Simpan", exact: true })
      .click();
    await expect(threshold.getByRole("status")).toContainText(
      "Tersimpan dan diaudit",
    );
    await expect(threshold.getByRole("textbox")).toHaveValue("0.3");
    const setting = await admin
      .from("app_settings")
      .select("audit_history")
      .eq("key", "rules.cpl_rise")
      .single();
    expect(
      Array.isArray(setting.data?.audit_history) &&
        setting.data.audit_history.length > 0,
    ).toBe(true);
    await threshold.getByRole("button", { name: "Reset default" }).click();
    await expect(threshold.getByRole("textbox")).toHaveValue("0.2");
    await page.goto(
      `/experiments/new?campaign_id=${encodeURIComponent(campaignId)}`,
    );
    await expect(page.getByLabel("Campaign ID", { exact: true })).toHaveValue(
      campaignId,
    );
  } finally {
    if (previous.data)
      await admin
        .from("sync_state")
        .upsert(previous.data, { onConflict: "integration,resource" });
    execFileSync(
      "docker",
      [
        "exec",
        "supabase_db_Dyrn-Digitaldashboard",
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        `delete from public.rule_evaluations where scope_id='${accountId}:${campaignId}'; delete from public.alerts where source='decisions' and alert_key like '%${accountId}%'; delete from public.ad_metrics_daily where ad_account_id='${accountId}'; delete from public.ad_accounts where id='${accountId}'; ${previous.data ? "" : "delete from public.sync_state where integration='meta' and resource='ingest';"}`,
      ],
      { stdio: "ignore" },
    );
  }
});
