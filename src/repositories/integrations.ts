import "server-only";
import { adminClient } from "@/lib/supabase/server-admin";
import { serverClient } from "@/lib/supabase/server";
import { parseSettings } from "@/config/settings-schema";
import type { Database, Json } from "@/types/database.generated";
type Tables = Database["public"]["Tables"];
export type Webhook = Tables["webhook_events"]["Row"];
export type Run = Tables["integration_runs"]["Row"];
function check(error: { code?: string } | null) {
  if (error) throw new Error(error.code === "40001" ? "CONFLICT" : "INTERNAL");
}
export async function accept(event: Json) {
  const { data, error } = await adminClient()
    .rpc("accept_webhook", { p_event: event })
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
  return data as unknown as { event: Webhook; inserted: boolean };
}
export async function claim(
  id: string | null,
  trigger: "manual" | "webhook" | "schedule",
  max: number,
) {
  const { data, error } = await adminClient()
    .rpc("claim_webhook", { p_id: id!, p_trigger: trigger, p_max: max })
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
  return data as unknown as Webhook | { exhausted: true; id: string } | null;
}
export async function machineSettings() {
  const { data, error } = await adminClient()
    .from("app_settings")
    .select("key,value")
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
  return parseSettings(data ?? []);
}
export async function finishEvent(
  event: Webhook,
  status: string,
  errorCode: string | null,
  next: string | null,
  result: Json,
) {
  const { error } = await adminClient()
    .rpc("finish_webhook", {
      p_id: event.id,
      p_claim: event.claim_id!,
      p_status: status,
      p_error: errorCode!,
      p_retry: next!,
      p_result: result,
    })
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
}
export async function startJob(
  key: string,
  trigger: "manual" | "schedule",
  correlation: string,
) {
  const { data, error } = await adminClient()
    .rpc("start_job", {
      p_key: key,
      p_trigger: trigger,
      p_correlation: correlation,
    })
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
  return data;
}
export async function finishRun(
  id: string,
  status: string,
  read: number,
  written: number,
  failed: number,
  errorCode: string | null,
  cursor: string | null,
) {
  const { error } = await adminClient()
    .rpc("finish_integration_run", {
      p_id: id,
      p_status: status,
      p_read: read,
      p_written: written,
      p_failed: failed,
      p_error: errorCode!,
      p_cursor: cursor!,
    })
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
}
export async function retry(id: string) {
  const { data, error } = await adminClient()
    .rpc("retry_webhook", { p_id: id })
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
  return data;
}
export async function dueExists() {
  const { count, error } = await adminClient()
    .from("webhook_events")
    .select("id", { count: "exact", head: true })
    .in("status", ["received", "failed", "processing"])
    .lte("next_retry_at", new Date().toISOString())
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
  return Boolean(count);
}
export async function runRetention() {
  const { data, error } = await adminClient()
    .rpc("run_retention")
    .abortSignal(AbortSignal.timeout(10000));
  check(error);
  return data as unknown as {
    payloads_cleared: number;
    runs_pruned: number;
  };
}
export async function dashboard(
  page: number,
  status?: string,
  trigger?: string,
) {
  const client = await serverClient();
  let runsQuery = client
    .from("integration_runs")
    .select("*", { count: "exact" })
    .order("started_at", { ascending: false })
    .order("id")
    .range(page * 20, page * 20 + 19);
  if (status) runsQuery = runsQuery.eq("status", status);
  if (trigger) runsQuery = runsQuery.eq("trigger", trigger);
  const [runs, dead, states, rejected] = await Promise.all([
    runsQuery,
    client
      .from("webhook_events")
      .select("id,source,attempts,last_error,correlation_id,received_at", {
        count: "exact",
      })
      .eq("status", "dead_letter")
      .order("received_at", { ascending: false })
      .range(page * 20, page * 20 + 19),
    client
      .from("sync_state")
      .select("*")
      .in("integration", ["jobs", "lead_ingest"]),
    client
      .from("webhook_events")
      .select("id,source,last_error,correlation_id,received_at", {
        count: "exact",
      })
      .eq("status", "rejected")
      .order("received_at", { ascending: false })
      .range(page * 20, page * 20 + 19),
  ]);
  for (const r of [runs, dead, states, rejected]) check(r.error);
  return {
    runs: runs.data ?? [],
    total: runs.count ?? 0,
    dead: dead.data ?? [],
    deadTotal: dead.count ?? 0,
    states: states.data ?? [],
    rejected: rejected.data ?? [],
    rejectedTotal: rejected.count ?? 0,
  };
}
export async function reachable() {
  const { error } = await adminClient()
    .from("app_settings")
    .select("key")
    .limit(1)
    .abortSignal(AbortSignal.timeout(3000));
  return !error;
}
