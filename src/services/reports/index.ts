import "server-only";
import { z } from "zod";
import { can } from "@/lib/auth/can";
import { requireUser } from "@/services/session";
import {
  reportFactsSchema,
  reportIdSchema,
  reportNarrativeSchema,
  reportRevisionSchema,
  reportWeekSchema,
} from "@/config/report-schema";
import {
  defaultNarrative,
  markdownReport,
  reportPeriod,
} from "@/domain/reports";
import { jakartaIsoWeek, shiftDate, toJakartaDate } from "@/domain/dates";
import { formatMetric } from "@/domain/metrics/performance";
import * as repository from "@/repositories/reports";
import { assembleWeeklyReport } from "./assemble";
import { safelyRaise } from "@/services/alerts";
import type { Json } from "@/types/database.generated";

export async function reportList(
  search: Record<string, string | string[] | undefined>,
) {
  await requireUser();
  const page = z.coerce
    .number()
    .int()
    .min(0)
    .max(100000)
    .catch(0)
    .parse(search.page);
  return {
    ...(await repository.listReports(page)),
    page,
    currentWeek: jakartaIsoWeek(toJakartaDate(new Date())),
  };
}

export async function reportDetail(id: string) {
  await requireUser();
  const report = await repository.readReport(reportIdSchema.parse(id));
  if (!report) return null;
  return { report, facts: reportFactsSchema.parse(report.facts) };
}

export async function generateWeeklyReport(
  week: string,
  actor?: string,
  now = new Date(),
) {
  const validWeek = reportWeekSchema.parse(week);
  const userId = actor ?? (await repository.firstOwnerId());
  const facts = await assembleWeeklyReport(validWeek, now);
  return repository.createDraft(
    facts.period.start,
    facts.period.end,
    facts as unknown as Json,
    defaultNarrative(facts),
    userId,
  );
}

export async function saveReport(
  id: string,
  revision: string,
  narrative: string,
) {
  await requireUser();
  if (!(await can("report:write"))) throw new Error("FORBIDDEN");
  return repository.saveNarrative(
    reportIdSchema.parse(id),
    reportRevisionSchema.parse(revision),
    reportNarrativeSchema.parse(narrative),
  );
}

export async function finalizeReport(
  id: string,
  revision: string,
  narrative: string,
) {
  const user = await requireUser();
  if (!(await can("report:write"))) throw new Error("FORBIDDEN");
  const report = await repository.finalize(
    reportIdSchema.parse(id),
    reportRevisionSchema.parse(revision),
    reportNarrativeSchema.parse(narrative),
    user.id,
  );
  const facts = reportFactsSchema.parse(report.facts),
    currency = facts.metrics.spend.unit;
  await safelyRaise({
    type: "report_ready",
    source: "reports",
    entityType: "report",
    entityId: report.id,
    keyParts: [report.id, "final"],
    evidence: {
      report_id: report.id,
      iso_week: facts.period.isoWeek,
      headline_spend: `Spend: ${formatMetric(facts.metrics.spend.current, currency)}`,
      headline_mql: `MQL: ${formatMetric(facts.metrics.mql.current)}`,
      headline_cpql: `CPQL: ${formatMetric(facts.metrics.cpql.current, currency)}`,
    },
  });
  return report.id;
}

export async function exportReport(id: string) {
  const detail = await reportDetail(id);
  if (!detail) throw new Error("NOT_FOUND");
  return {
    filename: `growthcockpit-${detail.facts.period.isoWeek}-v${detail.report.version}.md`,
    markdown: markdownReport(detail.facts, detail.report.narrative_md),
  };
}

export async function runWeeklyReport(now = new Date()) {
  const today = toJakartaDate(now),
    week = jakartaIsoWeek(shiftDate(today, -7)),
    period = reportPeriod(week, now),
    id = await generateWeeklyReport(week, undefined, now);
  await safelyRaise({
    type: "report_ready",
    source: "reports",
    entityType: "report",
    entityId: id,
    keyParts: [id, "draft"],
    detectedAt: now.toISOString(),
    evidence: { report_id: id, iso_week: period.isoWeek },
  });
  return { read: 1, written: 1, failed: 0, hasMore: false, cursor: null };
}
