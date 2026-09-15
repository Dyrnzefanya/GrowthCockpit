import "server-only";
import { adminClient } from "@/lib/supabase/server-admin";
import { serverClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database.generated";

export type Report = Database["public"]["Tables"]["reports"]["Row"];

function fail(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === "40001") throw new Error("CONFLICT");
  if (error.message?.includes("FINAL_REPORT_IMMUTABLE"))
    throw new Error("FINAL_REPORT_IMMUTABLE");
  throw new Error("INTERNAL");
}

async function cohortRows(from: string, to: string) {
  const client = adminClient(),
    rows = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await client
      .from("vw_funnel_daily")
      .select("*")
      .gte("inquiry_date", from)
      .lte("inquiry_date", to)
      .order("inquiry_date")
      .order("platform")
      .order("lt_campaign")
      .order("currency")
      .range(offset, offset + 999)
      .abortSignal(AbortSignal.timeout(3000));
    fail(result.error);
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 1000) break;
    // ponytail: 10k grouped rows bound one report run; page the snapshot if real usage reaches it.
    if (rows.length >= 10000) throw new Error("REPORT_FACT_LIMIT_EXCEEDED");
  }
  return rows;
}

export async function reportInputs(
  start: string,
  end: string,
  previousStart: string,
) {
  const client = adminClient();
  const [performance, cohort, experiments, workflows, notes, alerts, states] =
    await Promise.all([
      client
        .rpc("performance_facts", {
          p_from: start,
          p_to: end,
          p_previous: previousStart,
        })
        .abortSignal(AbortSignal.timeout(4000)),
      cohortRows(previousStart, end),
      client
        .from("experiments")
        .select(
          "code,title,status,start_date,end_date,review_date,experiment_results(outcome,learning,next_action)",
        )
        .in("status", ["running", "completed"])
        .lte("start_date", end)
        .order("code")
        .limit(1000)
        .abortSignal(AbortSignal.timeout(3000)),
      client
        .from("workflow_runs")
        .select("id,status,run_date,workflow_items(required_snapshot,is_done)")
        .gte("run_date", start)
        .lte("run_date", end)
        .order("run_date")
        .limit(1000)
        .abortSignal(AbortSignal.timeout(3000)),
      client
        .from("notes")
        .select("note_date,body")
        .gte("note_date", start)
        .lte("note_date", end)
        .order("note_date")
        .order("created_at")
        .limit(1000)
        .abortSignal(AbortSignal.timeout(3000)),
      client
        .from("alerts")
        .select("severity,title,message,source,evidence,last_seen_at")
        .neq("status", "resolved")
        .order("severity")
        .order("last_seen_at", { ascending: false })
        .limit(1000)
        .abortSignal(AbortSignal.timeout(3000)),
      client
        .from("sync_state")
        .select("integration,resource,last_success_at,last_error,cursor")
        .order("integration")
        .order("resource")
        .limit(1000)
        .abortSignal(AbortSignal.timeout(3000)),
    ]);
  fail(performance.error);
  for (const result of [experiments, workflows, notes, alerts, states])
    fail(result.error);
  return {
    performance: performance.data,
    cohort,
    experiments: experiments.data ?? [],
    workflows: workflows.data ?? [],
    notes: notes.data ?? [],
    alerts: alerts.data ?? [],
    states: states.data ?? [],
  };
}

export async function listReports(page: number) {
  const { data, error, count } = await (
    await serverClient()
  )
    .from("reports")
    .select("*", { count: "exact" })
    .eq("type", "weekly")
    .order("period_start", { ascending: false })
    .order("version", { ascending: false })
    .range(page * 20, page * 20 + 19);
  fail(error);
  return { reports: data ?? [], total: count ?? 0 };
}

export async function readReport(id: string) {
  const { data, error } = await (
    await serverClient()
  )
    .from("reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  fail(error);
  return data;
}

export async function firstOwnerId() {
  const { data, error } = await adminClient()
    .from("profiles")
    .select("id")
    .eq("role", "owner")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  fail(error);
  if (!data) throw new Error("REPORT_OWNER_UNAVAILABLE");
  return data.id;
}

export async function createDraft(
  start: string,
  end: string,
  facts: Json,
  narrative: string,
  actor: string,
) {
  const { data, error } = await adminClient()
    .rpc("create_weekly_report_draft", {
      p_start: start,
      p_end: end,
      p_facts: facts,
      p_narrative: narrative,
      p_actor: actor,
    })
    .abortSignal(AbortSignal.timeout(3000));
  fail(error);
  return data!;
}

export async function saveNarrative(
  id: string,
  expected: string,
  narrative: string,
) {
  const { data, error } = await adminClient()
    .rpc("save_report_narrative", {
      p_id: id,
      p_expected: expected,
      p_narrative: narrative,
    })
    .abortSignal(AbortSignal.timeout(3000));
  fail(error);
  return data!;
}

export async function finalize(
  id: string,
  expected: string,
  narrative: string,
  actor: string,
) {
  const { data, error } = await adminClient()
    .rpc("finalize_report", {
      p_id: id,
      p_expected: expected,
      p_narrative: narrative,
      p_actor: actor,
    })
    .abortSignal(AbortSignal.timeout(3000));
  fail(error);
  return data!;
}
