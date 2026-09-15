import { expect, it } from "vitest";
import {
  performanceSummary,
  previousWindow,
  freshness,
  type PerformanceFacts,
  resolveCampaign,
  campaignIndex,
} from "./performance";
import {
  parseCampaignName,
  parseAdName,
  parseAdsetName,
} from "@/domain/attribution/naming";
const synced_at = "2026-09-14T00:00:00Z";
const ad = {
  ad_account_id: "account",
  campaign_id: "1",
  names: ["Gift - Fase1 - Sep"],
  currency: "IDR",
  source_timezone: "Asia/Jakarta",
  current_period: true,
  spend: "1000.10",
  impressions: 10000,
  clicks: 100,
  platform_results: 99,
  synced_at,
};
const lead = {
  platform: "meta",
  campaign_id: "1",
  lt_campaign: "Old campaign name",
  current_period: true,
  leads: 10,
  mql: 4,
  sql: 2,
  synced_at,
};
const facts: PerformanceFacts = {
  ads: [ad, { ...ad, campaign_id: "2", names: ["Unjoined"], spend: "200.00" }],
  leads: [
    lead,
    {
      ...lead,
      platform: "unknown",
      campaign_id: null,
      leads: 3,
      mql: 1,
      sql: 0,
    },
  ],
  days: [],
  deals: [],
};
it("TEST-10.6 hand-calculated reconciliation: spend never duplicates; Meta results differ from inquiries", () => {
  const m = performanceSummary(facts, true, Date.parse(synced_at));
  expect(m.spend).toBe("1200.10");
  expect(m.rows[0].cpql).toBe(250.025);
  expect(m.rows[0].ctr).toBe(0.01);
  expect(m.rows[0].cpm).toBe(100.01);
  expect(m.joinedLeads).toBe(10);
  expect(m.totalLeads).toBe(13);
  expect(m.unattributedLeads).toBe(3);
  expect(m.unjoinedSpend).toBe("200.00");
  expect(m.rows[0].platformResults).toBe(99);
  expect(m.mql).toBe(4);
});
it("TEST-10.3 mixed currency refuses totals without manufacturing FX or missing zeros", () => {
  const m = performanceSummary({
    ...facts,
    ads: [ad, { ...ad, campaign_id: "2", currency: "USD" }],
  });
  expect(m.mixed).toBe(true);
  expect(m.spend).toBeNull();
  expect(m.cpql).toBeNull();
  const empty = performanceSummary({ ads: [], leads: [], deals: [], days: [] });
  expect(empty.spend).toBeNull();
  expect(empty.cpql).toBeNull();
  expect(empty.namingCompliance).toBeNull();
  expect(performanceSummary({ ...facts, ads: [] }).freshness.status).toBe(
    "unknown",
  );
  const zero = performanceSummary({
    ...facts,
    ads: [{ ...ad, spend: "0.00", impressions: 0, clicks: 0 }],
    leads: [],
  });
  expect(zero.spend).toBe("0.00");
  expect(zero.rows[0].cpql).toBeNull();
  expect(zero.rows[0].ctr).toBeNull();
});
it("ID wins over rename; ambiguous names and unknown-platform inquiries never gain attribution", () => {
  const idx = campaignIndex([ad, { ...ad, campaign_id: "2" }]);
  expect(resolveCampaign(idx, "meta", "1", "Renamed")).toBe("account:1");
  expect(resolveCampaign(idx, "meta", null, ad.names[0])).toBeNull();
  expect(resolveCampaign(idx, "unknown", "1", ad.names[0])).toBeNull();
  expect(resolveCampaign(idx, "meta", "missing", ad.names[0])).toBeNull();
});
it("TEST-10.4/7 timezone is not relabeled; previous periods handle leap dates; freshness uses oldest", () => {
  const m = performanceSummary({
    ...facts,
    ads: [{ ...ad, source_timezone: "America/Los_Angeles" }],
  });
  expect(m.cpql).toBeNull();
  expect(m.zones).toEqual(["America/Los_Angeles"]);
  expect(previousWindow("2024-03-01", "2024-03-02")).toEqual({
    days: 2,
    from: "2024-02-28",
    to: "2024-02-29",
  });
  expect(
    freshness(
      [synced_at, "2026-09-15T00:00:00Z"],
      24,
      Date.parse("2026-09-15T00:00:01Z"),
    ).status,
  ).toBe("stale");
  expect(freshness([null], 24, Date.now()).status).toBe("unknown");
});
it("TEST-10.5 valid campaign/adset/ad dimensions; malformed names yield null", () => {
  expect(parseCampaignName("Gift Anyaman - Fase1 - Sep")).toMatchObject({
    phase: 1,
    product: "Gift Anyaman",
  });
  expect(parseAdsetName("T2 - Gifting Korporat")?.topic).toBe("T2");
  expect(parseAdName("T2-PAIN-H3-VID-DEMO")).toEqual({
    topic: "T2",
    angle: "PAIN",
    hook: "H3",
    format: "VID",
    visual: "DEMO",
  });
  for (const value of ["", "Gift - Fase6 - Sep", "arbitrary"])
    expect(parseCampaignName(value)).toBeNull();
  expect(parseAdName("T2-pain-video")).toBeNull();
});
it("preserves won allocation currency and counts each deal only once", () => {
  const d = {
    id: "deal",
    stage_category: "won" as const,
    amount: "500.00",
    currency: "IDR",
    attribution_allocations: [{ campaign: ad.names[0], weight: 1 }],
    platform: "meta",
    campaign_id: "1",
    lt_campaign: ad.names[0],
    current_period: true,
    synced_at,
  };
  const m = performanceSummary({ ...facts, deals: [d] });
  expect(m.revenue).toBe(500);
  expect(m.opportunities).toBe(1);
  expect(
    performanceSummary({
      ...facts,
      deals: [
        {
          ...d,
          amount: "500.01",
          attribution_allocations: [
            { campaign: ad.names[0], weight: 0.5 },
            { campaign: ad.names[0], weight: 0.5 },
          ],
        },
      ],
    }).revenue,
  ).toBe(500.01);
  expect(
    performanceSummary({ ...facts, deals: [{ ...d, currency: "USD" }] })
      .revenue,
  ).toBeNull();
});
