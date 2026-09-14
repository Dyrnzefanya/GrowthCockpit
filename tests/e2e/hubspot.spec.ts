import { test, expect, admin } from "../support/auth";
import { testEnvironment } from "../support/environment";
import { createHmac, randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { toJakartaDate } from "@/domain/dates";
test("Phase 8 mapping validation, authenticated UI, honest health and real signed webhook replay", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const original = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "hubspot.mapping")
    .single();
  const marker = Math.floor(Date.now() / 1000),
    eventIds: string[] = [];
  const runId = randomUUID();
  const contactId = randomUUID(),
    leadId = randomUUID(),
    now = new Date().toISOString();
  try {
    await page.goto("/integrations/hubspot");
    await expect(
      page.getByRole("heading", { name: "HubSpot CRM", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Run reconcile", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "belum dikonfigurasi" }),
    ).toBeVisible();
    for (const width of [390, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: info.outputPath(`hubspot-${width}.png`),
        fullPage: true,
      });
    }
    await page.goto("/settings");
    await page.getByLabel("HubSpot mapping (JSON)").fill('{"portal_id":"bad"}');
    await page.getByRole("button", { name: "Simpan mapping" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "mapping tidak valid" }),
    ).toBeVisible();
    expect(
      (
        await admin
          .from("app_settings")
          .select("value")
          .eq("key", "hubspot.mapping")
          .single()
      ).data?.value,
    ).toEqual(original.data?.value);
    const mapping = {
      portal_id: "12345",
      pipeline_id: "sales",
      lifecycle_map: { salesqualifiedlead: "sql" },
      deal_stage_map: { won: "won" },
      owner_map: {},
      properties: {
        first_touch_source: "original_utm_source",
        first_touch_medium: "original_utm_medium",
        first_touch_campaign: "original_utm_campaign",
        first_touch_content: "original_utm_content",
        first_touch_term: "original_utm_term",
        first_touch_landing_page: "original_landing_page",
      },
    };
    await page
      .getByLabel("HubSpot mapping (JSON)")
      .fill(JSON.stringify(mapping));
    await page.getByRole("button", { name: "Simpan mapping" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Mapping tersimpan" }),
    ).toBeVisible();
    await page.reload();
    expect(
      JSON.parse(await page.getByLabel("HubSpot mapping (JSON)").inputValue()),
    ).toEqual(mapping);
    const saved = await admin
      .from("app_settings")
      .select("value,updated_by")
      .eq("key", "hubspot.mapping")
      .single();
    expect(saved.data?.value).toEqual(mapping);
    expect(saved.data?.updated_by).toBeTruthy();
    expect(
      (
        await admin.from("contacts").insert({
          id: contactId,
          email: `${contactId}@example.test`,
          hubspot_contact_id: String(marker),
          lifecycle_stage: "salesqualifiedlead",
          synced_at: now,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.from("leads").insert({
          id: leadId,
          contact_id: contactId,
          inquiry_at: now,
          inquiry_date: toJakartaDate(now),
          channel: "manual",
          platform: "unknown",
          qualification_status: "disqualified",
          qualification_reason: "OPERATOR_OVERRIDE",
          qualification_rule_version: "q1",
          qualification_settings: {},
          manual_override: true,
          attribution_missing: true,
          dedupe_key: leadId,
          submission_keys: [leadId],
          inquiry_observations: [now],
        })
      ).error,
    ).toBeNull();
    await page.goto(`/leads/${leadId}`);
    await expect(
      page.getByRole("alert").filter({ hasText: "Divergence:" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Buka Contact di HubSpot" }),
    ).toHaveAttribute(
      "href",
      `https://app.hubspot.com/contacts/12345/contact/${marker}`,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
        .violations,
    ).toEqual([]);
    expect(
      (
        await admin.from("integration_runs").insert({
          id: runId,
          integration: "jobs",
          resource: "JOB-HUBSPOT-RECONCILE",
          job_key: "JOB-HUBSPOT-RECONCILE",
          trigger: "manual",
          status: "failed",
          error_summary: "UPSTREAM_UNAVAILABLE",
          correlation_id: randomUUID(),
          started_at: new Date().toISOString(),
        })
      ).error,
    ).toBeNull();
    await page.goto("/integrations/hubspot");
    await expect(page.getByText("failing", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "HubSpot CRM", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Record ID (opsional)").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("From", { exact: true })).toBeFocused();
    const body = JSON.stringify([
      {
        eventId: marker,
        subscriptionId: 10,
        portalId: 12345,
        objectId: 900001,
        occurredAt: Date.now(),
        subscriptionType: "contact.propertyChange",
        propertyName: "lifecyclestage",
        propertyValue: "salesqualifiedlead",
      },
    ]);
    const timestamp = String(Date.now()),
      url = "http://127.0.0.1:3000/api/ingest/hubspot";
    const signature = createHmac(
      "sha256",
      testEnvironment.HUBSPOT_WEBHOOK_SECRET,
    )
      .update("POST" + url)
      .update(body)
      .update(timestamp)
      .digest("base64");
    const headers = {
      "content-type": "application/json",
      "x-hubspot-signature-v3": signature,
      "x-hubspot-request-timestamp": timestamp,
    };
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        page.request.post("/api/ingest/hubspot", { headers, data: body }),
      ),
    );
    for (const r of responses) expect(r.status()).toBe(200);
    const results = await Promise.all(responses.map((r) => r.json()));
    expect(results.reduce((n, r) => n + r.accepted, 0)).toBe(1);
    const correlation = results.find((r) => r.accepted === 1).correlation_id;
    const stored = await admin
      .from("webhook_events")
      .select("id,payload")
      .eq("correlation_id", correlation);
    eventIds.push(...(stored.data ?? []).map((r) => r.id));
    expect(stored.data).toHaveLength(1);
    expect(
      (
        await page.request.post("/api/ingest/hubspot", {
          headers: { ...headers, "x-hubspot-signature-v3": "tampered" },
          data: body,
        })
      ).status(),
    ).toBe(401);
    const rejected = await admin
      .from("webhook_events")
      .select("id,payload")
      .eq("source", "hubspot")
      .eq("signature_valid", false);
    eventIds.push(...(rejected.data ?? []).map((r) => r.id));
    expect(rejected.data?.every((r) => r.payload === null)).toBe(true);
    await page.goto("/today");
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
        .violations,
    ).toEqual([]);
  } finally {
    await admin
      .from("app_settings")
      .update({ value: original.data?.value ?? null })
      .eq("key", "hubspot.mapping");
    // Wait for the isolated after callback before removing its local audit rows.
    await expect
      .poll(async () => {
        const r = await admin
          .from("webhook_events")
          .select("status")
          .in("id", eventIds);
        return r.data?.every(
          (e) => !["received", "processing"].includes(e.status),
        );
      })
      .toBe(true);
    const { execFileSync } = await import("node:child_process");
    const { readFileSync } = await import("node:fs");
    const project = readFileSync("supabase/config.toml", "utf8").match(
      /^project_id = "([^"]+)"/m,
    )![1];
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
        input: `begin; delete from public.integration_runs where id='${runId}' or event_id=any(array[${eventIds.map((id) => `'${id}'::uuid`).join(",")} ]::uuid[]); delete from public.webhook_events where id=any(array[${eventIds.map((id) => `'${id}'::uuid`).join(",")} ]::uuid[]); set local session_replication_role=replica; delete from public.leads where id='${leadId}'; delete from public.contacts where id='${contactId}'; commit;`,
        stdio: ["pipe", "ignore", "pipe"],
      },
    );
  }
});
