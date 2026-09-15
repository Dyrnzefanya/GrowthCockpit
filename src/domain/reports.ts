import { ratio } from "@/domain/metrics/formulas";
import {
  jakartaIsoWeek,
  jakartaWeekBounds,
  shiftDate,
  toJakartaDate,
} from "@/domain/dates";
import type { ReportFacts } from "@/config/report-schema";

export function reportPeriod(week: string, now = new Date()) {
  const match = /^(\d{4})-W(\d{2})$/.exec(week);
  if (!match) throw new Error("INVALID_WEEK");
  const year = Number(match[1]),
    number = Number(match[2]),
    first = jakartaWeekBounds(`${year}-01-04`).start,
    start = shiftDate(first, (number - 1) * 7),
    end = shiftDate(start, 6),
    current = jakartaWeekBounds(toJakartaDate(now));
  if (jakartaIsoWeek(start) !== week || start > current.start)
    throw new Error("INVALID_WEEK");
  return {
    isoWeek: week,
    start,
    end,
    previousStart: shiftDate(start, -7),
    previousEnd: shiftDate(start, -1),
    timezone: "Asia/Jakarta" as const,
    partial: end > toJakartaDate(now),
  };
}

export const metric = (
  current: number | null,
  previous: number | null,
  unit: string,
) => ({
  current,
  previous,
  change:
    current === null || previous === null
      ? null
      : ratio(current - previous, previous),
  unit,
});

const value = (number: number | null, unit: string) =>
  number === null
    ? "not available"
    : `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(number)}${unit === "%" ? "%" : unit ? ` ${unit}` : ""}`;

export function defaultNarrative(facts: ReportFacts) {
  const m = facts.metrics,
    status = facts.period.partial ? "is still in progress" : "is complete",
    comparison =
      m.mql.change === null
        ? "A previous-week MQL comparison is not available."
        : `MQL changed ${(m.mql.change * 100).toFixed(1)}% from the previous week.`,
    priorities = facts.nextActions.length
      ? facts.nextActions
          .slice(0, 5)
          .map((item) => `- ${item.action}`)
          .join("\n")
      : "- Continue monitoring performance and document the next material change.";
  return `## Executive summary

${facts.period.isoWeek} ${status}. Spend was ${value(m.spend.current, m.spend.unit)}, producing ${value(m.leads.current, "leads")} and ${value(m.mql.current, "MQL")}. ${comparison} ${facts.experiments.completed.length} experiment(s) completed and ${facts.issues.length} unresolved issue(s) were captured.

## Why it likely changed — interpretation

The stored facts show the movements below. No causal conclusion is asserted without a matching experiment learning or operator evidence.

## Next week's priorities

${priorities}`;
}

export function markdownReport(facts: ReportFacts, narrative: string) {
  const rows = Object.entries(facts.metrics)
    .filter(
      ([key]) =>
        facts.caveats.revenueAvailable ||
        !["revenue", "roas", "cac"].includes(key),
    )
    .map(
      ([name, item]) =>
        `| ${name.toUpperCase()} | ${value(item.current, item.unit)} | ${value(item.previous, item.unit)} | ${item.change === null ? "—" : `${(item.change * 100).toFixed(1)}%`} |`,
    )
    .join("\n");
  const experiments = facts.experiments.completed.length
    ? facts.experiments.completed
        .map((item) => `- ${item.code} ${item.title}: ${item.learning}`)
        .join("\n")
    : "- No completed experiments in this period.";
  const running = facts.experiments.running.length
    ? facts.experiments.running
        .map(
          (item) => `- ${item.code} ${item.title} — review ${item.reviewDate}`,
        )
        .join("\n")
    : "- No running experiments.";
  const caveats = facts.caveats.items.map((item) => `- ${item}`).join("\n");
  return `# Weekly GrowthCockpit Report — ${facts.period.isoWeek}

${facts.period.start} to ${facts.period.end} · Asia/Jakarta${facts.period.partial ? " · Partial period" : ""}

${narrative}

## Performance

| Metric | Current | Previous | Change |
|---|---:|---:|---:|
${rows}

## What changed — facts

${facts.campaigns.length ? facts.campaigns.map((item) => `- ${item.name}: spend ${value(item.spend, item.currency ?? "")}, MQL ${item.mql}, CPQL ${value(item.cpql, item.currency ?? "")}.`).join("\n") : "No campaign facts are available for this period."}

## Experiments completed

${experiments}

## Experiments running

${running}

## Lead quality and sales follow-up

- MQL rate: ${value(facts.funnel.mqlRate === null ? null : facts.funnel.mqlRate * 100, "%")}
- SQL rate: ${value(facts.funnel.sqlRate === null ? null : facts.funnel.sqlRate * 100, "%")}
- Workflow completion: ${value(facts.workflow.rate === null ? null : facts.workflow.rate * 100, "%")}

## Data-quality caveats

${caveats}
`;
}
