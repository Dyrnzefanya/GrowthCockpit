import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test, expect, admin } from "../support/auth";
import { testEnvironment } from "../support/environment";
import { cleanupLeads } from "../support/crm";
import { sign } from "../../src/lib/http/hmac";
test("TEST-7/13.3 signed inquiry, recovery, security headers, job health and UI", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const marker = randomUUID(),
    ids: string[] = [],
    leads: string[] = [],
    start = new Date().toISOString();
  const body = JSON.stringify({
    source_channel: "web_form",
    occurred_at: "2026-09-14T00:00:00Z",
    contact: { email: `phase7-${marker}@example.test` },
    company: { name: "Local integration fixture" },
    inquiry: { product_interest: marker, estimated_quantity: 100 },
    attribution: { utm_source: "facebook", utm_campaign: marker },
  });
  const timestamp = String(Math.floor(Date.now() / 1000)),
    headers = {
      "content-type": "application/json",
      "x-timestamp": timestamp,
      "idempotency-key": marker,
      "x-signature": sign(
        testEnvironment.INGEST_HMAC_SECRET,
        timestamp,
        "POST",
        "/api/ingest/lead",
        Buffer.from(body),
      ),
    };
  const job = async () => {
    const status = await page.evaluate(
      async () =>
        (await fetch("/api/jobs/JOB-RETRY-EVENTS", { method: "POST" })).status,
    );
    return { status: () => status };
  };
  const db = (sql: string) => {
    const project = readFileSync("supabase/config.toml", "utf8").match(
      /^project_id = "([^"]+)"/m,
    )![1];
    return execFileSync(
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
        "-At",
      ],
      { input: sql, encoding: "utf8" },
    );
  };
  try {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        page.request.post("/api/ingest/lead", { data: body, headers }),
      ),
    );
    expect(responses.filter((r) => r.status() === 202)).toHaveLength(1);
    expect(responses.every((r) => [200, 202].includes(r.status()))).toBe(true);
    const receipt = await responses[0].json();
    ids.push(receipt.event_id);
    await expect
      .poll(
        async () =>
          (
            await admin
              .from("webhook_events")
              .select("status")
              .eq("id", ids[0])
              .single()
          ).data?.status,
        { timeout: 30000 },
      )
      .toBe("processed");
    const rows = await admin
      .from("leads")
      .select("id,qualification_status,source_event_id")
      .eq("source_event_id", ids[0]);
    expect(rows.data).toHaveLength(1);
    leads.push(rows.data![0].id);
    expect(rows.data![0].qualification_status).toBe("mql");
    const replay = await page.request.post("/api/ingest/lead", {
      data: body,
      headers: { ...headers, "idempotency-key": randomUUID() },
    });
    expect((await replay.json()).replayed).toBe(true);
    const rejected = await page.request.post("/api/ingest/lead", {
      data: body,
      headers: { ...headers, "x-signature": "0".repeat(64) },
    });
    expect(rejected.status()).toBe(401);
    const correlation = (await rejected.json()).correlation_id;
    const bad = await admin
      .from("webhook_events")
      .select("id,payload")
      .eq("correlation_id", correlation)
      .single();
    expect(bad.data?.payload).toBeNull();
    ids.push(bad.data!.id);
    const invalid = await page.request.post("/api/ingest/lead", {
      data: body,
      headers: { ...headers, "content-type": "text/plain" },
    });
    expect(invalid.status()).toBe(415);
    const oversize = await page.request.post("/api/ingest/lead", {
      data: "x".repeat(262145),
      headers,
    });
    expect(oversize.status()).toBe(413);
    expect(
      (
        await page.request.post("/api/jobs/JOB-RETRY-EVENTS", {
          headers: { authorization: "Bearer incorrect" },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await page.request.post("/api/jobs/JOB-RETRY-EVENTS", {
          headers: { origin: "https://attacker.test" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (await page.request.get("/api/jobs/JOB-RETRY-EVENTS")).status(),
    ).toBe(401);
    const healthResponse = await page.request.get("/api/health");
    expect(healthResponse.status()).toBe(200);
    expect(healthResponse.headers()["strict-transport-security"]).toBe(
      "max-age=31536000; includeSubDomains",
    );
    // A durable expired worker is retryable. The existing business replay key prevents a second lead.
    await admin
      .from("webhook_events")
      .update({
        status: "failed",
        next_retry_at: new Date(Date.now() - 1000).toISOString(),
      })
      .eq("id", ids[0]);
    expect((await job()).status()).toBe(200);
    expect((await job()).status()).toBe(200);
    expect(
      (await admin.from("leads").select("id").eq("source_event_id", ids[0]))
        .data,
    ).toHaveLength(1);
    // Force a real transactional failure for this local fixture only, not an application test hook.
    db(
      `create function public.phase7_test_failure() returns trigger language plpgsql as $$ begin if new.product_interest='${marker}-retry' then raise exception 'FORCED_LOCAL_TEST' using errcode='XX000'; end if; return new; end $$; create trigger phase7_test_failure before insert on public.leads for each row execute function public.phase7_test_failure();`,
    );
    const retryBody = body.replace(marker + '"', marker + '-retry"');
    const retryReceipt = await (
      await page.request.post("/api/ingest/lead", {
        data: retryBody,
        headers: {
          ...headers,
          "idempotency-key": randomUUID(),
          "x-signature": sign(
            testEnvironment.INGEST_HMAC_SECRET,
            timestamp,
            "POST",
            "/api/ingest/lead",
            Buffer.from(retryBody),
          ),
        },
      })
    ).json();
    ids.push(retryReceipt.event_id);
    await expect
      .poll(
        async () =>
          (
            await admin
              .from("webhook_events")
              .select("status")
              .eq("id", retryReceipt.event_id)
              .single()
          ).data?.status,
        { timeout: 30000 },
      )
      .toBe("failed");
    for (let attempt = 2; attempt <= 5; attempt++) {
      await admin
        .from("webhook_events")
        .update({ next_retry_at: new Date(Date.now() - 1000).toISOString() })
        .eq("id", retryReceipt.event_id);
      expect((await job()).status()).toBe(200);
    }
    const exhausted = await admin
      .from("webhook_events")
      .select("status,attempts,next_retry_at")
      .eq("id", retryReceipt.event_id)
      .single();
    expect(exhausted.data).toMatchObject({
      status: "dead_letter",
      attempts: 5,
      next_retry_at: null,
    });
    db(
      "drop trigger phase7_test_failure on public.leads; drop function public.phase7_test_failure();",
    );
    for (const [jobKey, errorCode] of [
      ["JOB-META-INGEST", "UPSTREAM_UNAVAILABLE"],
      ["JOB-NOTIFY-DISPATCH", "UPSTREAM_RATE_LIMITED"],
      ["JOB-DATA-HEALTH", "SCHEDULE_OVERDUE"],
    ] as const) {
      const started = await admin.rpc("start_job", {
        p_key: jobKey,
        p_trigger: "schedule",
        p_correlation: randomUUID(),
      });
      expect(started.error).toBeNull();
      const finished = await admin.rpc("finish_integration_run", {
        p_id: started.data!,
        p_status: "failed",
        p_read: 0,
        p_written: 0,
        p_failed: 1,
        p_error: errorCode,
        p_cursor: null!,
      });
      expect(finished.error).toBeNull();
    }
    await page.goto("/integrations");
    await expect(
      page.getByRole("heading", { name: "Integrations", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Retry now", exact: true }).click();
    await expect(
      page
        .getByText(
          "Event dijadwalkan ulang. Jalankan retry job atau tunggu scheduler.",
        )
        .first(),
    ).toBeVisible();
    await expect(
      page.getByText("JOB-RETENTION", { exact: false }),
    ).toBeVisible();
    for (const errorCode of [
      "UPSTREAM_UNAVAILABLE",
      "UPSTREAM_RATE_LIMITED",
      "SCHEDULE_OVERDUE",
    ])
      await expect(
        page.getByText(errorCode, { exact: false }).first(),
      ).toBeVisible();
    await page
      .getByRole("article")
      .filter({ hasText: "JOB-RETRY-EVENTS" })
      .getByRole("button", { name: "Run now", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Job: success" }),
    ).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Detail run" }).first().click();
    await expect(page.getByRole("dialog")).toContainText("Correlation ID");
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Detail run" }).first(),
    ).toBeFocused();
    for (const width of [390, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/integrations");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: info.outputPath(`integrations-${width}.png`),
        fullPage: true,
      });
    }
    await page.goto("/today");
    await expect(
      page.getByRole("heading", { name: "Data health · retry queue" }),
    ).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  } finally {
    db(
      "drop trigger if exists phase7_test_failure on public.leads; drop function if exists public.phase7_test_failure();",
    );
    const all = await admin
      .from("leads")
      .select("id")
      .in("product_interest", [marker, marker + "-retry"]);
    await cleanupLeads([
      ...new Set([...leads, ...(all.data ?? []).map((l) => l.id)]),
    ]);
    // Local-only superuser cleanup; product roles cannot delete history.
    db(
      `delete from public.integration_runs where started_at >= '${start}'; delete from public.webhook_events where received_at >= '${start}'; delete from public.sync_state where integration in ('jobs','lead_ingest');`,
    );
  }
});
