import "server-only";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/server-admin";
import { serverClient } from "@/lib/supabase/server";
import {
  mappingSchema,
  type Kind,
  type CrmRecord,
} from "@/integrations/hubspot/mapping";
import type { MirrorSnapshot, MirrorPlan } from "@/domain/hubspot";
import type { Json } from "@/types/database.generated";
import { email, phone, domain } from "@/domain/attribution/normalise";
function check(e: { code?: string } | null) {
  if (e)
    throw new Error(
      ["23505", "40001"].includes(e.code ?? "") ? "CONFLICT" : "INTERNAL",
    );
}
export async function configuration(machine = false) {
  const client = machine ? adminClient() : await serverClient();
  const { data, error } = await client
    .from("app_settings")
    .select("key,value")
    .in("key", [
      "hubspot.mapping",
      "hubspot.write_lifecycle_stage",
      "attribution.revenue_rule",
    ])
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
  const parsed = mappingSchema.safeParse(
    data?.find((v) => v.key === "hubspot.mapping")?.value,
  );
  return {
    mapping: parsed.success ? parsed.data : null,
    writeLifecycle:
      data?.find((v) => v.key === "hubspot.write_lifecycle_stage")?.value ===
      true,
    rule: z
      .enum(["lead_last_touch", "contact_first_touch", "split_50_50"])
      .catch("lead_last_touch")
      .parse(data?.find((v) => v.key === "attribution.revenue_rule")?.value),
  };
}
export async function saveMapping(value: unknown) {
  const parsed = mappingSchema.parse(value);
  const { error } = await (
    await serverClient()
  )
    .from("app_settings")
    .update({ value: parsed })
    .eq("key", "hubspot.mapping")
    .select("key")
    .abortSignal(AbortSignal.timeout(3000))
    .single();
  check(error);
}
export async function snapshot(
  kind: Kind,
  r: CrmRecord,
): Promise<MirrorSnapshot> {
  const client = adminClient();
  const { data: deals, error: dealError } = await client
    .from("deals")
    .select("*")
    .eq("hubspot_deal_id", kind === "deals" ? r.id : "-1")
    .abortSignal(AbortSignal.timeout(3000));
  check(dealError);
  const linkedLeadIds = [
    r.properties.pmos_lead_id,
    ...(deals ?? []).map((d) => d.lead_id),
  ].filter((v): v is string => z.uuid().safeParse(v).success);
  const { data: linkedLeads, error: leadError } = await client
    .from("leads")
    .select("*")
    .in("id", linkedLeadIds)
    .abortSignal(AbortSignal.timeout(3000));
  check(leadError);
  const contacts = [];
  const ids = [
    ...(kind === "contacts" ? [r.id] : []),
    ...(r.associations?.contacts?.results.map((v) => v.id) ?? []),
  ];
  const queries = [
    client.from("contacts").select("*").in("hubspot_contact_id", ids),
    client
      .from("contacts")
      .select("*")
      .in(
        "id",
        (linkedLeads ?? [])
          .map((l) => l.contact_id)
          .filter((v): v is string => Boolean(v)),
      ),
  ];
  if (kind === "contacts" && email(r.properties.email))
    queries.push(
      client
        .from("contacts")
        .select("*")
        .eq("email", email(r.properties.email)!),
    );
  if (kind === "contacts" && phone(r.properties.phone))
    queries.push(
      client
        .from("contacts")
        .select("*")
        .eq("phone_e164", phone(r.properties.phone)!),
    );
  for (const q of queries) {
    const { data, error } = await q.abortSignal(AbortSignal.timeout(3000));
    check(error);
    contacts.push(...(data ?? []));
  }
  const unique = [...new Map(contacts.map((c) => [c.id, c])).values()];
  const companies = [];
  const companyIds = [
    ...(kind === "companies" ? [r.id] : []),
    ...(r.associations?.companies?.results.map((v) => v.id) ?? []),
  ];
  const cq = [
    client.from("companies").select("*").in("hubspot_company_id", companyIds),
    client
      .from("companies")
      .select("*")
      .in(
        "id",
        unique.map((c) => c.company_id).filter((v): v is string => Boolean(v)),
      ),
  ];
  if (kind === "companies" && domain(r.properties.domain))
    cq.push(
      client
        .from("companies")
        .select("*")
        .eq("domain", domain(r.properties.domain)!),
    );
  for (const q of cq) {
    const { data, error } = await q.abortSignal(AbortSignal.timeout(3000));
    check(error);
    companies.push(...(data ?? []));
  }
  const leads = [...(linkedLeads ?? [])];
  {
    // Two candidates suffice to reject ambiguous contact fallback; explicit/previous links were loaded above.
    const { data, error } = await client
      .from("leads")
      .select("*")
      .in(
        "contact_id",
        unique.map((c) => c.id),
      )
      .order("id")
      .limit(2)
      .abortSignal(AbortSignal.timeout(3000));
    check(error);
    leads.push(...(data ?? []));
  }
  return {
    contacts: unique,
    companies: [...new Map(companies.map((c) => [c.id, c])).values()],
    leads: [...new Map(leads.map((l) => [l.id, l])).values()],
    deals: deals ?? [],
  };
}
export async function commit(
  plan: MirrorPlan,
  event?: { id: string; claim: string },
) {
  const { error } = await adminClient()
    .rpc("commit_hubspot_mirror", {
      p_changes: plan.changes as unknown as Json,
      p_events: plan.events as unknown as Json,
      ...(event ? { p_event: event.id, p_claim: event.claim } : {}),
      p_result: {
        status: "processed",
        outcome: plan.changes.length ? "created" : "skipped",
        event_id: event?.id ?? null,
        warnings: plan.warnings,
      },
    })
    .abortSignal(AbortSignal.timeout(4000));
  check(error);
}
export async function state(resource: string) {
  const { data, error } = await adminClient()
    .from("sync_state")
    .select("*")
    .eq("integration", "hubspot")
    .eq("resource", resource)
    .abortSignal(AbortSignal.timeout(3000))
    .maybeSingle();
  check(error);
  return data;
}
export async function saveState(
  resource: string,
  cursor: string | null,
  warnings: string[] | null,
  success: boolean | undefined,
) {
  const previous = await state(resource);
  const { error } = await adminClient()
    .from("sync_state")
    .upsert(
      {
        integration: "hubspot",
        resource,
        cursor,
        last_run_at: new Date().toISOString(),
        ...(success ? { last_success_at: new Date().toISOString() } : {}),
        consecutive_failures:
          success === undefined
            ? (previous?.consecutive_failures ?? 0)
            : success
              ? 0
              : (previous?.consecutive_failures ?? 0) + 1,
        last_error:
          warnings === null
            ? (previous?.last_error ?? null)
            : warnings.length
              ? JSON.stringify(warnings.slice(0, 50))
              : null,
      },
      { onConflict: "integration,resource" },
    )
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
}
export async function statusData() {
  const client = await serverClient();
  const [states, runs] = await Promise.all([
    client
      .from("sync_state")
      .select("*")
      .eq("integration", "hubspot")
      .abortSignal(AbortSignal.timeout(3000)),
    client
      .from("integration_runs")
      .select("*")
      .or(
        "job_key.eq.JOB-HUBSPOT-RECONCILE,integration.eq.hubspot,job_key.eq.HUBSPOT-WRITEBACK",
      )
      .order("started_at", { ascending: false })
      .limit(20)
      .abortSignal(AbortSignal.timeout(3000)),
  ]);
  check(states.error);
  check(runs.error);
  return { states: states.data ?? [], runs: runs.data ?? [] };
}
export async function pendingWritebacks(limit: number, cursor: string | null) {
  let q = adminClient()
    .from("leads")
    .select(
      "id,updated_at,contact_id,contacts!leads_contact_id_fkey(hubspot_contact_id)",
    )
    .not("contact_id", "is", null)
    .order("updated_at")
    .order("id")
    .limit(limit);
  if (cursor) {
    const value = z
      .object({ at: z.iso.datetime({ offset: true }), id: z.uuid() })
      .parse(JSON.parse(cursor));
    q = q.or(
      `updated_at.gt.${value.at},and(updated_at.eq.${value.at},id.gt.${value.id})`,
    );
  }
  const { data, error } = await q.abortSignal(AbortSignal.timeout(3000));
  check(error);
  return data ?? [];
}
