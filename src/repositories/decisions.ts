import "server-only";
import { adminClient } from "@/lib/supabase/server-admin";
import { serverClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.generated";
function check(error: unknown) {
  if (error) throw new Error("DECISION_STORAGE_FAILED");
}
export async function state() {
  const { data, error } = await adminClient()
    .from("sync_state")
    .select("cursor")
    .eq("integration", "decisions")
    .eq("resource", "evaluation")
    .maybeSingle();
  check(error);
  return data?.cursor ?? null;
}
export async function facts(from: string, to: string) {
  // ponytail: 10,000 groups per fact family; page the projection when this workspace ceiling is reached.
  const { data, error } = await adminClient()
    .rpc("decision_facts", { p_from: from, p_to: to })
    .abortSignal(AbortSignal.timeout(5000));
  check(error);
  return data;
}
export async function commit(run: string, rows: Json[], cursor: string | null) {
  const { data, error } = await adminClient()
    .rpc("commit_decisions", { p_run: run, p_rows: rows, p_cursor: cursor! })
    .abortSignal(AbortSignal.timeout(5000));
  check(error);
  return data ?? 0;
}
export async function action(
  id: string,
  revision: string,
  operation: string,
  reason: string,
  until: string,
  actor: string,
) {
  const { error } = await adminClient().rpc("decision_action", {
    p_id: id,
    p_revision: revision,
    p_operation: operation,
    p_reason: reason,
    p_until: until,
    p_actor: actor,
  });
  check(error);
}
export async function actions(machine = false, includeResolved = false) {
  const client = machine ? adminClient() : await serverClient();
  const rows = [];
  const deadline = Date.now() + 10000;
  for (let offset = 0; ; offset += 500) {
    if (Date.now() > deadline) throw new Error("DECISION_READ_BUDGET_EXCEEDED");
    let query = client
      .from("alerts")
      .select("*")
      .eq("source", "decisions")
      .order("id")
      .range(offset, offset + 499);
    if (!includeResolved) query = query.neq("status", "resolved");
    const { data, error } = await query.abortSignal(AbortSignal.timeout(3000));
    check(error);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 500) return rows;
    if (rows.length >= 10000) throw new Error("DECISION_ACTION_LIMIT_EXCEEDED");
  }
}
export async function history(scope: string, page: number) {
  const client = await serverClient();
  let query = client
    .from("rule_evaluations")
    .select("*", { count: "exact" })
    .eq("scope_type", "campaign");
  if (scope) query = query.eq("scope_id", scope);
  const { data, error, count } = await query
    .order("evaluated_at", { ascending: false })
    .order("id")
    .range(page * 20, page * 20 + 19);
  check(error);
  return { rows: data ?? [], total: count ?? 0 };
}
export async function saveThreshold(key: string, value: Json) {
  const { error } = await (
    await serverClient()
  )
    .from("app_settings")
    .update({ value })
    .eq("key", key)
    .select("key")
    .single();
  check(error);
}
