import "server-only";
import { serverClient } from "@/lib/supabase/server";
import { templateSchema } from "@/config/workflow-schema";
import type { Database } from "@/types/database.generated";
import type { Step } from "@/domain/workflows";
type Tables = Database["public"]["Tables"];
export type WorkflowItem = Tables["workflow_items"]["Row"];
export type WorkflowRun = Tables["workflow_runs"]["Row"] & {
  workflow_items: WorkflowItem[];
};
export type WorkflowTemplate = Omit<
  Tables["workflow_templates"]["Row"],
  "steps" | "cadence"
> & { steps: Step[]; cadence: "daily" | "weekly" | "monthly" };
function fail(error: { code?: string } | null) {
  if (error) throw new Error(error.code === "40001" ? "CONFLICT" : "INTERNAL");
}
export async function readTemplates(): Promise<WorkflowTemplate[]> {
  const { data, error } = await (
    await serverClient()
  )
    .from("workflow_templates")
    .select("*")
    // These reads participate in write/retry flows; never memoize an earlier revision.
    .abortSignal(new AbortController().signal)
    .order("created_at");
  fail(error);
  return (data ?? []).map((row) => ({
    ...row,
    ...templateSchema.parse(row),
    id: row.id,
    version: row.version,
  }));
}
export async function readRuns(date: string): Promise<WorkflowRun[]> {
  const { data, error } = await (
    await serverClient()
  )
    .from("workflow_runs")
    .select("*,workflow_items(*)")
    .abortSignal(new AbortController().signal)
    .eq("run_date", date)
    .order("created_at")
    .order("position", { referencedTable: "workflow_items" });
  fail(error);
  return data ?? [];
}
export async function readRun(id: string): Promise<WorkflowRun> {
  const { data, error } = await (
    await serverClient()
  )
    .from("workflow_runs")
    .select("*,workflow_items(*)")
    .abortSignal(new AbortController().signal)
    .eq("id", id)
    .order("position", { referencedTable: "workflow_items" })
    .single();
  fail(error);
  if (!data) throw new Error("NOT_FOUND");
  return data;
}
export async function readHistory(
  start: string,
  end: string,
  page: number,
  sort = "run_date",
  ascending = false,
) {
  const { data, error, count } = await (
    await serverClient()
  )
    .from("workflow_runs")
    .select("*,workflow_items(*)", { count: "exact" })
    .gte("run_date", start)
    .lte("run_date", end)
    .order(sort, { ascending })
    .order("id")
    .range(page * 10, page * 10 + 9)
    .order("position", { referencedTable: "workflow_items" });
  fail(error);
  return { runs: data ?? [], total: count ?? 0 };
}
export async function insertRun(
  template: WorkflowTemplate,
  date: string,
  items: (Step & { position: number })[],
) {
  const { error } = await (
    await serverClient()
  ).rpc("materialize_workflow", {
    p_template_id: template.id,
    p_version: template.version,
    p_date: date,
    p_items: items,
  });
  fail(error);
}
export async function commitItem(
  run: WorkflowRun,
  item: WorkflowItem,
  status: string,
  times: { started_at: string | null; completed_at: string | null },
) {
  // Generated RPC args omit SQL nullability. Assertions change types only; SQL receives null.
  const { error } = await (
    await serverClient()
  ).rpc("commit_workflow_item", {
    p_run_id: run.id,
    p_expected: run.updated_at,
    p_item_id: item.id,
    p_done: item.is_done,
    p_item_completed: item.completed_at!,
    p_note: item.notes,
    p_status: status,
    p_started: times.started_at!,
    p_completed: times.completed_at!,
  });
  fail(error);
}
export async function writeTemplate(
  input: ReturnType<typeof templateSchema.parse>,
) {
  const client = await serverClient();
  const { id, version, ...values } = input;
  if (id) {
    const { data, error } = await client
      .from("workflow_templates")
      .update({ ...values, version: (version ?? 0) + 1 })
      .eq("id", id)
      .eq("version", version ?? 0)
      .select("id")
      .maybeSingle();
    fail(error);
    if (!data) throw new Error("CONFLICT");
  } else {
    const { error } = await client.from("workflow_templates").insert(values);
    fail(error);
  }
}
