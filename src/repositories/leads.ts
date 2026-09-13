import "server-only";
import { adminClient } from "@/lib/supabase/server-admin";
import { serverClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.generated";
import type { Snapshot, LeadPlan } from "@/domain/leads/plan";
import type { leadFiltersSchema } from "@/config/lead-schema";
import type { z } from "zod";
type Scope = {
  emails: string[];
  phones: string[];
  domains: string[];
  names: string[];
  keys: string[];
};
function check(error: { code?: string } | null) {
  if (error) {
    console.warn("crm_request_failed", { code: error.code });
    throw new Error(
      error.code === "40001" || error.code === "23505"
        ? "CONFLICT"
        : "INTERNAL",
    );
  }
}
export async function snapshot(scope: Scope) {
  const { data, error } = await adminClient().rpc("crm_snapshot", {
    p_scope: scope,
  });
  check(error);
  return data as unknown as Snapshot;
}
export async function commit(scope: Scope, revision: string, plan: LeadPlan) {
  const { error } = await adminClient().rpc("commit_lead_batch", {
    p_scope: scope,
    p_revision: revision,
    p_plan: plan as unknown as Json,
  });
  check(error);
}
export async function listLeads(f: z.infer<typeof leadFiltersSchema>) {
  let q = (await serverClient())
    .from("leads")
    .select(
      "id,inquiry_at,inquiry_date,product_interest,qualification_status,qualification_reason,platform,channel,lt_campaign,attribution_missing,owner_id,contact_id,contacts!leads_contact_id_fkey(full_name,email,phone_e164)",
      { count: "exact" },
    );
  if (f.status) q = q.eq("qualification_status", f.status);
  if (f.channel) q = q.eq("channel", f.channel);
  if (f.platform) q = q.eq("platform", f.platform);
  if (f.campaign) q = q.eq("lt_campaign", f.campaign);
  if (f.from) q = q.gte("inquiry_date", f.from);
  if (f.to) q = q.lte("inquiry_date", f.to);
  if (f.owner) q = q.eq("owner_id", f.owner);
  if (f.attribution !== "all")
    q = q.eq("attribution_missing", f.attribution === "missing");
  const { data, error, count } = await q
    .order(f.sort, { ascending: f.direction === "asc" })
    .order("id")
    .range(f.page * 20, f.page * 20 + 19);
  check(error);
  return { rows: data ?? [], total: count ?? 0 };
}
export async function readLead(id: string, eventPage = 0) {
  const client = await serverClient();
  const { data, error } = await client
    .from("leads")
    .select("*")
    .eq("id", id)
    .abortSignal(new AbortController().signal)
    .maybeSingle();
  check(error);
  if (!data) return null;
  const [contact, company, events, deal] = await Promise.all([
    data.contact_id
      ? client.from("contacts").select("*").eq("id", data.contact_id).single()
      : null,
    data.company_id
      ? client.from("companies").select("*").eq("id", data.company_id).single()
      : null,
    client
      .from("lead_stage_events")
      .select("*", { count: "exact" })
      .eq("lead_id", id)
      .order("changed_at")
      .order("created_at")
      .order("id")
      .range(eventPage * 20, eventPage * 20 + 19),
    data.deal_id
      ? client.from("deals").select("*").eq("id", data.deal_id).single()
      : null,
  ]);
  for (const result of [contact, company, events, deal])
    if (result) check(result.error);
  return {
    lead: data,
    contact: contact?.data ?? null,
    company: company?.data ?? null,
    events: events.data ?? [],
    eventPage,
    eventTotal: events.count ?? 0,
    deal: deal?.data ?? null,
  };
}
export async function writeOverride(
  id: string,
  revision: string,
  patch: Json,
  event: Json,
) {
  const { error } = await adminClient().rpc("commit_lead_override", {
    p_id: id,
    p_revision: revision,
    p_patch: patch,
    p_event: event,
  });
  check(error);
}
export async function writeDeal(
  deal: Json,
  revision: string | null,
  leadRevision: string,
) {
  const { error } = await adminClient().rpc("commit_deal", {
    p_deal: deal,
    p_revision: revision!,
    p_lead_revision: leadRevision,
  });
  check(error);
}
export async function funnelFacts(from: string, to: string) {
  const client = await serverClient();
  // Page facts to avoid Supabase's 1,000-row cap silently truncating aggregates.
  const cohort = [];
  const activity = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("vw_funnel_daily")
      .select("*")
      .gte("inquiry_date", from)
      .lte("inquiry_date", to)
      .order("inquiry_date")
      .order("platform")
      .order("lt_campaign")
      .order("currency")
      .range(offset, offset + 999);
    check(error);
    cohort.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("vw_funnel_activity_daily")
      .select("*")
      .gte("event_date", from)
      .lte("event_date", to)
      .order("event_date")
      .order("to_status")
      .order("source")
      .range(offset, offset + 999);
    check(error);
    activity.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return { cohort, activity };
}
export async function followUpCandidates() {
  const client = await serverClient();
  const leads = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("leads")
      .select(
        "id,qualification_status,attribution_missing,inquiry_at,product_interest,updated_at",
      )
      .or("qualification_status.in.(new,mql,sql),attribution_missing.eq.true")
      .order("inquiry_at")
      .order("id")
      .range(offset, offset + 999);
    check(error);
    leads.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  const latest = new Map<string, string>();
  for (let start = 0; start < leads.length; start += 100) {
    const ids = leads.slice(start, start + 100).map((l) => l.id);
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client
        .from("lead_stage_events")
        .select("lead_id,changed_at,id")
        .in("lead_id", ids)
        .order("changed_at", { ascending: false })
        .order("id")
        .range(offset, offset + 999);
      check(error);
      for (const e of data ?? [])
        if (!latest.has(e.lead_id)) latest.set(e.lead_id, e.changed_at);
      if ((data?.length ?? 0) < 1000) break;
    }
  }
  return leads.map((l) => ({
    ...l,
    lastEvent: latest.get(l.id) ?? l.inquiry_at,
  }));
}
