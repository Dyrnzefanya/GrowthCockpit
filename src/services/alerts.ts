import "server-only";
import { z } from "zod";
import { alertKey } from "@/domain/alerts/keys";
import {
  alertDefinitions,
  type AlertType,
  type AlertSeverity,
} from "@/domain/alerts/policy";
import * as repository from "@/repositories/alerts";
import { requireUser } from "@/services/session";
import type { Json } from "@/types/database.generated";

const evidenceValue = z.union([
  z.string().max(200),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);
const candidateSchema = z.object({
  type: z.enum(Object.keys(alertDefinitions) as [AlertType, ...AlertType[]]),
  source: z.string().trim().min(1).max(80),
  entityType: z.string().trim().min(1).max(80),
  entityId: z.uuid().nullable(),
  keyParts: z.array(z.string().trim().min(1).max(200)).min(1).max(4),
  evidence: z.record(z.string().max(80), evidenceValue).default({}),
  detectedAt: z.iso
    .datetime({ offset: true })
    .default(() => new Date().toISOString()),
});
export type AlertCandidate = z.input<typeof candidateSchema>;

function persisted(candidate: AlertCandidate) {
  const value = candidateSchema.parse(candidate);
  const definition = alertDefinitions[value.type];
  return {
    alert_key: alertKey(value.type, ...value.keyParts),
    type: value.type,
    severity: definition.severity satisfies AlertSeverity,
    source: value.source,
    entity_type: value.entityType,
    entity_id: value.entityId,
    title: definition.title,
    message: definition.message,
    evidence: value.evidence,
    notify: definition.slack,
    detected_at: value.detectedAt,
  } satisfies Record<string, Json>;
}

export async function raiseAlert(candidate: AlertCandidate) {
  return repository.raise(persisted(candidate));
}

export async function raiseAlerts(candidates: AlertCandidate[]) {
  const rows = candidates.map(persisted);
  let raised = 0;
  for (let start = 0; start < rows.length; start += 500)
    raised += await repository.raiseMany(rows.slice(start, start + 500));
  return raised;
}

export async function safelyRaise(candidate: AlertCandidate) {
  try {
    await raiseAlert(candidate);
  } catch {
    console.warn("ALERT_PERSISTENCE_DEFERRED");
  }
}

export async function emitLeadAlert(
  leadId: string,
  status: string,
  campaignId: string | null = null,
) {
  if (status !== "mql" && status !== "sql") return;
  await safelyRaise({
    type: status === "mql" ? "new_mql" : "new_sql",
    source: "lead",
    entityType: "lead",
    entityId: leadId,
    keyParts: [leadId],
    evidence: {
      lead_id: leadId,
      qualification_status: status,
      campaign_id: campaignId,
    },
  });
}

export async function emitLeadAlerts(
  leads: { id: string; status: string; campaignId: string | null }[],
) {
  const candidates = leads.flatMap((lead): AlertCandidate[] =>
    lead.status === "mql" || lead.status === "sql"
      ? [
          {
            type: lead.status === "mql" ? "new_mql" : "new_sql",
            source: "lead",
            entityType: "lead",
            entityId: lead.id,
            keyParts: [lead.id],
            evidence: {
              lead_id: lead.id,
              qualification_status: lead.status,
              campaign_id: lead.campaignId,
            },
          },
        ]
      : [],
  );
  try {
    await raiseAlerts(candidates);
  } catch {
    console.warn("ALERT_PERSISTENCE_DEFERRED");
  }
}

export async function emitDealAlert(
  dealId: string,
  category: string,
  leadId: string | null,
) {
  if (category !== "won" && category !== "lost") return;
  await safelyRaise({
    type: category === "won" ? "deal_won" : "deal_lost",
    source: "deal",
    entityType: "deal",
    entityId: dealId,
    keyParts: [dealId],
    evidence: { deal_id: dealId, lead_id: leadId, stage_category: category },
  });
}

export async function emitHubspotAlerts(plan: {
  changes: {
    table: string;
    id: string;
    value: Record<string, Json | undefined>;
  }[];
  warnings: string[];
}) {
  const candidates: AlertCandidate[] = [];
  for (const change of plan.changes) {
    if (
      change.table === "leads" &&
      (change.value.qualification_status === "mql" ||
        change.value.qualification_status === "sql")
    )
      candidates.push({
        type:
          change.value.qualification_status === "mql" ? "new_mql" : "new_sql",
        source: "hubspot",
        entityType: "lead",
        entityId: change.id,
        keyParts: [change.id],
        evidence: {
          lead_id: change.id,
          qualification_status: change.value.qualification_status,
        },
      });
    if (
      change.table === "deals" &&
      (change.value.stage_category === "won" ||
        change.value.stage_category === "lost")
    )
      candidates.push({
        type: change.value.stage_category === "won" ? "deal_won" : "deal_lost",
        source: "hubspot",
        entityType: "deal",
        entityId: change.id,
        keyParts: [change.id],
        evidence: {
          deal_id: change.id,
          stage_category: change.value.stage_category,
        },
      });
  }
  for (const warning of plan.warnings.filter((value) =>
    /^(UNMAPPED_STAGE|UNMAPPED_LIFECYCLE|UNMAPPED_PIPELINE):/.test(value),
  ))
    candidates.push({
      type: "unmapped_stage",
      source: "hubspot",
      entityType: "integration",
      entityId: null,
      keyParts: [warning],
      evidence: { integration: "hubspot", reason_code: warning },
    });
  try {
    await raiseAlerts(candidates);
  } catch {
    console.warn("ALERT_PERSISTENCE_DEFERRED");
  }
}

const evidenceLabels: Record<string, string> = {
  lead_id: "Lead ID",
  deal_id: "Deal ID",
  campaign_id: "Campaign ID",
  qualification_status: "Qualification",
  stage_category: "Deal outcome",
  integration: "Integration",
  resource: "Resource",
  job_key: "Job",
  event_id: "Event ID",
  reason_code: "Reason code",
  business_date: "Business date",
  coverage: "Coverage",
  threshold: "Threshold",
  count: "Count",
};

export async function todayAlerts() {
  await requireUser();
  await repository.reactivate(new Date().toISOString());
  const rows = await repository.today();
  return rows.map((row) => {
    const type = z
      .enum(Object.keys(alertDefinitions) as [AlertType, ...AlertType[]])
      .parse(row.type);
    const evidence =
      row.evidence &&
      typeof row.evidence === "object" &&
      !Array.isArray(row.evidence)
        ? Object.entries(row.evidence)
            .filter(([key, value]) =>
              Boolean(
                evidenceLabels[key] && evidenceValue.safeParse(value).success,
              ),
            )
            .map(([key, value]) => ({
              label: evidenceLabels[key],
              value: String(value),
            }))
        : [];
    const history = Array.isArray(row.history)
      ? row.history.flatMap((item) => {
          const parsed = z
            .object({
              event: z.string().max(40),
              at: z.string().max(40),
              reason: z.string().max(200).optional(),
              until: z.string().max(40).optional(),
              code: z.string().max(80).optional(),
            })
            .safeParse(item);
          return parsed.success ? [parsed.data] : [];
        })
      : [];
    return {
      id: row.id,
      type,
      severity: row.severity as AlertSeverity,
      title: row.title,
      message: row.message,
      entityType: row.entity_type,
      entityId: row.entity_id,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      occurrenceCount: row.occurrence_count,
      notificationCount: row.notification_count,
      evidence,
      history,
      playbook:
        "playbook" in alertDefinitions[type]
          ? String(alertDefinitions[type].playbook)
          : null,
    };
  });
}
