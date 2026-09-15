import AxeBuilder from "@axe-core/playwright";
import { test, expect, admin } from "../support/auth";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
test("Phase 10 empty performance, campaign comparison, column control and responsive access", async ({
  page,
}, info) => {
  await page.goto("/performance?from=2000-01-01&to=2000-01-02");
  await expect(
    page.getByText("Belum ada data iklan untuk rentang ini."),
  ).toBeVisible();
  const key = String(Date.now()),
    run = await admin.rpc("start_job", {
      p_key: "JOB-META-INGEST",
      p_trigger: "manual",
      p_correlation: randomUUID(),
    });
  if (run.error || !run.data)
    throw new Error("Cannot acquire local Meta fixture lease");
  const account = {
    account_id: key,
    name: "Phase 10 local fixture",
    currency: "IDR",
    timezone_name: "Asia/Jakarta",
  };
  const { error } = await admin.rpc("commit_meta_page", {
    p_run: run.data,
    p_account: account,
    p_rows: [
      {
        metric_date: "2025-05-01",
        campaign_id: key,
        campaign_name: "Local fixture - Fase1 - Mei",
        impressions: 1000,
        clicks: 20,
        spend: "100.00",
        currency: "IDR",
        source_timezone: "Asia/Jakarta",
      },
    ],
    p_cursor: null!,
    p_resource: "phase10-browser-test",
    p_complete: true,
  });
  if (error) throw new Error(`Meta fixture failed: ${error.code}`);
  await admin.rpc("finish_integration_run", {
    p_id: run.data,
    p_status: "success",
    p_read: 1,
    p_written: 1,
    p_failed: 0,
    p_error: null!,
    p_cursor: null!,
  });
  try {
    await page.goto("/performance/meta?from=2025-05-01&to=2025-05-02");
    await expect(
      page.getByRole("cell", {
        name: "Local fixture - Fase1 - Mei",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Reconciliation", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "Cari campaign" })
      .fill("Local fixture");
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await expect(page).toHaveURL(/q=Local/);
    await page.getByRole("button", { name: /Columns/ }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    for (const width of [390, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({
        path: info.outputPath(`performance-${width}.png`),
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
    await page.goto("/integrations");
    await expect(
      page.getByText("Meta Ads · read-only", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Phase 10 local fixture", { exact: false }),
    ).toBeVisible();
    const original = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "meta.primary_result_type")
      .single();
    try {
      await page
        .getByRole("textbox", { name: "Primary result action_type" })
        .fill("lead");
      await page.getByRole("button", { name: "Simpan action type" }).click();
      await expect(
        page.getByRole("status").filter({ hasText: "Action type tersimpan" }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole("textbox", { name: "Primary result action_type" }),
      ).toHaveValue("lead");
    } finally {
      await admin
        .from("app_settings")
        .update({ value: original.data?.value ?? null })
        .eq("key", "meta.primary_result_type");
    }
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  } finally {
    // Disposable local fixture only: service role intentionally has no DELETE grant.
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
        `delete from public.ad_metrics_daily where ad_account_id in(select id from public.ad_accounts where external_account_id='${key}'); delete from public.ad_accounts where external_account_id='${key}'; delete from public.sync_state where integration='meta' and resource='phase10-browser-test';`,
      ],
      { stdio: "ignore" },
    );
  }
});
