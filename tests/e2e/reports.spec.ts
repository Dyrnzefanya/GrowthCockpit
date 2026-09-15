import AxeBuilder from "@axe-core/playwright";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test, expect, admin } from "../support/auth";

const project = readFileSync("supabase/config.toml", "utf8").match(
    /^project_id = "([^"]+)"/m,
  )![1],
  account = "88880000-0000-4000-8000-000000000001",
  week = "2000-W01",
  start = "2000-01-03";

function sql(input: string) {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      `supabase_db_${project}`,
      "psql",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input, stdio: ["pipe", "pipe", "pipe"] },
  );
}

function cleanup() {
  sql(`begin;
set local session_replication_role=replica;
delete from public.alerts where source='reports' and evidence->>'iso_week'='${week}';
delete from public.reports where type='weekly' and period_start='${start}';
delete from public.leads where dedupe_key like 'phase12-e2e-%';
delete from public.ad_metrics_daily where ad_account_id='${account}';
delete from public.ad_accounts where id='${account}';
commit;`);
}

test("TEST-12.8 generate, edit, finalize, export and regenerate an immutable weekly report", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  cleanup();
  sql(`insert into public.ad_accounts(id,platform,external_account_id,name,currency,timezone,is_active)
values('${account}','meta','phase12-e2e','Phase 12 local fixture','IDR','Asia/Jakarta',true);
insert into public.ad_metrics_daily(ad_account_id,platform,campaign_id,campaign_name,metric_date,spend,impressions,clicks,currency,source_timezone)
values('${account}','meta','phase12-campaign','Phase 12 Campaign','${start}',100000,100000,5000,'IDR','Asia/Jakarta'),
('${account}','meta','phase12-campaign','Phase 12 Campaign','1999-12-27',80000,80000,4000,'IDR','Asia/Jakarta');
insert into public.leads(id,inquiry_at,inquiry_date,channel,platform,campaign_id,lt_campaign,qualification_status,qualification_reason,qualification_rule_version,qualification_settings,attribution_missing,dedupe_key,submission_keys,inquiry_observations)
select ('88880000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid,'${start} 02:00Z','${start}','import','meta','phase12-campaign','Phase 12 Campaign',case when n<=100 then 'mql' else 'disqualified' end,case when n<=100 then 'QTY_THRESHOLD_MET' else 'DQ_LOW_QUANTITY' end,'q1','{}',false,'phase12-e2e-'||n,array['phase12-e2e-'||n],array['${start} 02:00Z'::timestamptz] from generate_series(1,1000)n;`);
  try {
    await page.goto("/reports");
    await page.getByLabel("Report ISO week").fill(week);
    const started = performance.now();
    await page.getByRole("button", { name: "Generate report" }).click();
    await expect(page).toHaveURL(/\/reports\/[0-9a-f-]+$/);
    const elapsed = performance.now() - started;
    expect(elapsed).toBeLessThanOrEqual(10000);
    await info.attach("weekly-report-generation", {
      body: JSON.stringify({
        elapsedMs: elapsed,
        leads: 1000,
        environment: "local dev server and local Supabase",
      }),
      contentType: "application/json",
    });
    await expect(
      page.getByRole("article").getByText("1.000 leads", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("Data-quality caveats", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Revenue, ROAS and CAC are withheld/).first(),
    ).toBeVisible();
    const narrative = `## Executive summary

One thousand inquiries were captured in the selected week. One hundred reached MQL. Spend and quality were reviewed against the previous ISO week.

## Why it likely changed — interpretation

The fixture demonstrates a deterministic operator-authored interpretation.

## Next week's priorities

- Review follow-up quality.`;
    await page.getByLabel("Report narrative Markdown").fill(narrative);
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved.")).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export draft" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /growthcockpit-2000-W01-v\d+\.md/,
    );
    const reportId = page.url().split("/").at(-1)!;
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Finalize" }).click();
    await expect(page.getByText("final", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Report narrative Markdown")).toHaveCount(0);
    const frozen = await admin
      .from("reports")
      .update({ narrative_md: "tampered" })
      .eq("id", reportId);
    expect(frozen.error).not.toBeNull();
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(axe.violations).toEqual([]);
    for (const width of [390, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`report-${width}.png`),
        fullPage: true,
      });
    }
    await page.goto("/reports");
    await page.getByLabel("Report ISO week").fill(week);
    await page.getByRole("button", { name: "Generate report" }).click();
    await expect(page).toHaveURL(/\/reports\/[0-9a-f-]+$/);
    expect(page.url()).not.toContain(reportId);
    await expect(page.getByText(/· v2$/)).toBeVisible();
  } finally {
    cleanup();
  }
});
