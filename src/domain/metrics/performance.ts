import { z } from "zod";
import {
  cpql,
  cpl,
  cpsql,
  cpc,
  cpm,
  ctr,
  mqlRate,
  ratio,
  minorUnits,
  decimal,
} from "./formulas";
import { parseCampaignName } from "@/domain/attribution/naming";
const nullableText = z.string().nullable();
const ad = z.object({
  ad_account_id: z.string(),
  campaign_id: z.string(),
  names: z.array(z.string()),
  currency: z.string(),
  source_timezone: z.string(),
  current_period: z.boolean(),
  spend: z.string(),
  impressions: z.number(),
  clicks: z.number(),
  platform_results: z.number().nullable(),
  synced_at: z.string(),
});
const lead = z.object({
  platform: z.string(),
  campaign_id: nullableText,
  lt_campaign: nullableText,
  current_period: z.boolean(),
  leads: z.number(),
  mql: z.number(),
  sql: z.number(),
  synced_at: z.string(),
});
const deal = z.object({
  id: z.string(),
  stage_category: z.enum(["open", "won", "lost"]),
  amount: nullableText,
  currency: z.string(),
  attribution_allocations: z.array(
    z.object({ campaign: nullableText, weight: z.number() }),
  ),
  platform: z.string(),
  campaign_id: nullableText,
  lt_campaign: nullableText,
  current_period: z.boolean(),
  synced_at: z.string(),
});
export const performanceFactsSchema = z.object({
  ads: z.array(ad),
  leads: z.array(lead),
  deals: z.array(deal),
  days: z.array(
    z.object({
      metric_date: z.string(),
      currency: z.string(),
      source_timezone: z.string(),
      spend: z.string(),
    }),
  ),
});
export type PerformanceFacts = z.infer<typeof performanceFactsSchema>;
type Ad = z.infer<typeof ad>;
function moneySum(values: string[]) {
  return decimal(values.reduce((sum, value) => sum + minorUnits(value), 0n));
}
export function safeNumber(value: string | null) {
  return value === null || minorUnits(value) > BigInt(Number.MAX_SAFE_INTEGER)
    ? null
    : Number(value);
}
export function previousWindow(from: string, to: string) {
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  return {
    days,
    from: new Date(Date.parse(from) - days * 86400000)
      .toISOString()
      .slice(0, 10),
    to: new Date(Date.parse(from) - 86400000).toISOString().slice(0, 10),
  };
}
export function freshness(
  sources: (string | null)[],
  hours: number,
  now: number,
) {
  if (!sources.length || sources.some((value) => value === null))
    return { status: "unknown" as const, ageHours: null, oldest: null };
  const oldest = sources.slice().sort()[0]!;
  const ageHours = Math.max(
    0,
    Math.floor((now - Date.parse(oldest)) / 3600000),
  );
  return {
    status:
      now - Date.parse(oldest) > hours * 3600000
        ? ("stale" as const)
        : ("fresh" as const),
    ageHours,
    oldest,
  };
}
export function campaignIndex(ads: Ad[]) {
  const identities = new Map<string, { id: string; names: Set<string> }>();
  for (const row of ads) {
    const key = `${row.ad_account_id}:${row.campaign_id}`;
    const value = identities.get(key) ?? {
      id: row.campaign_id,
      names: new Set<string>(),
    };
    row.names.forEach((name) => value.names.add(name));
    identities.set(key, value);
  }
  return identities;
}
export function resolveCampaign(
  index: ReturnType<typeof campaignIndex>,
  platform: string,
  id: string | null,
  name: string | null,
) {
  if (platform !== "meta") return null;
  const candidates = [...index].filter(([, row]) =>
    id
      ? row.id === id
      : name !== null && (row.id === name || row.names.has(name)),
  );
  return candidates.length === 1 ? candidates[0][0] : null;
}
export function performanceSummary(
  facts: PerformanceFacts,
  current = true,
  now = Date.now(),
  slaHours = 24,
) {
  const index = campaignIndex(facts.ads),
    ads = facts.ads.filter((a) => a.current_period === current);
  const inquiries = facts.leads.filter((l) => l.current_period === current);
  const currencies = [...new Set(ads.map((a) => a.currency))],
    zones = [...new Set(ads.map((a) => a.source_timezone))];
  const matched = inquiries.map((l) => ({
    ...l,
    key: resolveCampaign(index, l.platform, l.campaign_id, l.lt_campaign),
  }));
  const rows = [...index]
    .filter(([key]) =>
      ads.some((a) => `${a.ad_account_id}:${a.campaign_id}` === key),
    )
    .map(([key, identity]) => {
      const raw = ads.filter(
          (a) => `${a.ad_account_id}:${a.campaign_id}` === key,
        ),
        leads = matched.filter((l) => l.key === key);
      const amounts = [...new Set(raw.map((a) => a.currency))];
      const spend =
        amounts.length === 1 ? moneySum(raw.map((a) => a.spend)) : null;
      const totals = leads.reduce(
        (t, l) => ({
          leads: t.leads + l.leads,
          mql: t.mql + l.mql,
          sql: t.sql + l.sql,
        }),
        { leads: 0, mql: 0, sql: 0 },
      );
      const impressions = raw.reduce((n, a) => n + a.impressions, 0),
        clicks = raw.reduce((n, a) => n + a.clicks, 0);
      const aligned = raw.every((a) => a.source_timezone === "Asia/Jakarta");
      const n = safeNumber(spend);
      return {
        key,
        name: [...identity.names].sort().join(" / "),
        ...totals,
        spend,
        currency: amounts.length === 1 ? amounts[0] : null,
        impressions,
        clicks,
        ctr: ctr(clicks, impressions),
        cpc: cpc(n, clicks),
        cpm: cpm(n, impressions),
        mqlRate: mqlRate(totals.mql, totals.leads),
        cpql: aligned ? cpql(n, totals.mql) : null,
        cpl: aligned ? cpl(n, totals.leads) : null,
        cpsql: aligned ? cpsql(n, totals.sql) : null,
        freshness: freshness(
          raw.map((a) => a.synced_at).concat(leads.map((l) => l.synced_at)),
          slaHours,
          now,
        ),
        platformResults: raw.some((a) => a.platform_results === null)
          ? null
          : raw.reduce((n, a) => n + a.platform_results!, 0),
      };
    });
  const totalLeads = inquiries.reduce((n, l) => n + l.leads, 0),
    joined = matched.filter(
      (l) => l.key !== null && rows.some((r) => r.key === l.key),
    );
  const mql = joined.reduce((n, l) => n + l.mql, 0),
    sql = joined.reduce((n, l) => n + l.sql, 0),
    joinedLeads = joined.reduce((n, l) => n + l.leads, 0);
  const spend =
    ads.length && currencies.length === 1
      ? moneySum(ads.map((a) => a.spend))
      : null;
  const revenueByCurrency = new Map<string, bigint | null>();
  let opportunities = 0,
    unallocatedWon = 0;
  for (const d of facts.deals.filter((d) => d.current_period === current)) {
    if (
      resolveCampaign(index, d.platform, d.campaign_id, d.lt_campaign) &&
      d.stage_category !== "lost"
    )
      opportunities++;
    if (d.stage_category !== "won") continue;
    let credited = false;
    for (const a of d.attribution_allocations) {
      if (!resolveCampaign(index, d.platform, null, a.campaign)) continue;
      credited = true;
      const existing = revenueByCurrency.get(d.currency) ?? 0n;
      const priorMissing =
        revenueByCurrency.has(d.currency) &&
        revenueByCurrency.get(d.currency) === null;
      revenueByCurrency.set(
        d.currency,
        priorMissing || d.amount === null
          ? null
          : existing +
              minorUnits(d.amount) * BigInt(Math.round(a.weight * 100)),
      );
    }
    if (!credited) unallocatedWon++;
  }
  const revenueRows = [...revenueByCurrency].map(([currency, units]) => ({
    currency,
    // Keep fractional minor units through allocation; round once per currency.
    amount: units === null ? null : decimal((units + 50n) / 100n),
  }));
  const mixed =
    currencies.length > 1 ||
    new Set([...currencies, ...revenueRows.map((r) => r.currency)]).size > 1;
  const aligned = zones.length === 1 && zones[0] === "Asia/Jakarta";
  const n = safeNumber(spend);
  const unjoined = rows.filter((r) => r.leads === 0);
  return {
    rows,
    totalLeads,
    joinedLeads,
    mql,
    sql,
    opportunities,
    spend,
    currencies,
    zones,
    mixed,
    aligned,
    cpl: aligned ? cpl(n, joinedLeads) : null,
    cpql: aligned ? cpql(n, mql) : null,
    cpsql: aligned ? cpsql(n, sql) : null,
    coverage: ratio(joinedLeads, totalLeads),
    unattributedLeads: totalLeads - joinedLeads,
    unjoinedSpend:
      currencies.length === 1 ? moneySum(unjoined.map((r) => r.spend!)) : null,
    unallocatedWon,
    revenueRows,
    revenue:
      !mixed && revenueRows.length === 1
        ? safeNumber(revenueRows[0].amount)
        : null,
    freshness: !ads.length
      ? freshness([], slaHours, now)
      : freshness(
          ads
            .map((a) => a.synced_at)
            .concat(
              joined.map((l) => l.synced_at),
              facts.deals
                .filter((d) => d.current_period === current)
                .map((d) => d.synced_at),
            ),
          slaHours,
          now,
        ),
    namingCompliance: ratio(
      [...index.values()].filter((v) =>
        [...v.names].every((n) => parseCampaignName(n) !== null),
      ).length,
      index.size,
    ),
  };
}
export function formatMetric(
  value: number | string | null,
  currency?: string | null,
) {
  if (value === null) return "—";
  if (typeof value === "string" && /^\d+(\.\d{1,2})?$/.test(value)) {
    const units = minorUnits(value);
    const formatter = new Intl.NumberFormat(
      "id-ID",
      currency
        ? {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    );
    return formatter
      .formatToParts(units / 100n)
      .map((p) =>
        p.type === "fraction"
          ? (units % 100n).toString().padStart(2, "0")
          : p.value,
      )
      .join("");
  }
  return new Intl.NumberFormat(
    "id-ID",
    currency
      ? { style: "currency", currency, maximumFractionDigits: 2 }
      : { maximumFractionDigits: 2 },
  ).format(Number(value));
}
export function comparison(current: number | null, previous: number | null) {
  const change =
    current === null || previous === null
      ? null
      : ratio(current - previous, previous);
  return {
    comparison:
      change === null
        ? "Perbandingan tidak tersedia"
        : `${change >= 0 ? "+" : ""}${(change * 100).toFixed(1)}% vs periode sebelumnya`,
    direction:
      change === null
        ? ("unknown" as const)
        : change === 0
          ? ("flat" as const)
          : change > 0
            ? ("up" as const)
            : ("down" as const),
    isGood: null,
  };
}
