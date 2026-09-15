import { z } from "zod";
import { shiftDate, toJakartaDate } from "@/domain/dates";
import { workdaysSince } from "@/domain/leads/rules";
import {
  cpl,
  cpql,
  mqlRate,
  ctr,
  ratio,
  minorUnits,
  decimal,
} from "@/domain/metrics/formulas";
import { resolveCampaign, safeNumber } from "@/domain/metrics/performance";
import type { Input, Settings } from "@/domain/rules/types";
import type { settingsDefaults } from "@/config/settings-schema";
const count = z.number().int().nonnegative(),
  nullable = z.string().nullable();
export const factsSchema = z.object({
  ads: z.array(
    z.object({
      ad_account_id: z.uuid(),
      campaign_id: z.string(),
      campaign_name: z.string(),
      metric_date: z.iso.date(),
      spend: z.string(),
      impressions: count,
      clicks: count,
      frequency: z.number().nonnegative().nullable(),
      currency: z.string(),
      source_timezone: z.string(),
      ingested_at: z.string(),
    }),
  ),
  identities: z.array(
    z.object({
      ad_account_id: z.uuid(),
      campaign_id: z.string(),
      names: z.array(z.string()),
    }),
  ),
  leads: z.array(
    z.object({
      platform: z.string(),
      campaign_id: nullable,
      lt_campaign: nullable,
      inquiry_date: z.iso.date(),
      leads: count,
      mql: count,
      sql: count,
      last_inquiry: z.string(),
    }),
  ),
  followups: z.array(
    z.object({
      id: z.uuid(),
      qualification_status: z.enum(["mql", "sql"]),
      last_activity: z.string(),
      pipeline_value: nullable,
      pipeline_currency: nullable,
      stage_category: nullable,
    }),
  ),
  experiments: z.array(
    z.object({
      id: z.uuid(),
      code: z.string(),
      status: z.enum(["running", "completed"]),
      review_date: z.iso.date(),
      external_refs: z.record(z.string(), z.unknown()),
    }),
  ),
  outcomes: z.object({ due: count, closed: count }),
  states: z.array(
    z.object({
      integration: z.string(),
      resource: z.string(),
      last_success_at: nullable,
      cursor: nullable,
      last_error: nullable,
    }),
  ),
});
export function ruleSettings(v: typeof settingsDefaults): Settings {
  return {
    targetCpql: v["rules.target_cpql"],
    currency: v["rules.currency"],
    frequency: v["rules.frequency"],
    minResults: v["metrics.min_results_for_verdict"],
    minCoverage: v["health.min_coverage"],
    minOutcome: v["health.min_outcome_completeness"],
    maturityDays: v["metrics.cohort_maturity_days"],
    cplRise: v["rules.cpl_rise"],
    cpqlFall: v["rules.cpql_fall"],
    qualityFall: v["rules.quality_fall"],
    ctrFall: v["rules.ctr_fall"],
  };
}
export function windows(at: Date, maturity: number) {
  const to = shiftDate(toJakartaDate(at), -1),
    from = shiftDate(to, -6),
    previousTo = shiftDate(from, -1),
    previousFrom = shiftDate(from, -14);
  return {
    from,
    to,
    previousFrom,
    previousTo,
    qualityFrom: shiftDate(from, -maturity),
    qualityTo: shiftDate(to, -maturity),
    qualityPreviousFrom: shiftDate(previousFrom, -maturity),
    qualityPreviousTo: shiftDate(previousTo, -maturity),
  };
}
export function decisionInputs(
  raw: unknown,
  values: typeof settingsDefaults,
  at: Date,
): Input[] {
  const facts = factsSchema.parse(raw),
    window = windows(at, values["metrics.cohort_maturity_days"]),
    today = toJakartaDate(at);
  const index = new Map(
    facts.identities.map((i) => [
      `${i.ad_account_id}:${i.campaign_id}`,
      { id: i.campaign_id, names: new Set(i.names) },
    ]),
  );
  const joined = facts.leads.map((l) => ({
    ...l,
    key: resolveCampaign(index, l.platform, l.campaign_id, l.lt_campaign),
  }));
  const within = (date: string, from: string, to: string) =>
    date >= from && date <= to;
  const coverage = (from: string, to: string) => {
    const rows = joined.filter((l) => within(l.inquiry_date, from, to));
    return ratio(
      rows.reduce((n, l) => n + (l.key ? l.leads : 0), 0),
      rows.reduce((n, l) => n + l.leads, 0),
    );
  };
  const meta = facts.states.find(
    (s) => s.integration === "meta" && s.resource === "ingest",
  );
  const crm = ["contacts", "deals"].map((resource) => ({
    name: `CRM ${resource}`,
    at:
      facts.states.find(
        (s) => s.integration === "hubspot" && s.resource === resource,
      )?.last_success_at ?? null,
    slaHours: 0.5,
  }));
  const incompleteCrm = facts.states
    .filter(
      (s) =>
        s.integration === "hubspot" &&
        ["contacts", "deals"].includes(s.resource),
    )
    .flatMap((s) => {
      if (s.last_error) return [`CRM ${s.resource}: sinkronisasi bermasalah`];
      if (!s.cursor) return [];
      try {
        return z
          .object({ complete: z.literal(true) })
          .safeParse(JSON.parse(s.cursor)).success
          ? []
          : [`CRM ${s.resource}: sinkronisasi belum lengkap`];
      } catch {
        return [`CRM ${s.resource}: status sinkronisasi tidak valid`];
      }
    });
  const currencies = [...new Set(facts.ads.map((a) => a.currency))];
  const base: Input = {
    scope: "campaign",
    id: "",
    label: "",
    window,
    today,
    missing: [],
    sources: [
      {
        name: "Meta",
        at: meta?.last_success_at ?? null,
        slaHours: values["meta.freshness_hours"],
      },
      ...crm,
    ],
    coverage: coverage(window.from, window.to),
    currency: null,
    mixedCurrency: currencies.length > 1,
    spend: null,
    recentSpend: null,
    leads: null,
    mql: null,
    sql: null,
    cpl: null,
    cpql: null,
    mqlRate: null,
    priorCpl: null,
    priorCpql: null,
    priorMqlRate: null,
    sample: null,
    completeDays: 0,
    dailyCpql: [],
    leadGen: null,
    noLeadHours: null,
    outcomeCompleteness: ratio(facts.outcomes.closed, facts.outcomes.due),
    frequency: null,
    ctr: null,
    priorCtr: null,
    staleWorkdays: null,
    followUpSla: null,
    reviewDate: null,
    running: false,
    experiments: [],
  };
  const adsByScope = Map.groupBy(
      facts.ads,
      (a) => `${a.ad_account_id}:${a.campaign_id}`,
    ),
    leadsByScope = Map.groupBy(joined, (l) => l.key);
  const inputs: Input[] = [];
  for (const [key, ads] of adsByScope) {
    const identity = index.get(key)!;
    const inquiries = leadsByScope.get(key) ?? [];
    const summarize = (from: string, to: string) => {
      const a = ads.filter((a) => within(a.metric_date, from, to)),
        l = inquiries.filter((l) => within(l.inquiry_date, from, to));
      const spend =
        a.length &&
        new Set(a.map((a) => a.currency)).size === 1 &&
        a.every((a) => a.source_timezone === "Asia/Jakarta")
          ? safeNumber(decimal(a.reduce((n, a) => n + minorUnits(a.spend), 0n)))
          : null;
      const leads = l.reduce((n, l) => n + l.leads, 0),
        mql = l.reduce((n, l) => n + l.mql, 0),
        sql = l.reduce((n, l) => n + l.sql, 0);
      return {
        spend,
        leads,
        mql,
        sql,
        cpl: cpl(spend, leads),
        cpql: cpql(spend, mql),
        mqlRate: mqlRate(mql, leads),
        ctr: ctr(
          a.reduce((n, a) => n + a.clicks, 0),
          a.reduce((n, a) => n + a.impressions, 0),
        ),
        days: new Set(a.map((a) => a.metric_date)).size,
      };
    };
    const current = summarize(window.qualityFrom, window.qualityTo),
      prior = summarize(window.qualityPreviousFrom, window.qualityPreviousTo),
      recent = summarize(window.from, window.to),
      previous = summarize(window.previousFrom, window.previousTo);
    const recentAds = ads
      .filter((a) => within(a.metric_date, window.from, window.to))
      .sort((a, b) => a.metric_date.localeCompare(b.metric_date));
    const lastLead = inquiries
      .filter(
        (l) =>
          within(l.inquiry_date, window.from, today) &&
          Date.parse(l.last_inquiry) <= at.getTime(),
      )
      .map((l) => l.last_inquiry)
      .sort()
      .at(-1);
    const firstSpend = recentAds.find(
      (a) => minorUnits(a.spend) > 0n,
    )?.metric_date;
    const since =
      lastLead ??
      (firstSpend ? `${shiftDate(firstSpend, 1)}T00:00:00+07:00` : null);
    const matureCoverage = coverage(window.qualityFrom, window.qualityTo);
    inputs.push({
      ...base,
      ...current,
      id: key,
      label: [...identity.names].sort().join(" / "),
      currency:
        new Set(ads.map((a) => a.currency)).size === 1 ? ads[0].currency : null,
      missing: [
        ...incompleteCrm,
        ...(meta?.cursor || meta?.last_error
          ? ["Meta ingest belum lengkap"]
          : []),
        ...(!recentAds.length
          ? ["Data Meta jendela terkini tidak tersedia"]
          : []),
        ...(ads.some((a) => a.source_timezone !== "Asia/Jakarta")
          ? ["Timezone akun tidak sejajar dengan cohort WIB"]
          : []),
      ],
      coverage:
        base.coverage === null
          ? null
          : matureCoverage === null
            ? base.coverage
            : Math.min(base.coverage, matureCoverage),
      priorCpl: prior.cpl,
      priorCpql: prior.cpql,
      priorMqlRate: prior.mqlRate,
      sample: current.mql,
      completeDays: current.days,
      dailyCpql: Array.from(
        { length: 7 },
        (_, n) =>
          summarize(
            shiftDate(window.qualityFrom, n),
            shiftDate(window.qualityFrom, n),
          ).cpql,
      ),
      recentSpend: recent.spend,
      leadGen: values["rules.lead_gen_campaigns"].includes(identity.id)
        ? true
        : null,
      noLeadHours: since
        ? Math.max(0, (at.getTime() - Date.parse(since)) / 3600000)
        : null,
      frequency:
        recentAds.at(-1)?.metric_date === window.to
          ? recentAds.at(-1)!.frequency
          : null,
      ctr: recent.ctr,
      priorCtr: previous.ctr,
      experiments: facts.experiments
        .filter(
          (e) =>
            e.external_refs.campaign_id === identity.id ||
            e.external_refs.campaignId === identity.id,
        )
        .map((e) => ({ id: e.id, code: e.code, status: e.status })),
    });
  }
  if (!adsByScope.size)
    inputs.push({
      ...base,
      scope: "integration",
      id: "measurement",
      label: "Pengukuran",
      missing: ["Data kampanye Meta belum tersedia"],
    });
  for (const lead of facts.followups)
    inputs.push({
      ...base,
      scope: "lead",
      id: lead.id,
      label: `${lead.qualification_status.toUpperCase()} · ${lead.id}`,
      pipelineValue:
        lead.stage_category === "open" ? safeNumber(lead.pipeline_value) : null,
      currency: lead.pipeline_currency,
      staleWorkdays: workdaysSince(lead.last_activity, today),
      followUpSla:
        values[
          lead.qualification_status === "mql"
            ? "follow_up.mql_workdays"
            : "follow_up.sql_workdays"
        ],
    });
  for (const e of facts.experiments)
    inputs.push({
      ...base,
      scope: "experiment",
      id: e.id,
      label: e.code,
      reviewDate: e.review_date,
      running: e.status === "running",
    });
  return inputs.sort((a, b) =>
    `${a.scope}:${a.id}`.localeCompare(`${b.scope}:${b.id}`),
  );
}
