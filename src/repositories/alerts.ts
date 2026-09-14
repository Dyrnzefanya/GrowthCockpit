import "server-only";
import { adminClient } from "@/lib/supabase/server-admin";
import { serverClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database.generated";

export type AlertRow = Database["public"]["Tables"]["alerts"]["Row"];

function check(error: { code?: string } | null) {
  if (error)
    throw new Error(
      ["23505", "40001"].includes(error.code ?? "") ? "CONFLICT" : "INTERNAL",
    );
}

export async function raise(value: Json) {
  const { data, error } = await adminClient()
    .rpc("raise_alert", { p_alert: value })
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
  return data;
}

export async function raiseMany(values: Json[]) {
  if (!values.length) return 0;
  const { data, error } = await adminClient()
    .rpc("raise_alert_batch", { p_alerts: values })
    .abortSignal(AbortSignal.timeout(5000));
  check(error);
  return data ?? 0;
}

export async function transition(
  id: string,
  action: "acknowledge" | "snooze" | "resolve",
  reason: string,
  actor: string | null,
  until: string | null = null,
) {
  const { data, error } = await adminClient()
    .rpc("transition_alert", {
      p_id: id,
      p_action: action,
      p_reason: reason,
      p_actor: actor!,
      p_until: until!,
    })
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
  return data;
}

export async function reactivate(at: string) {
  const { data, error } = await adminClient()
    .rpc("reactivate_due_alerts", { p_at: at })
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
  return data ?? 0;
}

export async function resolveMissing(
  types: string[],
  activeKeys: string[],
  before: string,
) {
  const { data, error } = await adminClient()
    .rpc("resolve_missing_alerts", {
      p_types: types,
      p_active_keys: activeKeys,
      p_before: before,
    })
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
  return data ?? 0;
}

export async function today() {
  const { data, error } = await (
    await serverClient()
  )
    .from("alerts")
    .select("*")
    .eq("status", "open")
    .order("severity")
    .order("last_seen_at", { ascending: false })
    .limit(100);
  check(error);
  return data ?? [];
}

export async function pending(limit: number, now: string, maxAttempts: number) {
  const { data, error } = await adminClient()
    .from("alerts")
    .select("*")
    .eq("status", "open")
    .in("notification_status", ["pending", "failed"])
    .lt("notification_attempts", maxAttempts)
    .or(`next_notification_at.is.null,next_notification_at.lte.${now}`)
    .order("next_notification_at")
    .order("last_seen_at")
    .order("id")
    .limit(limit);
  check(error);
  return data ?? [];
}

export async function notifiedForKeys(keys: string[]) {
  if (!keys.length) return [];
  const { data, error } = await adminClient()
    .from("alerts")
    .select("alert_key,last_notified_at")
    .in("alert_key", keys)
    .not("last_notified_at", "is", null);
  check(error);
  return data ?? [];
}

export async function recordDelivery(
  ids: string[],
  outcome: "sent" | "deferred" | "failed",
  errorCode: string | null,
  next: string | null,
  max: number,
) {
  if (!ids.length) return 0;
  const { data, error } = await adminClient()
    .rpc("record_alert_delivery", {
      p_ids: ids,
      p_outcome: outcome,
      p_error: errorCode!,
      p_next: next!,
      p_max: max,
    })
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
  return data ?? 0;
}

export async function notificationVolume() {
  const { data, error } = await (
    await serverClient()
  ).rpc("alert_notification_volume", { p_days: 30 });
  check(error);
  return data ?? [];
}

export async function staleLeadPage(after: string | null, limit: number) {
  let query = adminClient()
    .from("leads")
    .select("id,qualification_status,inquiry_at,updated_at")
    .in("qualification_status", ["mql", "sql"])
    .order("id")
    .limit(limit);
  if (after) query = query.gt("id", after);
  const { data, error } = await query;
  check(error);
  const rows = data ?? [];
  const latest = new Map<string, string>();
  for (let start = 0; start < rows.length; start += 100) {
    const ids = rows.slice(start, start + 100).map((row) => row.id);
    for (let offset = 0; ; offset += 1000) {
      const { data: events, error: eventError } = await adminClient()
        .from("lead_stage_events")
        .select("lead_id,changed_at,id")
        .in("lead_id", ids)
        .order("changed_at", { ascending: false })
        .order("id")
        .range(offset, offset + 999);
      check(eventError);
      for (const event of events ?? [])
        if (!latest.has(event.lead_id))
          latest.set(event.lead_id, event.changed_at);
      if ((events?.length ?? 0) < 1000) break;
    }
  }
  return rows.map((row) => ({
    ...row,
    lastActivityAt: latest.get(row.id) ?? row.inquiry_at,
  }));
}

export async function jobState(key: string) {
  const { data, error } = await adminClient()
    .from("sync_state")
    .select("cursor")
    .eq("integration", "jobs")
    .eq("resource", key)
    .maybeSingle();
  check(error);
  return data?.cursor ?? null;
}

export async function healthFacts(max: number) {
  const client = adminClient();
  const [events, states, runs, coverage] = await Promise.all([
    client
      .from("webhook_events")
      .select("id,source,last_error")
      .eq("status", "dead_letter")
      .order("received_at", { ascending: false })
      .limit(max),
    client.from("sync_state").select("*").limit(max),
    client
      .from("integration_runs")
      .select("job_key,started_at,status")
      .not("job_key", "is", null)
      .order("started_at", { ascending: false })
      .limit(max),
    client
      .from("vw_attribution_coverage")
      .select("inquiry_date,leads,attributed")
      .order("inquiry_date", { ascending: false })
      .limit(Math.min(max, 30)),
  ]);
  for (const result of [events, states, runs, coverage]) check(result.error);
  return {
    events: events.data ?? [],
    states: states.data ?? [],
    runs: runs.data ?? [],
    coverage: coverage.data ?? [],
  };
}

export async function unresolved(types: string[]) {
  const { data, error } = await adminClient()
    .from("alerts")
    .select("alert_key,type")
    .in("type", types)
    .neq("status", "resolved");
  check(error);
  return data ?? [];
}
