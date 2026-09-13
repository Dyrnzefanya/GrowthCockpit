import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test, expect } from "../support/auth";
test("NFR-6.1 production lead first page at 50,000 rows", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const project = readFileSync("supabase/config.toml", "utf8").match(
    /^project_id = "([^"]+)"/m,
  )![1];
  const sql = (input: string) =>
    execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "supabase_db_" + project,
        "psql",
        "-U",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      { input, stdio: ["pipe", "pipe", "pipe"] },
    );
  try {
    sql(`insert into public.leads(id,inquiry_at,inquiry_date,channel,platform,qualification_status,qualification_reason,qualification_rule_version,qualification_settings,attribution_missing,dedupe_key,submission_keys,inquiry_observations)
  select ('99999999-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'2026-08-01Z','2026-08-01','import','unknown','disqualified','DQ_NO_CONTACT','q1','{}',true,'page-perf-'||n,array['page-perf-'||n],array['2026-08-01Z'::timestamptz] from generate_series(1,50000)n;
  analyze public.leads;`);
    await page.goto("/leads");
    await expect(page.locator("tbody tr")).toHaveCount(20);
    const elapsed: number[] = [];
    for (let n = 0; n < 3; n++) {
      const start = performance.now();
      await page.reload();
      await expect(page.locator("tbody tr")).toHaveCount(20);
      elapsed.push(performance.now() - start);
    }
    console.log("NFR-6.1 50k lead page (ms):", elapsed.map(Math.round));
    await info.attach("50k-lead-first-page", {
      body: JSON.stringify({
        elapsedMs: elapsed,
        environment:
          "Warm local production server, Chromium, local Supabase, unthrottled",
      }),
      contentType: "application/json",
    });
    expect(Math.max(...elapsed)).toBeLessThanOrEqual(800);
  } finally {
    sql(
      "delete from public.leads where id::text like '99999999-0000-4000-8000-%';",
    );
  }
});
