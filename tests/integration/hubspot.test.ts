import { it, expect, vi } from "vitest";
import { randomUUID, randomBytes } from "node:crypto";
import { testEnvironment } from "../support/environment";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env.server", async () => ({
  serverEnv: {
    ...(await import("../support/environment")).testEnvironment,
    HUBSPOT_PORTAL_ID: "12345",
    HUBSPOT_ACCESS_TOKEN: randomBytes(24).toString("hex"),
  },
}));
import { adminClient } from "@/lib/supabase/server-admin";
import { syncRecord, reconcileHubspot } from "@/services/crm-sync";
import { mappingSchema } from "@/integrations/hubspot/mapping";
import { processNext } from "@/services/integration-runs";
import * as queue from "@/repositories/integrations";
const mapping = mappingSchema.parse({
  portal_id: "12345",
  pipeline_id: "sales",
  lifecycle_map: {
    lead: "new",
    salesqualifiedlead: "sql",
    marketingqualifiedlead: "mql",
  },
  deal_stage_map: { won: "won", open: "open" },
  owner_map: {},
  properties: {
    first_touch_source: "original_utm_source",
    first_touch_medium: "original_utm_medium",
    first_touch_campaign: "original_utm_campaign",
    first_touch_content: "original_utm_content",
    first_touch_term: "original_utm_term",
    first_touch_landing_page: "original_landing_page",
  },
});
it("real local mirror/queue: D-014, transitions, attribution, replay, failure retry, write-once and bounded 1,000-record reconcile", async () => {
  expect(new URL(testEnvironment.NEXT_PUBLIC_SUPABASE_URL).hostname).toMatch(
    /^(127\.0\.0\.1|localhost)$/,
  );
  const db = adminClient(),
    marker = randomUUID(),
    contactId = randomUUID(),
    companyId = randomUUID(),
    leadId = randomUUID(),
    outboundId = randomUUID(),
    now = new Date().toISOString();
  const prior = await db
    .from("app_settings")
    .select("value")
    .eq("key", "hubspot.mapping")
    .single();
  const originalFetch = globalThis.fetch;
  const records = new Map<
    string,
    {
      id: string;
      updatedAt: string;
      archived: boolean;
      properties: Record<string, string | null>;
      associations?: Record<
        string,
        { results: { id: string; type: string }[] }
      >;
      propertiesWithHistory?: Record<
        string,
        { value: string; timestamp: string }[]
      >;
    }
  >();
  records.set("contacts/900001", {
    id: "900001",
    updatedAt: now,
    archived: false,
    properties: {
      email: `${marker}@example.test`,
      lifecyclestage: "salesqualifiedlead",
      pmos_lead_id: leadId,
      original_utm_campaign: "crm-original",
    },
    propertiesWithHistory: {
      lifecyclestage: [{ value: "salesqualifiedlead", timestamp: now }],
    },
  });
  let outage = false;
  let writes = 0;
  let creates = 0;
  const properties = (Object.values(mapping.properties) as string[]).concat([
    "original_click_id",
    "original_click_id_type",
    "lead_product_interest",
    "estimated_quantity",
    "lead_quality_reason",
    "pmos_lead_id",
    "pmos_qualified_at",
    "required_by_date",
  ]);
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.hostname !== "api.hubapi.com") return originalFetch(input, init);
      if (outage)
        return Response.json({ message: "do not expose" }, { status: 503 });
      if (url.pathname === "/account-info/v3/details")
        return Response.json({ portalId: 12345, companyCurrency: "IDR" });
      if (url.pathname.startsWith("/crm/v3/properties/"))
        return Response.json({ results: properties.map((name) => ({ name })) });
      if (
        url.pathname ===
        "/crm/v4/associations/contacts/companies/batch/associate/default"
      )
        return Response.json({ status: "COMPLETE" });
      const match = url.pathname.match(
        /^\/crm\/v3\/objects\/(companies|contacts|deals)(?:\/(.*))?$/,
      );
      if (!match) throw new Error("Unexpected provider call");
      const kind = match[1],
        suffix = match[2],
        body = init?.body ? JSON.parse(String(init.body)) : {};
      if (!suffix && init?.method === "POST") {
        creates++;
        const created = {
          id: kind === "contacts" ? "900003" : "900004",
          updatedAt: now,
          archived: false,
          properties: body.properties,
        };
        records.set(kind + "/" + created.id, created);
        return Response.json(created);
      }
      if (suffix === "search") {
        const all = [...records.entries()]
          .filter(([key]) => key.startsWith(kind + "/"))
          .map(([, v]) => v)
          .filter((v) =>
            (body.filterGroups?.[0]?.filters ?? []).every(
              (f: { operator: string; propertyName: string; value: string }) =>
                f.operator !== "EQ" || v.properties[f.propertyName] === f.value,
            ),
          );
        const after = Number(body.after ?? 0),
          rows = all.slice(after, after + body.limit);
        return Response.json({
          results: rows,
          ...(after + body.limit < all.length
            ? { paging: { next: { after: after + body.limit } } }
            : {}),
        });
      }
      if (suffix === "batch/read")
        return Response.json({
          results: body.inputs.map((v: { id: string }) =>
            records.get(kind + "/" + v.id),
          ),
        });
      const r = records.get(kind + "/" + suffix);
      if (!r) return Response.json({}, { status: 404 });
      if (init?.method === "PATCH") {
        writes++;
        Object.assign(r.properties, body.properties);
      }
      return Response.json(r);
    },
  );
  try {
    expect(
      (
        await db
          .from("app_settings")
          .update({ value: mapping })
          .eq("key", "hubspot.mapping")
      ).error,
    ).toBeNull();
    expect(
      (
        await db.from("contacts").insert({
          id: contactId,
          email: `${marker}@example.test`,
          hubspot_contact_id: "900001",
          ft_campaign: "local-original",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await db.from("leads").insert({
          id: leadId,
          contact_id: contactId,
          inquiry_at: now,
          inquiry_date: new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Jakarta",
          }).format(new Date(now)),
          channel: "manual",
          platform: "unknown",
          qualification_status: "disqualified",
          qualification_reason: "OPERATOR_OVERRIDE",
          qualification_rule_version: "q1",
          qualification_settings: {},
          manual_override: true,
          attribution_missing: false,
          lt_campaign: "campaign-evidence",
          dedupe_key: marker,
          submission_keys: [marker],
          inquiry_observations: [now],
        })
      ).error,
    ).toBeNull();
    const before = (
      await db.from("leads").select("*").eq("id", leadId).single()
    ).data;
    await syncRecord("contacts", records.get("contacts/900001")!);
    expect(
      (await db.from("leads").select("*").eq("id", leadId).single()).data,
    ).toEqual(before);
    expect(
      (
        await db
          .from("contacts")
          .select("lifecycle_stage,ft_campaign")
          .eq("id", contactId)
          .single()
      ).data,
    ).toEqual({
      lifecycle_stage: "salesqualifiedlead",
      ft_campaign: "local-original",
    });
    expect(await syncRecord("contacts", records.get("contacts/900001")!)).toBe(
      0,
    );
    // Reuse the queue for real transient-failure classification, then retry successfully.
    const accepted = await queue.accept({
      id: randomUUID(),
      source: "hubspot",
      signature_valid: true,
      idempotency_key: marker,
      payload: { kind: "contacts", id: "900001" },
      status: "received",
      correlation_id: randomUUID(),
      result: {},
    });
    outage = true;
    await processNext(accepted.event.id, "manual", 5);
    outage = false;
    expect(
      (
        await db
          .from("webhook_events")
          .select("status")
          .eq("id", accepted.event.id)
          .single()
      ).data?.status,
    ).toBe("failed");
    await db
      .from("webhook_events")
      .update({ next_retry_at: new Date().toISOString() })
      .eq("id", accepted.event.id);
    await processNext(accepted.event.id, "manual", 5);
    expect(
      (
        await db
          .from("webhook_events")
          .select("status")
          .eq("id", accepted.event.id)
          .single()
      ).data?.status,
    ).toBe("processed");
    const outbound = await queue.accept({
      id: randomUUID(),
      source: "hubspot_writeback",
      signature_valid: true,
      payload: { leadId },
      status: "received",
      correlation_id: randomUUID(),
      result: {},
    });
    await processNext(outbound.event.id, "manual", 5);
    expect(writes).toBe(0);
    expect(
      records.get("contacts/900001")!.properties.original_utm_campaign,
    ).toBe("crm-original");
    // Explicit deal linkage, source history and a later partial payload use real atomic persistence.
    await syncRecord("deals", {
      id: "900002",
      updatedAt: now,
      archived: false,
      properties: {
        dealname: "Synthetic won evidence",
        pipeline: "sales",
        dealstage: "won",
        amount: "1000000.00",
        deal_currency_code: "IDR",
        closedate: now,
        pmos_lead_id: leadId,
      },
      propertiesWithHistory: { dealstage: [{ value: "won", timestamp: now }] },
    });
    const deal = await db
      .from("deals")
      .select("*")
      .eq("hubspot_deal_id", "900002")
      .single();
    expect(deal.error).toBeNull();
    expect(deal.data).toMatchObject({
      lead_id: leadId,
      attributed_campaign: "campaign-evidence",
      attribution_rule_version: "a1:lead_last_touch",
    });
    expect(
      (
        await db
          .from("lead_stage_events")
          .select("source,from_status,to_status")
          .eq("lead_id", leadId)
      ).data,
    ).toContainEqual({
      source: "hubspot",
      from_status: "disqualified",
      to_status: "disqualified",
    });
    await syncRecord("deals", {
      id: "900002",
      updatedAt: new Date(Date.parse(now) + 1000).toISOString(),
      archived: false,
      properties: { amount: "2000000.00" },
    });
    expect(
      (
        await db
          .from("deals")
          .select("lead_id,attribution_rule_version,attributed_campaign")
          .eq("hubspot_deal_id", "900002")
          .single()
      ).data,
    ).toEqual({
      lead_id: leadId,
      attribution_rule_version: "a1:lead_last_touch",
      attributed_campaign: "campaign-evidence",
    });
    // New local MQL: create once, associate a company without a domain, bind both IDs, no lifecycle write.
    records.clear();
    expect(
      (
        await db.from("companies").insert({
          id: companyId,
          name: "Synthetic outbound",
          name_key: "synthetic outbound",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await db
          .from("contacts")
          .update({ hubspot_contact_id: null, company_id: companyId })
          .eq("id", contactId)
      ).error,
    ).toBeNull();
    expect(
      (
        await db.from("leads").insert({
          ...before!,
          id: outboundId,
          deal_id: null,
          dedupe_key: outboundId,
          submission_keys: [outboundId],
          qualification_status: "mql",
          manual_override: false,
          company_id: companyId,
          qualified_at: now,
        })
      ).error,
    ).toBeNull();
    for (let pass = 0; pass < 2; pass++) {
      const queued = await queue.accept({
        id: randomUUID(),
        source: "hubspot_writeback",
        signature_valid: true,
        payload: { leadId: outboundId },
        status: "received",
        correlation_id: randomUUID(),
        result: {},
      });
      await processNext(queued.event.id, "manual", 5);
      expect(
        (
          await db
            .from("webhook_events")
            .select("status,last_error")
            .eq("id", queued.event.id)
            .single()
        ).data,
      ).toEqual({ status: "processed", last_error: null });
    }
    expect(creates).toBe(2);
    expect(records.get("contacts/900003")!.properties).toMatchObject({
      original_utm_campaign: "local-original",
      pmos_lead_id: outboundId,
      pmos_qualified_at: String(Date.parse(now)),
    });
    expect(records.get("contacts/900003")!.properties).not.toHaveProperty(
      "lifecyclestage",
    );
    expect(
      (
        await db
          .from("companies")
          .select("hubspot_company_id")
          .eq("id", companyId)
          .single()
      ).data?.hubspot_company_id,
    ).toBe("900004");
    expect(
      (
        await db
          .from("contacts")
          .select("hubspot_contact_id")
          .eq("id", contactId)
          .single()
      ).data?.hubspot_contact_id,
    ).toBe("900003");
    // Company records avoid synthetic inquiry creation; measured against real local persistence.
    records.clear();
    for (let i = 0; i < 1000; i++)
      records.set(`companies/${910000 + i}`, {
        id: String(910000 + i),
        updatedAt: now,
        archived: false,
        properties: {
          name: `Synthetic ${marker} ${i}`,
          domain: `${marker}-${i}.example.test`,
        },
      });
    const started = Date.now();
    let total = 0;
    for (let batch = 0; batch < 6 && total < 1000; batch++) {
      const result = await reconcileHubspot(Date.now() + 40000, 500);
      total += result.written;
    }
    expect(total).toBe(1000);
    expect(Date.now() - started).toBeLessThan(30 * 60 * 1000);
    console.log(
      `NFR-8.1 1000 mocked-provider records / real local persistence: ${Date.now() - started}ms`,
    );
    const again = await reconcileHubspot(Date.now() + 40000, 500);
    expect(again.written).toBe(0);
  } finally {
    vi.unstubAllGlobals();
    await db
      .from("app_settings")
      .update({ value: prior.data?.value ?? null })
      .eq("key", "hubspot.mapping");
    // FK/history cleanup is delegated to the existing isolated database harness below.
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
        input: `begin; set local session_replication_role=replica; delete from public.lead_stage_events where lead_id='${leadId}'; delete from public.deals where hubspot_deal_id='900002'; delete from public.leads where id in ('${leadId}','${outboundId}'); delete from public.contacts where id='${contactId}'; delete from public.companies where domain like '${marker}-%' or id='${companyId}'; delete from public.integration_runs where resource in ('hubspot','hubspot_writeback','JOB-HUBSPOT-RECONCILE','HUBSPOT-WRITEBACK'); delete from public.webhook_events where source in ('hubspot','hubspot_writeback'); delete from public.sync_state where integration='hubspot' or resource='HUBSPOT-WRITEBACK'; commit;`,
        stdio: ["pipe", "ignore", "pipe"],
      },
    );
  }
});
