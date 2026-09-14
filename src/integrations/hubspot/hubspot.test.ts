// @vitest-environment node
import { it, expect, vi, afterEach } from "vitest";
import { createHmac, createHash, randomBytes } from "node:crypto";
import { mappingSchema, recordSchema } from "./mapping";
import {
  mirrorPlan,
  qualificationDivergence,
  type MirrorSnapshot,
} from "@/domain/hubspot";
import { verifyHubspot } from "./signature";
const now = "2026-09-14T03:00:00.000Z",
  old = "2026-09-13T03:00:00.000Z";
export const mapping = mappingSchema.parse({
  portal_id: "12345",
  pipeline_id: "sales",
  lifecycle_map: {
    lead: "new",
    salesqualifiedlead: "sql",
    marketingqualifiedlead: "mql",
  },
  deal_stage_map: { won: "won", lost: "lost", open: "open" },
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
function snapshot(): MirrorSnapshot {
  return {
    companies: [],
    contacts: [
      {
        id: "person",
        hubspot_contact_id: "100",
        email: "person@example.test",
        updated_at: old,
        lifecycle_stage: "lead",
        ft_campaign: "original",
      },
    ],
    leads: [
      {
        id: "inquiry",
        contact_id: "person",
        updated_at: old,
        qualification_status: "disqualified",
        qualification_reason: "OPERATOR_REASON",
        manual_override: true,
        lt_campaign: "last",
        qualified_at: old,
      },
    ],
    deals: [],
  };
}
function contact(
  properties: Record<string, string | null> = {
    lifecyclestage: "salesqualifiedlead",
  },
) {
  return recordSchema.parse({ id: "100", updatedAt: now, properties });
}
afterEach(() => vi.restoreAllMocks());
it("D-014 preserves every manual qualification and audit field while independently mirroring lifecycle", () => {
  const s = snapshot(),
    copy = structuredClone(s),
    plan = mirrorPlan(
      "contacts",
      contact(),
      s,
      mapping,
      "lead_last_touch",
      now,
      now,
    );
  expect(plan.changes).toHaveLength(1);
  expect(plan.changes[0].value.lifecycle_stage).toBe("salesqualifiedlead");
  expect(plan.changes[0].value).not.toHaveProperty("qualification_status");
  expect(plan.events).toEqual([]);
  expect(s).toEqual(copy);
  expect(plan.warnings).toContain("QUALIFICATION_DIVERGENCE:inquiry");
  expect(
    qualificationDivergence(
      s.leads[0],
      { lifecycle_stage: "salesqualifiedlead" },
      mapping,
    ),
  ).toBe(true);
});
it("mapped CRM transitions update only a non-overridden inquiry with source timestamp and history", () => {
  const s = snapshot();
  s.leads[0].manual_override = false;
  const p = mirrorPlan(
    "contacts",
    contact(),
    s,
    mapping,
    "lead_last_touch",
    now,
    old,
  );
  expect(p.events[0]).toMatchObject({
    source: "hubspot",
    changed_at: old,
    to_status: "sql",
    actor: null,
  });
  expect(p.changes[1].value).toMatchObject({
    qualification_status: "sql",
    sql_at: old,
  });
  expect(
    mirrorPlan("contacts", contact(), s, mapping, "lead_last_touch", now)
      .events,
  ).toEqual([]);
});
it("partial records never erase first touch, inquiry attribution, absent identity or manual audit", () => {
  const p = mirrorPlan(
    "contacts",
    contact({ firstname: "Changed" }),
    snapshot(),
    mapping,
    "lead_last_touch",
    now,
  );
  for (const key of [
    "email",
    "ft_campaign",
    "ft_at",
    "qualification_status",
    "manual_override",
  ])
    expect(p.changes[0].value).not.toHaveProperty(key);
});
it("unknown lifecycle is retained raw and named; ambiguous repeated inquiries are not guessed", () => {
  const s = snapshot();
  s.leads.push({ ...s.leads[0], id: "repeat" });
  const p = mirrorPlan(
    "contacts",
    contact({ lifecyclestage: "portal_custom_stage" }),
    s,
    mapping,
    "lead_last_touch",
    now,
    now,
  );
  expect(p.changes[0].value.lifecycle_stage).toBe("portal_custom_stage");
  expect(p.warnings).toContain("UNMAPPED_LIFECYCLE:portal_custom_stage");
  expect(p.events).toEqual([]);
});
it("stable HubSpot identity refuses conflicting email/phone resolution", () => {
  const s = snapshot();
  s.contacts.push({ id: "other", email: "other@example.test" });
  expect(() =>
    mirrorPlan(
      "contacts",
      contact({ email: "other@example.test" }),
      s,
      mapping,
      "lead_last_touch",
      now,
    ),
  ).toThrow("CONFLICT");
});
it("same source revision and older deliveries write nothing", () => {
  const s = snapshot();
  s.contacts[0].source_system = "hubspot";
  s.contacts[0].source_updated_at = now;
  expect(
    mirrorPlan("contacts", contact(), s, mapping, "lead_last_touch", now)
      .changes,
  ).toEqual([]);
  expect(
    mirrorPlan(
      "contacts",
      contact(),
      s,
      mapping,
      "lead_last_touch",
      now,
      now,
      true,
    ).warnings,
  ).toContain("QUALIFICATION_DIVERGENCE:inquiry");
  expect(
    mirrorPlan(
      "contacts",
      { ...contact(), updatedAt: old },
      s,
      mapping,
      "lead_last_touch",
      now,
      old,
      true,
    ).changes,
  ).toEqual([]);
});
it("won deal links explicit inquiry and preserves stamped allocations on later CRM edits", () => {
  const s = snapshot();
  const record = recordSchema.parse({
    id: "200",
    updatedAt: now,
    properties: {
      dealname: "Fixture",
      pipeline: "sales",
      dealstage: "won",
      amount: "1000000.00",
      deal_currency_code: "IDR",
      closedate: now,
      pmos_lead_id: "inquiry",
    },
  });
  const p = mirrorPlan(
    "deals",
    record,
    s,
    mapping,
    "lead_last_touch",
    now,
    now,
  );
  expect(p.events[0]).toMatchObject({
    source: "hubspot",
    from_status: "disqualified",
    to_status: "disqualified",
    changed_at: now,
  });
  expect(p.changes[0].value).toMatchObject({
    lead_id: "inquiry",
    attributed_campaign: "last",
    attribution_rule_version: "a1:lead_last_touch",
    amount: "1000000.00",
    close_date: "2026-09-14",
  });
  s.deals.push({
    ...p.changes[0].value,
    updated_at: old,
    source_updated_at: old,
  });
  expect(
    mirrorPlan("deals", record, s, mapping, "contact_first_touch", now)
      .changes[0].value,
  ).not.toHaveProperty("attribution_rule_version");
});
it("contact fallback links only one inquiry; ambiguous/unlinked and unmapped deals are retained open and flagged", () => {
  const s = snapshot();
  const r = recordSchema.parse({
    id: "200",
    updatedAt: now,
    properties: {
      dealname: "Fixture",
      pipeline: "sales",
      dealstage: "new_stage",
      deal_currency_code: "IDR",
    },
    associations: {
      contacts: { results: [{ id: "100", type: "deal_to_contact" }] },
    },
  });
  expect(
    mirrorPlan("deals", r, s, mapping, "lead_last_touch", now).changes[0].value
      .lead_id,
  ).toBe("inquiry");
  s.leads.push({ ...s.leads[0], id: "repeat" });
  const p = mirrorPlan("deals", r, s, mapping, "lead_last_touch", now);
  expect(p.changes[0].value).toMatchObject({
    lead_id: null,
    stage_key: "new_stage",
    stage_category: "open",
  });
  expect(p.warnings).toContain("UNLINKED_DEAL:200");
  expect(p.warnings).toContain("UNMAPPED_STAGE:new_stage");
});
it("archives retain records; missing required money/stage data fail safely", () => {
  const s = snapshot();
  const p = mirrorPlan(
    "contacts",
    { ...contact(), archived: true },
    s,
    mapping,
    "lead_last_touch",
    now,
  );
  expect(p.changes[0].value.source_system).toBe("hubspot_archived");
  expect(p.events).toEqual([]);
  s.contacts[0].source_system = "hubspot_archived";
  s.contacts[0].source_updated_at = now;
  expect(
    mirrorPlan(
      "contacts",
      { ...contact(), updatedAt: old },
      s,
      mapping,
      "lead_last_touch",
      now,
    ).changes,
  ).toEqual([]);
  expect(() =>
    mirrorPlan(
      "deals",
      recordSchema.parse({
        id: "200",
        updatedAt: now,
        properties: {
          dealname: "Fixture",
          pipeline: "sales",
          dealstage: "won",
        },
      }),
      s,
      mapping,
      "lead_last_touch",
      now,
    ),
  ).toThrow("VALIDATION_FAILED");
});
it("mapping rejects incomplete settings and guessed property names", () => {
  for (const value of [
    null,
    {},
    { ...mapping, portal_id: "" },
    {
      ...mapping,
      properties: { ...mapping.properties, first_touch_source: "guessed" },
    },
  ])
    expect(mappingSchema.safeParse(value).success).toBe(false);
});
it("v3 verifies raw bytes, canonical URL and timestamp; tampering, stale and downgrade fail", () => {
  const secret = randomBytes(32).toString("hex"),
    body = Buffer.from('[{"eventId":1}]'),
    timestamp = String(Date.parse(now)),
    url = "https://example.test/api/ingest/hubspot";
  const signature = createHmac("sha256", secret)
    .update("POST" + url)
    .update(body)
    .update(timestamp)
    .digest("base64");
  const h = new Headers({
    "x-hubspot-signature-v3": signature,
    "x-hubspot-request-timestamp": timestamp,
  });
  expect(verifyHubspot(h, body, url, secret, Date.parse(now))).toBe(true);
  expect(
    verifyHubspot(h, Buffer.from("{}"), url, secret, Date.parse(now)),
  ).toBe(false);
  expect(verifyHubspot(h, body, url, secret, Date.parse(now) + 300001)).toBe(
    false,
  );
  h.set("x-hubspot-signature-version", "v1");
  h.set(
    "x-hubspot-signature",
    createHash("sha256").update(secret).update(body).digest("hex"),
  );
  h.set("x-hubspot-signature-v3", "invalid");
  expect(verifyHubspot(h, body, url, secret, Date.parse(now))).toBe(false);
  h.delete("x-hubspot-signature-v3");
  expect(verifyHubspot(h, body, url, secret, Date.parse(now))).toBe(true);
});
