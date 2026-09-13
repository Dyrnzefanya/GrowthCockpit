import "server-only";
import { z } from "zod";
import { can } from "@/lib/auth/can";
import { requireUser } from "@/services/session";
import { readSettings } from "@/repositories/settings";
import {
  commitExperimentTransition,
  createExperiment,
  readExperiment,
  readExperiments,
  readLearningFacets,
  readLearnings,
  readReviewQueue,
  updateDraftExperiment,
} from "@/repositories/experiments";
import {
  completionInputSchema,
  experimentFiltersSchema,
  experimentInputSchema,
  externalRefsSchema,
  learningFiltersSchema,
  transitionInputSchema,
} from "@/config/experiment-schema";
import {
  assertTransition,
  durationWarning,
  orderBacklog,
  priorityScore,
  sampleEvidence,
  timing,
  type ExperimentStatus,
} from "@/domain/experiments/state";
import { shiftDate, toJakartaDate } from "@/domain/dates";
import type { Json } from "@/types/database.generated";

type Search = Record<string, string | string[] | undefined>;

function refs(value: ReturnType<typeof externalRefsSchema.parse>): Json {
  return {
    ...(value.campaignId && { campaign_id: value.campaignId }),
    ...(value.adsetId && { adset_id: value.adsetId }),
    ...(value.adId && { ad_id: value.adId }),
    ...(value.landingPageUrl && { landing_page_url: value.landingPageUrl }),
  };
}

export async function experimentDefaults() {
  await requireUser();
  const settings = await readSettings();
  const today = toJakartaDate(new Date());
  return {
    today,
    reviewDate: shiftDate(
      today,
      settings.values["experiments.min_duration_days"],
    ),
    minimumDays: settings.values["experiments.min_duration_days"],
    minimumResults: settings.values["metrics.min_results_for_verdict"],
  };
}

export async function experimentLibrary(search: Search) {
  await requireUser();
  const filters = experimentFiltersSchema.parse(search);
  const result = await readExperiments(filters.status);
  const today = toJakartaDate(new Date());
  const decorated = result.experiments.map((experiment) => ({
    ...experiment,
    score: priorityScore(
      experiment.priority,
      experiment.confidence,
      experiment.effort,
    ),
    timing:
      experiment.status === "running"
        ? timing(experiment.start_date, experiment.review_date, today)
        : null,
  }));
  const ordered =
    filters.status === "draft"
      ? orderBacklog(decorated)
      : decorated.sort(
          (left, right) =>
            left.review_date.localeCompare(right.review_date) ||
            left.code.localeCompare(right.code),
        );
  return {
    filters,
    experiments: ordered.slice(filters.page * 20, filters.page * 20 + 20),
    total: result.total,
  };
}

export async function experimentDetail(id: string) {
  await requireUser();
  const validId = z.uuid().parse(id);
  const [experiment, defaults] = await Promise.all([
    readExperiment(validId),
    experimentDefaults(),
  ]);
  return experiment ? { experiment, defaults } : null;
}

export async function saveExperiment(value: unknown) {
  await requireUser();
  if (!(await can("experiment:write"))) throw new Error("FORBIDDEN");
  const input = experimentInputSchema.parse(value);
  const values = {
    title: input.title,
    hypothesis: input.hypothesis,
    variable: input.variable,
    primaryKpi: input.primaryKpi,
    startDate: input.startDate,
    reviewDate: input.reviewDate,
    controlDescription: input.controlDescription,
    variantDescription: input.variantDescription,
    secondaryKpi: input.secondaryKpi,
    baselineValue: input.baselineValue,
    targetValue: input.targetValue,
    priority: input.priority,
    confidence: input.confidence,
    effort: input.effort,
    platform: input.platform,
    externalRefs: refs(input.externalRefs),
  };
  if (input.id) {
    if (!input.revision) throw new Error("CONFLICT");
    await updateDraftExperiment(input.id, input.revision, values);
    return input.id;
  }
  return createExperiment(values);
}

export async function transitionExperiment(value: unknown) {
  await requireUser();
  if (!(await can("experiment:write"))) throw new Error("FORBIDDEN");
  const input = transitionInputSchema.parse(value);
  const current = await readExperiment(input.id);
  if (!current || current.updated_at !== input.revision)
    throw new Error("CONFLICT");
  const from = current.status as ExperimentStatus;
  if (from !== input.from) throw new Error("CONFLICT");
  assertTransition(from, input.to);
  await commitExperimentTransition({
    id: input.id,
    revision: input.revision,
    to: input.to,
    endDate: toJakartaDate(new Date()),
  });
}

export async function completeExperiment(value: unknown) {
  await requireUser();
  if (!(await can("experiment:write"))) throw new Error("FORBIDDEN");
  const input = completionInputSchema.parse(value);
  const [current, settings] = await Promise.all([
    readExperiment(input.id),
    readSettings(),
  ]);
  if (!current || current.updated_at !== input.revision)
    throw new Error("CONFLICT");
  const from = current.status as ExperimentStatus;
  if (from !== input.from) throw new Error("CONFLICT");
  assertTransition(from, "completed");
  const evidence = sampleEvidence(
    input.observedResults,
    settings.values["metrics.min_results_for_verdict"],
  );
  await commitExperimentTransition({
    id: input.id,
    revision: input.revision,
    to: "completed",
    endDate: toJakartaDate(new Date()),
    outcome: input.outcome,
    primaryKpiResult: input.primaryKpiResult,
    evidence,
    conclusion: input.conclusion,
    learning: input.learning,
    nextAction: input.nextAction,
  });
  return evidence;
}

export async function learningLibrary(search: Search) {
  await requireUser();
  const filters = learningFiltersSchema.parse(search);
  const [result, facetRows] = await Promise.all([
    readLearnings({
      query: filters.q,
      variable: filters.variable,
      kpi: filters.kpi,
      outcome: filters.outcome,
      page: filters.page,
    }),
    readLearningFacets(),
  ]);
  return {
    ...result,
    filters,
    variables: [
      ...new Set(facetRows.map((row) => row.experiments.variable)),
    ].sort(),
    kpis: [
      ...new Set(facetRows.map((row) => row.experiments.primary_kpi)),
    ].sort(),
  };
}

export async function experimentReviewQueue(today: string) {
  await requireUser();
  return readReviewQueue(today);
}

export function experimentWarnings(
  startDate: string,
  reviewDate: string,
  minimumDays: number,
) {
  return durationWarning(startDate, reviewDate, minimumDays);
}
