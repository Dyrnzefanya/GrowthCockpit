import "server-only";
import { z } from "zod";
import { requireUser } from "@/services/session";
import { funnelFacts } from "@/repositories/leads";
import { readSettings } from "@/repositories/settings";
import { toJakartaDate, shiftDate } from "@/domain/dates";
import { summarizeFunnel, percent } from "@/domain/metrics/funnel";
export async function funnelModel(
  search: Record<string, string | string[] | undefined>,
) {
  await requireUser();
  const today = toJakartaDate(new Date());
  const from = z.iso.date().catch(shiftDate(today, -29)).parse(search.from),
    to = z.iso.date().catch(today).parse(search.to);
  if (from > to) throw new Error("VALIDATION_FAILED");
  const [{ cohort, activity }, { values }] = await Promise.all([
    funnelFacts(from, to),
    readSettings(),
  ]);
  const maturity = values["metrics.cohort_maturity_days"],
    totals = summarizeFunnel(cohort, today, maturity);
  const groups = new Map<string, typeof cohort>();
  for (const r of cohort) {
    const key = JSON.stringify([r.platform, r.lt_campaign]);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const page = z.coerce
    .number()
    .int()
    .min(0)
    .max(100000)
    .catch(0)
    .parse(search.page);
  const basis = search.basis === "activity" ? "activity" : "cohort";
  return {
    from,
    to,
    today,
    maturity,
    totals,
    activity: activity.slice(page * 20, page * 20 + 20),
    page,
    totalRows: basis === "activity" ? activity.length : groups.size,
    basis,
    smallSample: totals.mql < values["metrics.min_results_for_verdict"],
    campaigns: [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(page * 20, page * 20 + 20)
      .map(([key, rows]) => ({
        key,
        platform: rows[0].platform,
        campaign: rows[0].lt_campaign,
        ...summarizeFunnel(rows, today, maturity),
      })),
    rates: [
      ["MQL rate", percent(totals.mqlRate)],
      ["SQL rate", percent(totals.sqlRate)],
      ["Win rate", percent(totals.winRate)],
      ["Attribution coverage", percent(totals.coverage)],
      ["Outcome completeness", percent(totals.outcomeCompleteness)],
    ],
  };
}
