import "server-only";
import { adminClient } from "@/lib/supabase/server-admin";
import { serverClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.generated";
import type { MetaAccount, AdMetricInput } from "@/integrations/meta/transform";
function check(error: unknown) {
  if (error) throw new Error("META_STORAGE_FAILED");
}
export async function cancelRange(run: string) {
  const { error } = await adminClient()
    .rpc("cancel_meta_range", { p_run: run })
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
}
export async function metaState(machine = true) {
  const client = machine ? adminClient() : await serverClient();
  const { data, error } = await client
    .from("sync_state")
    .select("*")
    .eq("integration", "meta")
    .eq("resource", "ingest")
    .abortSignal(AbortSignal.timeout(3000))
    .maybeSingle();
  check(error);
  return data;
}
export async function commitPage(
  run: string,
  account: MetaAccount,
  rows: AdMetricInput[],
  cursor: string | null,
  complete: boolean,
) {
  const { data, error } = await adminClient()
    .rpc("commit_meta_page", {
      p_run: run,
      p_account: account,
      p_rows: rows,
      p_cursor: cursor!,
      p_resource: "ingest",
      p_complete: complete,
    })
    .abortSignal(AbortSignal.timeout(4000));
  check(error);
  return data ?? 0;
}
export async function markFailure(run: string, code: string) {
  const { error } = await adminClient()
    .rpc("record_meta_failure", { p_run: run, p_code: code })
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
}
export async function saveTokenMetadata(value: Json) {
  const { error } = await adminClient()
    .from("app_settings")
    .update({ value })
    .eq("key", "meta.token_metadata")
    .abortSignal(AbortSignal.timeout(3000));
  check(error);
}
export async function metaHealthData(machine = false) {
  const client = machine ? adminClient() : await serverClient();
  const [accounts, state, metadata, names] = await Promise.all([
    client.from("ad_accounts").select("name,currency,timezone,is_active"),
    metaState(machine),
    client
      .from("app_settings")
      .select("value")
      .eq("key", "meta.token_metadata")
      .maybeSingle(),
    client.rpc("meta_health_facts"),
  ]);
  check(accounts.error);
  check(metadata.error);
  check(names.error);
  return {
    accounts: accounts.data ?? [],
    state,
    token: metadata.data?.value ?? null,
    facts: names.data,
  };
}
export async function saveResultType(value: string | null) {
  const { error } = await (
    await serverClient()
  )
    .from("app_settings")
    .update({ value })
    .eq("key", "meta.primary_result_type")
    .select("key")
    .single();
  check(error);
}
export async function performanceFacts(
  from: string,
  to: string,
  previous: string,
) {
  const { data, error } = await (
    await serverClient()
  ).rpc("performance_facts", { p_from: from, p_to: to, p_previous: previous });
  check(error);
  return data;
}
