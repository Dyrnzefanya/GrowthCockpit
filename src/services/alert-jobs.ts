import "server-only";
import { z } from "zod";
import { workdaysSince } from "@/domain/leads/rules";
import { toJakartaDate } from "@/domain/dates";
import {
  alertDefinitions,
  deliveryFailure,
  planDispatch,
  scheduledJobOverdue,
  weekdayJobOverdue,
  type AlertType,
  type DispatchAlert,
} from "@/domain/alerts/policy";
import { alertKey } from "@/domain/alerts/keys";
import { errorCode } from "@/domain/integrations";
import { jobs } from "@/services/jobs/registry";
import {
  raiseAlerts,
  safelyRaise,
  type AlertCandidate,
} from "@/services/alerts";
import * as repository from "@/repositories/alerts";
import { machineSettings } from "@/repositories/integrations";
import { sendSlack } from "@/integrations/slack/client";
import { serverEnv } from "@/lib/env.server";

const staleCursor = z.object({
  after: z.uuid().nullable(),
  startedAt: z.iso.datetime({ offset: true }),
});

export async function runStaleLeads(
  _deadline: number,
  max: number,
  now = new Date(),
) {
  const previous = await repository.jobState("JOB-STALE-LEADS");
  let cursor: z.infer<typeof staleCursor>;
  try {
    cursor = staleCursor.parse(JSON.parse(previous ?? "null"));
  } catch {
    cursor = { after: null, startedAt: now.toISOString() };
  }
  const [{ values }, rows] = await Promise.all([
    machineSettings(),
    repository.staleLeadPage(cursor.after, max + 1),
  ]);
  const page = rows.slice(0, max);
  const candidates = page.flatMap((lead): AlertCandidate[] => {
    const limit =
      lead.qualification_status === "mql"
        ? values["follow_up.mql_workdays"]
        : values["follow_up.sql_workdays"];
    return workdaysSince(lead.lastActivityAt, toJakartaDate(now)) > limit
      ? [
          {
            type: "stale_lead",
            source: "lead",
            entityType: "lead",
            entityId: lead.id,
            keyParts: [lead.id],
            detectedAt: cursor.startedAt,
            evidence: {
              lead_id: lead.id,
              qualification_status: lead.qualification_status,
              reason_code: "FOLLOW_UP_SLA_EXCEEDED",
            },
          },
        ]
      : [];
  });
  await raiseAlerts(candidates);
  const hasMore = rows.length > max;
  if (!hasMore)
    await repository.resolveMissing(
      ["stale_lead"],
      candidates.map((candidate) =>
        alertKey(candidate.type, ...candidate.keyParts),
      ),
      cursor.startedAt,
    );
  return {
    read: page.length,
    written: candidates.length,
    failed: 0,
    hasMore,
    cursor: hasMore
      ? JSON.stringify({
          after: page.at(-1)?.id ?? cursor.after,
          startedAt: cursor.startedAt,
        })
      : null,
  };
}

const conditionTypes: AlertType[] = [
  "unmapped_stage",
  "integration_failure",
  "dead_letter",
  "job_failure_streak",
  "attribution_coverage_low",
  "scheduler_overdue",
];

