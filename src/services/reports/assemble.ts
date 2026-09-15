import "server-only";
import { reportFactsSchema, type ReportFacts } from "@/config/report-schema";
import { reportPeriod, metric } from "@/domain/reports";
import {
  performanceFactsSchema,
  performanceSummary,
  safeNumber,
} from "@/domain/metrics/performance";
import { summarizeFunnel } from "@/domain/metrics/funnel";
import { ratio } from "@/domain/metrics/formulas";
import { revenueAllowed } from "@/domain/rules/r09";
import { reportInputs } from "@/repositories/reports";
import { machineSettings } from "@/repositories/integrations";
import type { settingsSchema } from "@/config/settings-schema";
import type { z } from "zod";

export async function assembleWeeklyReport(week: string, now = new Date()) {
  const period = reportPeriod(week, now);
  const [raw, { values }] = await Promise.all([
    reportInputs(period.start, period.end, period.previousStart),
    machineSettings(),
  ]);
  return assembleReport(raw, values, period, now);
}

export function assembleReport(
  raw: Awaited<ReturnType<typeof reportInputs>>,
  values: z.infer<typeof settingsSchema>,
  period: ReturnType<typeof reportPeriod>,
  now: Date,
) {
  const facts = performanceFactsSchema.parse(raw.performance),
    current = performanceSummary(
      facts,
      true,
      now.getTime(),
      values["meta.freshness_hours"],
    ),
    previous = performanceSummary(
      facts,
      false,
      now.getTime(),
      values["meta.freshness_hours"],
    ),
    currentFunnel = summarizeFunnel(
      raw.cohort.filter((row) => row.inquiry_date! >= period.start),
      period.end,
      values["metrics.cohort_maturity_days"],
    ),
    outcome = currentFunnel.outcomeCompleteness,
    includeRevenue = revenueAllowed(
      outcome,
      values["health.min_outcome_completeness"],
    ),
    currency = current.currencies.length === 1 ? current.currencies[0] : "";

  const required = raw.workflows
      .flatMap((run) => run.workflow_items)
      .filter((item) => item.required_snapshot),
    staleSources = raw.states.flatMap((state) =>
      state.last_error || state.cursor
        ? [`${state.integration}/${state.resource}`]
        : [],
    );
  if (current.freshness.status !== "fresh")
    staleSources.push("meta/performance");
  const caveats = [
    `Attribution coverage: ${current.coverage === null ? "not available" : `${(current.coverage * 100).toFixed(1)}%`} (minimum ${(values["health.min_coverage"] * 100).toFixed(1)}%).`,
    `Outcome completeness: ${outcome === null ? "not available" : `${(outcome * 100).toFixed(1)}%`} (minimum ${(values["health.min_outcome_completeness"] * 100).toFixed(1)}%).`,
    staleSources.length
      ? `Stale or incomplete sources: ${[...new Set(staleSources)].join(", ")}.`
      : "No stale or incomplete source was observed at generation time.",
    includeRevenue
      ? "Revenue, ROAS and CAC passed the R-09 outcome-completeness gate."
      : "Revenue, ROAS and CAC are withheld because the R-09 outcome-completeness gate did not pass.",
  ];
  if (period.partial) caveats.push("This is the current, incomplete ISO week.");

  const report: ReportFacts = {
    schemaVersion: "weekly-v1",
    period,
    context: {
      basis: "cohort",
      scope: "all joined campaigns",
      oldestSourceAt: current.freshness.oldest,
      freshness: current.freshness.status,
    },
    metrics: {
      spend: metric(
        safeNumber(current.spend),
        safeNumber(previous.spend),
        currency,
      ),
      leads: metric(current.joinedLeads, previous.joinedLeads, "leads"),
      cpl: metric(current.cpl, previous.cpl, currency),
      mql: metric(current.mql, previous.mql, "MQL"),
      cpql: metric(current.cpql, previous.cpql, currency),
      sql: metric(current.sql, previous.sql, "SQL"),
      cpsql: metric(current.cpsql, previous.cpsql, currency),
      opportunities: metric(
        current.opportunities,
        previous.opportunities,
        "deals",
      ),
      revenue: metric(
        includeRevenue ? current.revenue : null,
        includeRevenue ? previous.revenue : null,
        currency,
      ),
      roas: metric(
        includeRevenue ? current.roas : null,
        includeRevenue ? previous.roas : null,
        "x",
      ),
      cac: metric(
        includeRevenue ? current.cac : null,
        includeRevenue ? previous.cac : null,
        currency,
      ),
    },
    funnel: {
      mqlRate: currentFunnel.mqlRate,
      sqlRate: currentFunnel.sqlRate,
      winRate: currentFunnel.winRate,
      leads: currentFunnel.leads,
      disqualified: currentFunnel.disqualified,
      won: currentFunnel.won,
    },
    campaigns: current.rows
      .map((row) => {
        const prior = previous.rows.find((item) => item.key === row.key);
        return {
          id: row.key,
          name: row.name,
          currency: row.currency,
          spend: safeNumber(row.spend),
          leads: row.leads,
          mql: row.mql,
          cpql: row.cpql,
          previousSpend: prior ? safeNumber(prior.spend) : null,
          previousMql: prior?.mql ?? null,
          previousCpql: prior?.cpql ?? null,
        };
      })
      .sort(
        (left, right) =>
          (right.spend ?? 0) - (left.spend ?? 0) ||
          left.id.localeCompare(right.id),
      ),
    experiments: {
      completed: raw.experiments.flatMap((item) => {
        const result = item.experiment_results;
        return item.status === "completed" &&
          item.end_date &&
          item.end_date >= period.start &&
          item.end_date <= period.end &&
          result
          ? [
              {
                code: item.code,
                title: item.title,
                outcome: result.outcome,
                learning: result.learning,
                nextAction: result.next_action,
              },
            ]
          : [];
      }),
      running: raw.experiments.flatMap((item) =>
        item.status === "running"
          ? [
              {
                code: item.code,
                title: item.title,
                reviewDate: item.review_date,
              },
            ]
          : [],
      ),
    },
    workflow: {
      completed: required.filter((item) => item.is_done).length,
      required: required.length,
      rate: ratio(
        required.filter((item) => item.is_done).length,
        required.length,
      ),
      runs: raw.workflows.length,
    },
    notes: raw.notes.map((note) => ({ date: note.note_date, body: note.body })),
    issues: raw.alerts
      .filter(
        (item) => item.source !== "decisions" && item.source !== "reports",
      )
      .map((item) => ({
        severity: item.severity,
        title: item.title,
        message: item.message,
      })),
    nextActions: raw.alerts
      .filter((item) => item.source === "decisions")
      .slice(0, 5)
      .map((item) => ({
        title: item.title,
        action:
          item.evidence &&
          typeof item.evidence === "object" &&
          !Array.isArray(item.evidence) &&
          typeof item.evidence.action === "string"
            ? item.evidence.action
            : item.message,
      })),
    caveats: {
      attributionCoverage: current.coverage,
      minimumCoverage: values["health.min_coverage"],
      outcomeCompleteness: outcome,
      minimumOutcomeCompleteness: values["health.min_outcome_completeness"],
      staleSources: [...new Set(staleSources)].sort(),
      revenueAvailable: includeRevenue,
      revenueReason: caveats[3],
      items: caveats,
    },
  };
  return reportFactsSchema.parse(report);
}
