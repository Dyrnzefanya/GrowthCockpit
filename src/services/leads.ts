import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/services/session";
import { can } from "@/lib/auth/can";
import { readSettings } from "@/repositories/settings";
import { machineSettings } from "@/repositories/integrations";
import * as repository from "@/repositories/leads";
import {
  leadInputSchema,
  leadFiltersSchema,
  overrideSchema,
  dealSchema,
} from "@/config/lead-schema";
import { scopeFor, planLeads, type Submission } from "@/domain/leads/plan";
import { overrideLead } from "@/domain/leads/override";
import { csvInput, mapCsv } from "@/domain/leads/csv";
import { allocations } from "@/domain/attribution/normalise";
import { followUp } from "@/domain/leads/rules";
import { toJakartaDate } from "@/domain/dates";
import type { Database } from "@/types/database.generated";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
async function authorized() {
  const actor = await requireUser();
  if (!(await can("lead:write"))) throw new Error("FORBIDDEN");
  return actor.id;
}
async function settings(machine = false) {
  const { values } = await (machine ? machineSettings() : readSettings());
  return {
    minQuantity: values["qualification.min_quantity"],
    freeDomains: values["qualification.free_email_domains"],
    internalDomains: values["qualification.internal_domains"],
    competitorDomains: values["qualification.competitor_domains"],
  };
}
async function prepare(submissions: Submission[], actor: string | null) {
  const scope = scopeFor(submissions);
  const [snapshot, rules] = await Promise.all([
    repository.snapshot(scope, actor === null ? 3000 : undefined),
    settings(actor === null),
  ]);
  const plan = planLeads(
    snapshot,
    submissions,
    rules,
    actor,
    new Date().toISOString(),
    randomUUID,
  );
  return {
    scope,
    snapshot,
    plan,
    fingerprint: hash(
      JSON.stringify({ submissions, revision: snapshot.revision, rules }),
    ),
  };
}
export async function createLead(value: unknown, requestId: unknown) {
  const actor = await authorized();
  const input = leadInputSchema.parse(value);
  const key = hash("manual:" + z.uuid().parse(requestId));
  return persistLead(input, key, actor);
}
// Internal server service: only a durable, claimed HMAC-authenticated event reaches this entry.
export async function ingestLead(
  value: unknown,
  event: { id: string; claim: string },
) {
  return persistLead(
    leadInputSchema.parse(value),
    hash("webhook:" + z.uuid().parse(event.id)),
    null,
    event,
  );
}
async function persistLead(
  input: z.infer<typeof leadInputSchema>,
  key: string,
  actor: string | null,
  event?: { id: string; claim: string },
) {
  const deadline = Date.now() + 24000;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (Date.now() > deadline) throw new Error("TIMEOUT");
    const prepared = await prepare([{ input, key, row: 1 }], actor);
    if (prepared.plan.report.some((r) => r.status === "error"))
      throw new Error("CONFLICT");
    try {
      if (event)
        for (const lead of prepared.plan.leads) lead.source_event_id = event.id;
      await repository.commit(
        prepared.scope,
        prepared.snapshot.revision,
        prepared.plan,
        event
          ? {
              ...event,
              leadId: prepared.plan.report[0].leadId!,
              outcome: prepared.plan.report[0].status,
            }
          : undefined,
      );
      if (prepared.plan.report[0].leadId) {
        const { queueWriteback } = await import("@/services/crm-sync");
        await queueWriteback(prepared.plan.report[0].leadId, key).catch(() => {
          // Local commit already succeeded; reconcile recovers this durable lead revision.
          console.warn("HUBSPOT_ENQUEUE_DEFERRED");
        });
      }
      return prepared.plan.report[0];
    } catch (e) {
      if (!(e instanceof Error) || e.message !== "CONFLICT" || attempt === 2)
        throw e;
    }
  }
  throw new Error("CONFLICT");
}
export async function importLeads(value: unknown, commit: boolean) {
  const actor = await authorized(),
    input = csvInput.parse(value),
    mapped = mapCsv(input.text, input.mapping);
  const occurrences = new Map<string, number>();
  const submissions = mapped.valid.map((row) => {
    const canonical = hash(JSON.stringify(row.input)),
      ordinal = occurrences.get(canonical) ?? 0;
    occurrences.set(canonical, ordinal + 1);
    return { ...row, key: hash("csv:" + canonical + ":" + ordinal) };
  });
  const p = await prepare(submissions, actor);
  const report = [
    ...p.plan.report,
    ...mapped.errors.map((e) => ({ ...e, status: "error" as const })),
  ].sort((a, b) => a.row - b.row);
  const counts = {
    created: report.filter((r) => r.status === "created").length,
    updated: report.filter((r) => r.status === "updated").length,
    skipped: report.filter((r) => r.status === "skipped").length,
    errors: report.filter((r) => r.status === "error").length,
  };
  if (commit) {
    if (counts.errors) throw new Error("CSV_ROWS");
    if (input.fingerprint !== p.fingerprint) throw new Error("PREVIEW_STALE");
    await repository.commit(p.scope, p.snapshot.revision, p.plan);
  }
  return { counts, report, fingerprint: p.fingerprint, committed: commit };
}
export async function leadLibrary(
  search: Record<string, string | string[] | undefined>,
) {
  await requireUser();
  const filters = leadFiltersSchema.parse(search);
  return { ...(await repository.listLeads(filters)), filters };
}
export async function leadDetail(id: string, eventPage: unknown = 0) {
  await requireUser();
  const parsed = z.uuid().safeParse(id);
  const page = z.coerce
    .number()
    .int()
    .min(0)
    .max(100000)
    .catch(0)
    .parse(eventPage);
  return parsed.success ? repository.readLead(parsed.data, page) : null;
}
export async function override(value: unknown) {
  const actor = await authorized(),
    input = overrideSchema.parse(value);
  const current = await repository.readLead(input.id);
  if (!current) throw new Error("NOT_FOUND");
  if (current.lead.updated_at !== input.revision) throw new Error("CONFLICT");
  const change = overrideLead(
    current.lead,
    input.status,
    input.reason,
    actor,
    new Date().toISOString(),
    randomUUID(),
  );
  await repository.writeOverride(
    input.id,
    input.revision,
    change.patch,
    change.event,
  );
  await (
    await import("@/services/crm-sync")
  )
    .queueWriteback(input.id, input.revision + input.status)
    .catch(() => {
      console.warn("HUBSPOT_ENQUEUE_DEFERRED");
    });
}
export async function saveDeal(value: unknown) {
  const actor = await authorized(),
    input = dealSchema.parse(value),
    detail = await repository.readLead(input.lead_id);
  if (!detail) throw new Error("NOT_FOUND");
  if (detail.deal?.hubspot_deal_id) throw new Error("FORBIDDEN");
  if ((detail.deal?.updated_at ?? null) !== input.revision)
    throw new Error("CONFLICT");
  const { values } = await readSettings(),
    now = new Date().toISOString();
  const allocation = detail.deal?.attribution_rule_version
    ? detail.deal.attribution_allocations
    : allocations(
        values["attribution.revenue_rule"],
        detail.lead.lt_campaign,
        detail.contact?.ft_campaign ?? null,
      );
  const deal: Database["public"]["Tables"]["deals"]["Row"] = {
    id: detail.deal?.id ?? randomUUID(),
    created_at: detail.deal?.created_at ?? now,
    updated_at: now,
    external_id: null,
    hubspot_deal_id: null,
    source_system: "manual",
    source_updated_at: null,
    synced_at: null,
    lead_id: input.lead_id,
    contact_id: detail.lead.contact_id,
    company_id: detail.lead.company_id,
    name: input.name,
    pipeline: input.pipeline,
    stage_key: input.stage_key,
    stage_label: input.stage_label,
    stage_category: input.stage_category,
    amount: input.amount ? Number(input.amount) : null,
    currency: input.currency,
    expected_close_date: input.expected_close_date,
    close_date: input.close_date,
    owner_hubspot_id: null,
    updated_by: actor,
    attributed_campaign:
      detail.deal?.attributed_campaign ??
      (values["attribution.revenue_rule"] === "contact_first_touch"
        ? (detail.contact?.ft_campaign ?? null)
        : detail.lead.lt_campaign),
    attribution_rule_version:
      detail.deal?.attribution_rule_version ??
      "a1:" + values["attribution.revenue_rule"],
    attribution_allocations: allocation,
  };
  await repository.writeDeal(deal, input.revision, detail.lead.updated_at);
}
export async function followUpQueue() {
  await requireUser();
  const [{ values }, rows] = await Promise.all([
    readSettings(),
    repository.followUpCandidates(),
  ]);
  const today = toJakartaDate(new Date());
  const due = rows
    .map((l) => ({
      ...l,
      reasons: followUp(
        {
          status: l.qualification_status,
          attributionMissing: l.attribution_missing,
          lastEvent: l.lastEvent,
        },
        today,
        values["follow_up.mql_workdays"],
        values["follow_up.sql_workdays"],
      ),
    }))
    .filter((l) => l.reasons.length);
  return { rows: due.slice(0, 20), total: due.length };
}
