import "server-only";
import { z } from "zod";
import { requireUser } from "@/services/session";
import { readSettings } from "@/repositories/settings";
import { performanceFacts, metaState } from "@/repositories/ad-metrics";
import {
  performanceFactsSchema,
  performanceSummary,
  previousWindow,
  comparison,
  safeNumber,
} from "@/domain/metrics/performance";
import { shiftDate, toJakartaDate } from "@/domain/dates";
import { serverEnv } from "@/lib/env.server";
export async function performanceModel(
  search: Record<string, string | string[] | undefined>,
) {
  await requireUser();
  const yesterday = shiftDate(toJakartaDate(new Date()), -1);
  const from = z.iso.date().catch(shiftDate(yesterday, -29)).parse(search.from),
    to = z.iso.date().catch(yesterday).parse(search.to);
  if (from > to) throw new Error("INVALID_DATE_RANGE");
  const previous = previousWindow(from, to);
  const [{ values }, raw, state] = await Promise.all([
    readSettings(),
    performanceFacts(from, to, previous.from),
    metaState(false),
  ]);
  const facts = performanceFactsSchema.parse(raw),
    current = performanceSummary(
      facts,
      true,
      Date.now(),
      values["meta.freshness_hours"],
    ),
    prior = performanceSummary(
      facts,
      false,
      Date.now(),
      values["meta.freshness_hours"],
    );
  const q = z.string().max(200).catch("").parse(search.q),
    page = z.coerce
      .number()
      .int()
      .min(0)
      .max(100000)
      .catch(0)
      .parse(search.page);
  const sort = z
    .enum([
      "name",
      "spend",
      "leads",
      "mql",
      "cpql",
      "impressions",
      "clicks",
      "ctr",
      "cpc",
      "cpm",
      "mqlRate",
    ])
    .catch("spend")
    .parse(search.sort);
  const direction = search.direction === "asc" ? "asc" : "desc";
  const all = current.rows
    .filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      const x = a[sort],
        y = b[sort];
      if (x === null) return 1;
      if (y === null) return -1;
      return (
        (sort === "name"
          ? String(x).localeCompare(String(y))
          : Number(x) - Number(y)) * (direction === "asc" ? 1 : -1)
      );
    });
  const currency = current.currencies.length === 1 ? current.currencies[0] : "";
  const metrics = [
    ["Spend", safeNumber(current.spend), safeNumber(prior.spend), currency],
    ["Leads · joined", current.joinedLeads, prior.joinedLeads, "inquiry"],
    ["CPL · diagnostic", current.cpl, prior.cpl, currency],
    ["MQL", current.mql, prior.mql, "inquiry"],
    ["CPQL", current.cpql, prior.cpql, currency],
    ["SQL", current.sql, prior.sql, "inquiry"],
    ["CPSQL", current.cpsql, prior.cpsql, currency],
    ["Opportunities", current.opportunities, prior.opportunities, "deal"],
    ["Attributed revenue", current.revenue, prior.revenue, currency],
  ] as const;
  return {
    partial: Boolean(state?.cursor || state?.last_error),
    from,
    to,
    previous,
    current,
    configured: Boolean(
      serverEnv.META_ACCESS_TOKEN && serverEnv.META_AD_ACCOUNT_ID,
    ),
    metrics: metrics.map(([title, value, old, unit]) => ({
      title,
      metric: {
        value,
        unit,
        ...comparison(value, old),
        freshness:
          value === null ? ("unknown" as const) : current.freshness.status,
      },
    })),
    rows: all.slice(page * 20, page * 20 + 20).map((r) => ({
      ...r,
      previous: prior.rows.find((p) => p.key === r.key) ?? null,
    })),
    total: all.length,
    page,
    q,
    sort,
    direction,
    days: facts.days,
    insufficientSample:
      current.mql < values["metrics.min_results_for_verdict"] ||
      Math.max(0, previousWindow(from, to < yesterday ? to : yesterday).days) <
        3 ||
      Boolean(state?.cursor || state?.last_error),
  };
}
