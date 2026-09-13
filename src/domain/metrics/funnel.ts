import {
  mqlRate,
  sqlRate,
  winRate,
  attributionCoverage,
  outcomeCompleteness,
  ratio,
  revenue,
} from "./formulas";
import { shiftDate } from "@/domain/dates";
export type CohortFact = {
  inquiry_date: string | null;
  platform: string | null;
  lt_campaign: string | null;
  currency: string | null;
  leads: number | null;
  mql: number | null;
  sql: number | null;
  disqualified: number | null;
  attributed: number | null;
  deals: number | null;
  won: number | null;
  lost: number | null;
  revenue: string | null;
  missing_revenue: number | null;
  past_expected_close: number | null;
  past_expected_closed: number | null;
};
export function summarizeFunnel(
  rows: CohortFact[],
  today: string,
  maturityDays: number,
) {
  const total = {
    leads: 0,
    mql: 0,
    sql: 0,
    deals: 0,
    won: 0,
    lost: 0,
    attributed: 0,
    disqualified: 0,
    pastExpected: 0,
    closedPastExpected: 0,
  };
  for (const r of rows) {
    for (const key of [
      "leads",
      "mql",
      "sql",
      "deals",
      "won",
      "lost",
      "attributed",
      "disqualified",
    ] as const)
      total[key] += r[key] ?? 0;
    total.pastExpected += r.past_expected_close ?? 0;
    total.closedPastExpected += r.past_expected_closed ?? 0;
  }
  const stages = [
    { label: "Inquiry", count: total.leads },
    { label: "MQL (termasuk SQL)", count: total.mql },
    { label: "SQL", count: total.sql },
    { label: "Deal", count: total.deals },
    { label: "Won", count: total.won },
  ].map((s) => ({ ...s, width: (ratio(s.count, total.leads) ?? 0) * 100 }));
  return {
    ...total,
    stages,
    mqlRate: mqlRate(total.mql, total.leads),
    sqlRate: sqlRate(total.sql, total.mql),
    winRate: winRate(total.won, total.lost),
    coverage: attributionCoverage(total.attributed, total.leads),
    outcomeCompleteness: outcomeCompleteness(
      total.closedPastExpected,
      total.pastExpected,
    ),
    revenue: revenue(
      rows
        .filter((r) => r.currency !== null && (r.won ?? 0) > 0)
        .map((r) => ({
          amount: r.missing_revenue ? null : r.revenue,
          currency: r.currency!,
        })),
    ),
    immature: rows.some(
      (r) => r.inquiry_date! > shiftDate(today, -maturityDays),
    ),
  };
}
export function percent(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("id-ID", {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);
}
