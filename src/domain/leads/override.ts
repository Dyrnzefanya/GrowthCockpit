import type { Lead, StageEvent } from "./plan";
export function overrideLead(
  lead: Lead,
  status: string,
  reason: string,
  actor: string,
  now: string,
  eventId: string,
) {
  if (status === lead.qualification_status)
    throw new Error("VALIDATION_FAILED");
  const patch = {
    qualification_status: status,
    qualification_reason: reason,
    manual_override: true,
    qualified_at:
      lead.qualified_at ?? (["mql", "sql"].includes(status) ? now : null),
    sql_at: lead.sql_at ?? (status === "sql" ? now : null),
    disqualified_at:
      lead.disqualified_at ?? (status === "disqualified" ? now : null),
  };
  const event: StageEvent = {
    id: eventId,
    lead_id: lead.id,
    from_status: lead.qualification_status,
    to_status: status,
    changed_at: now,
    source: "manual",
    actor,
    note: reason,
    created_at: now,
    updated_at: now,
  };
  return { patch, event };
}