export async function runDataHealth(
  _deadline: number,
  max: number,
  now = new Date(),
) {
  const observedAt = now.toISOString();
  const [facts, settings, currentFailures] = await Promise.all([
    repository.healthFacts(max),
    machineSettings(),
    repository.unresolved(["integration_failure"]),
  ]);
  const candidates: AlertCandidate[] = [];
  for (const event of facts.events)
    candidates.push({
      type: "dead_letter",
      source: event.source,
      entityType: "webhook_event",
      entityId: event.id,
      keyParts: [event.id],
      detectedAt: observedAt,
      evidence: {
        event_id: event.id,
        integration: event.source,
        reason_code: event.last_error,
      },
    });
  const activeFailureKeys = new Set(
    currentFailures.map((row) => row.alert_key),
  );
  for (const state of facts.states) {
    const failureKey = alertKey(
      "integration_failure",
      state.integration,
      state.resource,
    );
    if (state.integration === "jobs" && state.consecutive_failures >= 3)
      candidates.push({
        type: "job_failure_streak",
        source: "jobs",
        entityType: "job",
        entityId: null,
        keyParts: [state.resource],
        detectedAt: observedAt,
        evidence: { job_key: state.resource, reason_code: state.last_error },
      });
    else if (state.integration !== "jobs" && state.consecutive_failures >= 3)
      candidates.push({
        type: "integration_failure",
        source: state.integration,
        entityType: "integration",
        entityId: null,
        keyParts: [state.integration, state.resource],
        detectedAt: observedAt,
        evidence: {
          integration: state.integration,
          resource: state.resource,
          reason_code: state.last_error,
        },
      });
    else if (
      state.integration !== "jobs" &&
      state.consecutive_failures === 0 &&
      state.last_success_at &&
      activeFailureKeys.has(failureKey)
    )
      candidates.push({
        type: "integration_recovered",
        source: state.integration,
        entityType: "integration",
        entityId: null,
        keyParts: [state.integration, state.resource, state.last_success_at],
        detectedAt: observedAt,
        evidence: { integration: state.integration, resource: state.resource },
      });
    if (state.resource.endsWith(":issues") && state.last_error)
      for (const reason of safeReasonCodes(state.last_error))
        if (/^UNMAPPED_(STAGE|LIFECYCLE|PIPELINE):/.test(reason))
          candidates.push({
            type: "unmapped_stage",
            source: state.integration,
            entityType: "integration",
            entityId: null,
            keyParts: [state.integration, state.resource, reason],
            detectedAt: observedAt,
            evidence: {
              integration: state.integration,
              resource: state.resource,
              reason_code: reason,
            },
          });
  }
  for (const row of facts.coverage) {
    if (!row.inquiry_date || !row.leads || row.attributed === null) continue;
    const coverage = row.attributed / row.leads;
    if (coverage < settings.values["health.min_coverage"])
      candidates.push({
        type: "attribution_coverage_low",
        source: "lead",
        entityType: "business_date",
        entityId: null,
        keyParts: [row.inquiry_date],
        detectedAt: observedAt,
        evidence: {
          business_date: row.inquiry_date,
          coverage: Number(coverage.toFixed(4)),
          threshold: settings.values["health.min_coverage"],
        },
      });
  }
  const latestRuns = new Map<string, string>();
  for (const run of facts.runs)
    if (run.job_key && !latestRuns.has(run.job_key))
      latestRuns.set(run.job_key, run.started_at);
  if (serverEnv.JOBS_ENABLED === "true")
    for (const job of jobs) {
      if (
        job.key === "JOB-HUBSPOT-RECONCILE" &&
        !serverEnv.HUBSPOT_ACCESS_TOKEN
      )
        continue;
      const overdue =
        job.cadenceMinutes === null
          ? weekdayJobOverdue(latestRuns.get(job.key) ?? null, now)
          : scheduledJobOverdue(
              latestRuns.get(job.key) ?? null,
              now,
              job.cadenceMinutes,
            );
      if (overdue)
        candidates.push({
          type: "scheduler_overdue",
          source: "jobs",
          entityType: "job",
          entityId: null,
          keyParts: [job.key],
          detectedAt: observedAt,
          evidence: { job_key: job.key, reason_code: "SCHEDULE_OVERDUE" },
        });
    }
  await raiseAlerts(candidates);
  const conditionCandidates = candidates.filter((candidate) =>
    conditionTypes.includes(candidate.type),
  );
  const resolved = await repository.resolveMissing(
    conditionTypes,
    conditionCandidates.map((candidate) =>
      alertKey(candidate.type, ...candidate.keyParts),
    ),
    observedAt,
  );
  return {
    read:
      facts.events.length +
      facts.states.length +
      facts.coverage.length +
      jobs.length,
    written: candidates.length + resolved,
    failed: 0,
    hasMore: false,
    cursor: null,
  };
}

