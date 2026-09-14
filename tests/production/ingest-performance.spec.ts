import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { admin } from "../support/auth";
import { testEnvironment } from "../support/environment";
import { cleanupLeads } from "../support/crm";
import { sign } from "../../src/lib/http/hmac";
test("NFR-7.1 durable signed receipt p95 <=500ms and production bearer dispatch", async ({
  request,
}, info) => {
  test.setTimeout(120000);
  const events: string[] = [],
    times: number[] = [];
  try {
    for (let i = 0; i < 21; i++) {
      const body = JSON.stringify({
        source_channel: "web_form",
        occurred_at: new Date().toISOString(),
        inquiry: { product_interest: "performance-" + randomUUID() },
      });
      const timestamp = String(Math.floor(Date.now() / 1000));
      const start = performance.now();
      const response = await request.post("/api/ingest/lead", {
        data: body,
        headers: {
          "content-type": "application/json",
          "idempotency-key": randomUUID(),
          "x-timestamp": timestamp,
          "x-signature": sign(
            testEnvironment.INGEST_HMAC_SECRET,
            timestamp,
            "POST",
            "/api/ingest/lead",
            Buffer.from(body),
          ),
        },
      });
      const duration = performance.now() - start;
      expect(response.status()).toBe(202);
      events.push((await response.json()).event_id);
      if (i > 0) times.push(duration);
      await expect
        .poll(
          async () =>
            (
              await admin
                .from("webhook_events")
                .select("status")
                .eq("id", events.at(-1)!)
                .single()
            ).data?.status,
          { timeout: 15000 },
        )
        .toBe("processed");
    }
    const p95 = [...times].sort((a, b) => a - b)[
      Math.ceil(times.length * 0.95) - 1
    ];
    await info.attach("ingest-p95", {
      body: JSON.stringify({
        samples: times,
        p95,
        environment:
          "local production server and local Supabase; warm requests",
      }),
      contentType: "application/json",
    });
    console.log(`NFR-7.1 local production ingest p95: ${p95.toFixed(1)}ms`);
    expect(p95).toBeLessThanOrEqual(500);
    const headers = { authorization: `Bearer ${testEnvironment.CRON_SECRET}` };
    expect(
      (await request.get("/api/jobs/JOB-RETRY-EVENTS", { headers })).status(),
    ).toBe(200);
    expect(
      (
        await (
          await request.post("/api/jobs/JOB-RETRY-EVENTS", { headers })
        ).json()
      ).status,
    ).toBe("success");
  } finally {
    if (events.length) {
      const rows = await admin
        .from("leads")
        .select("id")
        .in("source_event_id", events);
      await cleanupLeads((rows.data ?? []).map((l) => l.id));
      const project = readFileSync("supabase/config.toml", "utf8").match(
        /^project_id = "([^"]+)"/m,
      )![1];
      const ids = events.map((id) => "'" + id + "'").join(",");
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
        {
          input: `delete from public.integration_runs where event_id in (${ids});delete from public.webhook_events where id in (${ids});`,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
    }
  }
});
