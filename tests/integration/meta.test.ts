import { it, expect, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { testEnvironment } from "../support/environment";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env.server", async () => ({
  serverEnv: {
    ...(await import("../support/environment")).testEnvironment,
    META_ACCESS_TOKEN: randomBytes(24).toString("hex"),
    META_AD_ACCOUNT_ID: "9999999911",
  },
}));
import { adminClient } from "@/lib/supabase/server-admin";
import { runJob } from "@/services/jobs/runner";
it("real local Meta job: pagination, double upsert, partial recovery, restatement and bounded backfill", async () => {
  expect(new URL(testEnvironment.NEXT_PUBLIC_SUPABASE_URL).hostname).toMatch(
    /^(127\.0\.0\.1|localhost)$/,
  );
  const db = adminClient(),
    original = globalThis.fetch;
  const metadata = await db
    .from("app_settings")
    .select("key,value")
    .in("key", ["meta.token_metadata", "meta.primary_result_type"]);
  let fail = false,
    spend = "100.50";
  const dates: string[] = [];
  vi.stubGlobal(
    "fetch",
    async (
      input: Parameters<typeof fetch>[0],
      options?: Parameters<typeof fetch>[1],
    ) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.hostname !== "graph.facebook.com")
        return original(input, options);
      expect(options?.method).toBe("GET");
      if (url.pathname.endsWith("debug_token"))
        return Response.json({
          data: { is_valid: true, expires_at: 0, scopes: ["ads_read"] },
        });
      if (url.pathname.endsWith("/act_9999999911"))
        return Response.json({
          account_id: "9999999911",
          name: "Local Meta integration test",
          currency: "IDR",
          timezone_name: "Asia/Jakarta",
        });
      const date = JSON.parse(url.searchParams.get("time_range")!).since;
      dates.push(date);
      if (fail && date === "2025-06-02")
        return Response.json(
          { error: { code: 190, message: "private" } },
          { status: 401 },
        );
      const second = url.searchParams.has("after");
      return Response.json({
        data: [
          {
            date_start: date,
            date_stop: date,
            campaign_id: second ? "222" : "111",
            campaign_name: second ? "Gift - Fase2 - Jun" : "Gift - Fase1 - Jun",
            spend,
            impressions: "1000",
            clicks: "10",
            actions: [{ action_type: "lead", value: "5" }],
          },
        ],
        ...(!second
          ? {
              paging: {
                cursors: { after: "second" },
                next: "https://graph.facebook.com/never-follow",
              },
            }
          : {}),
      });
    },
  );
  const count = async () => {
    const a = await db
      .from("ad_accounts")
      .select("id")
      .eq("external_account_id", "9999999911")
      .single();
    return await db
      .from("ad_metrics_daily")
      .select("spend,platform_results", { count: "exact" })
      .eq("ad_account_id", a.data!.id);
  };
  try {
    await db
      .from("app_settings")
      .update({ value: "lead" })
      .eq("key", "meta.primary_result_type");
    fail = true;
    let r = await runJob("JOB-META-INGEST", "manual", {
      from: "2025-06-01",
      to: "2025-06-02",
    });
    expect(r.status).toBe("partial");
    expect((await count()).count).toBe(2);
    const state = await db
      .from("sync_state")
      .select("cursor,last_error")
      .eq("integration", "meta")
      .eq("resource", "ingest")
      .single();
    expect(JSON.parse(state.data!.cursor!).date).toBe("2025-06-02");
    expect(state.data!.last_error).toBe("META_TOKEN_INVALID");
    fail = false;
    r = await runJob("JOB-META-INGEST", "manual");
    expect(r.status).toBe("success");
    expect((await count()).count).toBe(4);
    spend = "200.25";
    r = await runJob("JOB-META-INGEST", "manual", {
      from: "2025-06-01",
      to: "2025-06-02",
    });
    expect(r.status).toBe("success");
    expect((await count()).count).toBe(4);
    expect(
      (await count()).data?.every(
        (row) => row.spend === 200.25 && row.platform_results === 5,
      ),
    ).toBe(true);
    dates.length = 0;
    let calls = 0;
    do {
      r = await runJob(
        "JOB-META-INGEST",
        "manual",
        calls++ === 0 ? { from: "2025-01-01", to: "2025-03-31" } : undefined,
      );
      expect(["partial", "success"]).toContain(r.status);
      if (calls > 30) throw new Error("Backfill did not converge");
    } while ("hasMore" in r && r.hasMore);
    expect(new Set(dates).size).toBe(90);
    expect((await count()).count).toBe(184);
    console.info(
      `Phase 10 real persistence: 90-day backfill completed in ${calls} bounded invocations; 184 unique rows including prior fixture range.`,
    );
  } finally {
    vi.unstubAllGlobals();
    for (const row of metadata.data ?? [])
      await db
        .from("app_settings")
        .update({ value: row.value })
        .eq("key", row.key);
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
        "delete from public.ad_metrics_daily where ad_account_id in(select id from public.ad_accounts where external_account_id='9999999911'); delete from public.ad_accounts where external_account_id='9999999911'; delete from public.sync_state where integration='meta'; delete from public.alerts where source='meta';",
      ],
      { stdio: "ignore" },
    );
  }
});