function safeReasonCodes(value: string) {
  try {
    const parsed = z.array(z.string().max(200)).parse(JSON.parse(value));
    return parsed;
  } catch {
    return [value.slice(0, 200)];
  }
}

export async function dispatchNotifications(
  deadline: number,
  max: number,
  maxAttempts: number,
  now = new Date(),
) {
  await repository.reactivate(now.toISOString());
  const rows = await repository.pending(max, now.toISOString(), maxAttempts);
  const valid = rows.flatMap((row): DispatchAlert[] => {
    const type = z
      .enum(Object.keys(alertDefinitions) as [AlertType, ...AlertType[]])
      .safeParse(row.type);
    const severity = z
      .enum(["info", "warning", "critical"])
      .safeParse(row.severity);
    return type.success && severity.success
      ? [
          {
            id: row.id,
            alertKey: row.alert_key,
            type: type.data,
            severity: severity.data,
            entityType: row.entity_type,
            entityId: row.entity_id,
            firstSeenAt: row.first_seen_at,
            attempts: row.notification_attempts,
            evidence:
              row.evidence &&
              typeof row.evidence === "object" &&
              !Array.isArray(row.evidence)
                ? row.evidence
                : {},
          },
        ]
      : [];
  });
  const notified = await repository.notifiedForKeys(
    valid.map((row) => row.alertKey),
  );
  const businessDate = toJakartaDate(now);
  const sentToday = new Set(
    notified
      .filter(
        (row) =>
          row.last_notified_at &&
          toJakartaDate(row.last_notified_at) === businessDate,
      )
      .map((row) => row.alert_key),
  );
  const plan = planDispatch(valid, sentToday, now);
  const deferredGroups = Map.groupBy(
    plan.deferred,
    (item) => `${item.until}|${item.reason}`,
  );
  for (const items of deferredGroups.values())
    await repository.recordDelivery(
      items.flatMap((item) => item.ids),
      "deferred",
      items[0].reason,
      items[0].until,
      maxAttempts,
    );
  let written = 0,
    failed = 0;
  for (const group of plan.deliveries) {
    if (Date.now() + 4000 >= deadline) break;
    const first = group.alerts[0];
    try {
      await sendSlack({
        type: first.type,
        severity: first.severity,
        entityType: first.entityType,
        entityIds: group.alerts
          .flatMap((alert) => (alert.entityId ? [alert.entityId] : []))
          .slice(0, 25),
        count: group.alerts.length,
        url: new URL("/today#alerts", serverEnv.APP_BASE_URL).toString(),
        environment: serverEnv.APP_ENV,
        reasonCodes: group.alerts
          .flatMap((alert) =>
            typeof alert.evidence.reason_code === "string"
              ? [alert.evidence.reason_code]
              : [],
          )
          .filter((value) => /^[A-Z0-9_:-]{1,120}$/.test(value))
          .slice(0, 10),
      });
      await repository.recordDelivery(
        group.alerts.map((alert) => alert.id),
        "sent",
        null,
        null,
        maxAttempts,
      );
      written += group.alerts.length;
    } catch (error) {
      const code = errorCode(error);
      const failure = deliveryFailure(
        code,
        Math.max(...group.alerts.map((alert) => alert.attempts)),
        maxAttempts,
        now.getTime(),
        Math.random(),
      );
      await repository.recordDelivery(
        group.alerts.map((alert) => alert.id),
        "failed",
        code,
        failure.next,
        failure.next === null ? 1 : maxAttempts,
      );
      const terminal = group.alerts.filter(
        (alert) => failure.next === null || alert.attempts + 1 >= maxAttempts,
      );
      if (terminal.length)
        await safelyRaise({
          type: "slack_delivery_failure",
          source: "slack",
          entityType: "alert",
          entityId: null,
          keyParts: [first.type],
          evidence: { reason_code: code, count: terminal.length },
        });
      failed += group.alerts.length;
    }
  }
  return {
    read: rows.length,
    written,
    failed,
    hasMore:
      rows.length >= max ||
      written + failed <
        plan.deliveries.flatMap((group) => group.alerts).length,
    cursor: null,
  };
}
