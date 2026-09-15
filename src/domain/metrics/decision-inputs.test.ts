import { expect, it } from "vitest";
import { decisionInputs, windows, ruleSettings } from "./decision-inputs";
import { settingsDefaults } from "@/config/settings-schema";
import { evaluate } from "@/domain/rules";
const at = new Date("2026-09-15T00:00:00Z"),
  id = "11111111-1111-4111-8111-111111111111";
const ads = Array.from({ length: 35 }, (_, n) => ({
  ad_account_id: id,
  campaign_id: "123",
  campaign_name: "Fixture",
  metric_date: new Date(Date.UTC(2026, 7, 11 + n)).toISOString().slice(0, 10),
  spend: "100.00",
  impressions: 100,
  clicks: 10,
  frequency: 2,
  currency: "IDR",
  source_timezone: "Asia/Jakarta",
  ingested_at: at.toISOString(),
}));
const raw = {
  ads,
  identities: [{ ad_account_id: id, campaign_id: "123", names: ["Fixture"] }],
  leads: ads.map((a) => ({
    platform: "meta",
    campaign_id: null,
    lt_campaign: "Fixture",
    inquiry_date: a.metric_date,
    leads: 10,
    mql: 5,
    sql: 1,
    last_inquiry: `${a.metric_date}T01:00:00Z`,
  })),
  followups: [],
  experiments: [
    {
      id,
      code: "EXP-2026-001",
      status: "running",
      review_date: "2026-09-15",
      external_refs: { campaign_id: "123" },
    },
  ],
  outcomes: { due: 10, closed: 6 },
  states: [
    {
      integration: "meta",
      resource: "ingest",
      last_success_at: at.toISOString(),
      cursor: null,
      last_error: null,
    },
    {
      integration: "hubspot",
      resource: "contacts",
      last_success_at: at.toISOString(),
      cursor: null,
      last_error: null,
    },
    {
      integration: "hubspot",
      resource: "deals",
      last_success_at: at.toISOString(),
      cursor: null,
      last_error: null,
    },
  ],
};
it("uses mature cohorts, shared formula and name attribution, links experiments and leaves A11 null", () => {
  const input = decisionInputs(raw, settingsDefaults, at)[0];
  expect(input.cpql).toBe(20);
  expect(input.mql).toBe(35);
  expect(input.spend).toBe(700);
  expect(input.dailyCpql).toEqual([20, 20, 20, 20, 20, 20, 20]);
  expect(input.experiments).toHaveLength(1);
  expect(input.coverage).toBe(1);
  expect(input.outcomeCompleteness).toBe(0.6);
  expect(ruleSettings(settingsDefaults).targetCpql).toBeNull();
  expect(windows(at, 14).qualityTo).toBe("2026-08-31");
  const evaluation = evaluate(
    input,
    ruleSettings(settingsDefaults),
    at.getTime(),
  );
  expect(evaluation.find((r) => r.rule === "R-00")?.verdict).toBe("MONITOR");
  expect(evaluation.find((r) => r.rule === "R-02")?.condition).toContain(
    "belum dikonfigurasi",
  );
});
it("unknown platform and ambiguous campaign names never become conversions", () => {
  expect(
    decisionInputs(
      { ...raw, leads: raw.leads.map((l) => ({ ...l, platform: "unknown" })) },
      settingsDefaults,
      at,
    )[0].mql,
  ).toBe(0);
  expect(
    decisionInputs(
      {
        ...raw,
        identities: [
          ...raw.identities,
          { ad_account_id: id, campaign_id: "456", names: ["Fixture"] },
        ],
      },
      settingsDefaults,
      at,
    )[0].coverage,
  ).toBe(0);
});
it("unavailable inputs expose integration suppression, malformed external facts fail validation", () => {
  const empty = decisionInputs(
    { ...raw, ads: [], identities: [], leads: [] },
    settingsDefaults,
    at,
  );
  expect(empty.find((i) => i.scope === "integration")?.missing).toContain(
    "Data kampanye Meta belum tersedia",
  );
  expect(() =>
    decisionInputs(
      { ...raw, outcomes: { due: -1, closed: 0 } },
      settingsDefaults,
      at,
    ),
  ).toThrow();
});
it("an unrelated successful CRM configuration check cannot hide a missing contributing mirror", () => {
  const input = decisionInputs(
    {
      ...raw,
      states: [
        ...raw.states.filter((s) => s.integration !== "hubspot"),
        {
          integration: "hubspot",
          resource: "configuration",
          last_success_at: at.toISOString(),
          cursor: null,
          last_error: null,
        },
      ],
    },
    settingsDefaults,
    at,
  )[0];
  expect(input.sources.find((s) => s.name === "CRM contacts")?.at).toBeNull();
  expect(input.sources.find((s) => s.name === "CRM deals")?.at).toBeNull();
});
it("today's inquiry prevents a false >24-hour tracking diagnosis without entering the complete-day cohort", () => {
  const input = decisionInputs(
    {
      ...raw,
      leads: [
        ...raw.leads,
        {
          ...raw.leads[0],
          inquiry_date: "2026-09-15",
          last_inquiry: "2026-09-14T23:00:00Z",
        },
      ],
    },
    { ...settingsDefaults, "rules.lead_gen_campaigns": ["123"] },
    at,
  )[0];
  expect(input.noLeadHours).toBe(1);
  expect(input.mql).toBe(35);
  expect(
    evaluate(input, ruleSettings(settingsDefaults), at.getTime()).find(
      (r) => r.rule === "R-06",
    )?.matched,
  ).toBe(false);
});
it("a partially reconciled CRM suppresses campaign verdicts even with a recent success timestamp", () => {
  const input = decisionInputs(
    {
      ...raw,
      states: raw.states.map((s) =>
        s.resource === "contacts"
          ? { ...s, cursor: JSON.stringify({ complete: false }) }
          : s,
      ),
    },
    settingsDefaults,
    at,
  )[0];
  expect(
    evaluate(input, ruleSettings(settingsDefaults), at.getTime())[0].condition,
  ).toContain("sinkronisasi belum lengkap");
});
