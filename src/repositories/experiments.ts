import "server-only";
import { serverClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database.generated";

type Tables = Database["public"]["Tables"];
export type Experiment = Tables["experiments"]["Row"];
export type ExperimentResult = Tables["experiment_results"]["Row"];

function fail(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === "40001") throw new Error("CONFLICT");
  if (error.message?.includes("BUSINESS_RULE_REJECTED"))
    throw new Error(error.message);
  throw new Error("INTERNAL");
}

export async function readExperiments(status: string) {
  const { data, error, count } = await (
    await serverClient()
  )
    .from("experiments")
    .select("*", { count: "exact" })
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(500);
  fail(error);
  return { experiments: data ?? [], total: count ?? 0 };
}

export async function readExperiment(id: string) {
  const { data, error } = await (
    await serverClient()
  )
    .from("experiments")
    .select("*,experiment_results(*)")
    .abortSignal(new AbortController().signal)
    .eq("id", id)
    .maybeSingle();
  fail(error);
  return data;
}

export async function readReviewQueue(today: string) {
  const { data, error } = await (
    await serverClient()
  )
    .from("experiments")
    .select("*")
    .eq("status", "running")
    .lte("review_date", today)
    .order("review_date")
    .limit(20);
  fail(error);
  return data ?? [];
}

export async function readLearningFacets() {
  const { data, error } = await (
    await serverClient()
  )
    .from("experiment_results")
    .select("outcome,experiments!inner(variable,primary_kpi)")
    .order("decided_at", { ascending: false })
    .limit(500);
  fail(error);
  return data ?? [];
}

export async function readLearnings(input: {
  query?: string;
  variable?: string;
  kpi?: string;
  outcome?: string;
  page: number;
}) {
  const client = await serverClient();
  let query = client
    .from("experiment_results")
    .select("*,experiments!inner(*)", { count: "exact" })
    .eq("experiments.status", "completed")
    .order("decided_at", { ascending: false })
    .range(input.page * 20, input.page * 20 + 19);
  if (input.query)
    query = query.textSearch("search_vector", input.query, {
      type: "websearch",
      config: "simple",
    });
  if (input.variable) query = query.eq("experiments.variable", input.variable);
  if (input.kpi) query = query.eq("experiments.primary_kpi", input.kpi);
  if (input.outcome) query = query.eq("outcome", input.outcome);
  const { data, error, count } = await query;
  fail(error);
  return { learnings: data ?? [], total: count ?? 0 };
}

export async function createExperiment(values: {
  title: string;
  hypothesis: string;
  variable: string;
  primaryKpi: string;
  startDate: string;
  reviewDate: string;
  controlDescription: string;
  variantDescription: string;
  secondaryKpi?: string;
  baselineValue?: number;
  targetValue?: number;
  priority: number;
  confidence: number;
  effort: number;
  platform?: string;
  externalRefs: Json;
}) {
  const { data, error } = await (
    await serverClient()
  ).rpc("create_experiment", {
    p_title: values.title,
    p_hypothesis: values.hypothesis,
    p_variable: values.variable,
    p_primary_kpi: values.primaryKpi,
    p_start_date: values.startDate,
    p_review_date: values.reviewDate,
    p_control_description: values.controlDescription,
    p_variant_description: values.variantDescription,
    ...(values.secondaryKpi && { p_secondary_kpi: values.secondaryKpi }),
    ...(values.baselineValue !== undefined && {
      p_baseline_value: values.baselineValue,
    }),
    ...(values.targetValue !== undefined && {
      p_target_value: values.targetValue,
    }),
    p_priority: values.priority,
    p_confidence: values.confidence,
    p_effort: values.effort,
    ...(values.platform && { p_platform: values.platform }),
    p_external_refs: values.externalRefs,
  });
  fail(error);
  return data!;
}

export async function updateDraftExperiment(
  id: string,
  revision: string,
  values: Parameters<typeof createExperiment>[0],
) {
  const { error } = await (
    await serverClient()
  ).rpc("update_draft_experiment", {
    p_id: id,
    p_expected: revision,
    p_title: values.title,
    p_hypothesis: values.hypothesis,
    p_variable: values.variable,
    p_primary_kpi: values.primaryKpi,
    p_start_date: values.startDate,
    p_review_date: values.reviewDate,
    p_control_description: values.controlDescription,
    p_variant_description: values.variantDescription,
    ...(values.secondaryKpi && { p_secondary_kpi: values.secondaryKpi }),
    ...(values.baselineValue !== undefined && {
      p_baseline_value: values.baselineValue,
    }),
    ...(values.targetValue !== undefined && {
      p_target_value: values.targetValue,
    }),
    p_priority: values.priority,
    p_confidence: values.confidence,
    p_effort: values.effort,
    ...(values.platform && { p_platform: values.platform }),
    p_external_refs: values.externalRefs,
  });
  fail(error);
}

export async function commitExperimentTransition(input: {
  id: string;
  revision: string;
  to: string;
  endDate: string;
  outcome?: string;
  primaryKpiResult?: number;
  evidence?: Json;
  conclusion?: string;
  learning?: string;
  nextAction?: string;
}) {
  const { error } = await (
    await serverClient()
  ).rpc("transition_experiment", {
    p_id: input.id,
    p_expected: input.revision,
    p_to: input.to,
    p_end_date: input.endDate,
    ...(input.outcome && { p_outcome: input.outcome }),
    ...(input.primaryKpiResult !== undefined && {
      p_primary_kpi_result: input.primaryKpiResult,
    }),
    ...(input.evidence && { p_evidence: input.evidence }),
    ...(input.conclusion && { p_conclusion: input.conclusion }),
    ...(input.learning && { p_learning: input.learning }),
    ...(input.nextAction && { p_next_action: input.nextAction }),
  });
  fail(error);
}
