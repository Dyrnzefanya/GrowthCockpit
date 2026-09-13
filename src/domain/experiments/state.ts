import { shiftDate } from "@/domain/dates";

export const experimentStatuses = [
  "draft",
  "running",
  "completed",
  "cancelled",
] as const;
export type ExperimentStatus = (typeof experimentStatuses)[number];

export const outcomes = ["win", "lose", "inconclusive"] as const;
export type ExperimentOutcome = (typeof outcomes)[number];

export const transitions: Record<ExperimentStatus, ExperimentStatus[]> = {
  draft: ["running", "cancelled"],
  running: ["completed", "cancelled"],
  completed: ["cancelled"],
  cancelled: [],
};

export function assertTransition(from: ExperimentStatus, to: ExperimentStatus) {
  const allowed = transitions[from];
  if (!allowed.includes(to))
    throw new Error(
      `BUSINESS_RULE_REJECTED: allowed ${allowed.length ? allowed.join(", ") : "none"}`,
    );
}

export function priorityScore(
  priority: number,
  confidence: number,
  effort: number,
) {
  return Math.round(((priority * confidence) / effort) * 100) / 100;
}

export function orderBacklog<
  T extends {
    priority: number;
    confidence: number;
    effort: number;
    created_at: string;
    code: string;
  },
>(experiments: T[]) {
  return [...experiments].sort(
    (left, right) =>
      priorityScore(right.priority, right.confidence, right.effort) -
        priorityScore(left.priority, left.confidence, left.effort) ||
      left.created_at.localeCompare(right.created_at) ||
      left.code.localeCompare(right.code),
  );
}

export function daysBetween(start: string, end: string) {
  shiftDate(start, 0);
  shiftDate(end, 0);
  return (
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
    86_400_000
  );
}

export function durationWarning(
  startDate: string,
  reviewDate: string,
  minimumDays: number,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reviewDate)
  )
    return null;
  const duration = daysBetween(startDate, reviewDate);
  return duration < minimumDays
    ? `Jendela uji ${duration} hari; minimum yang dikonfigurasi ${minimumDays} hari.`
    : null;
}

export function sampleEvidence(observed: number, minimum: number) {
  const insufficient = observed < minimum;
  return {
    observed_results: observed,
    minimum_results: minimum,
    sample_warning: insufficient,
    verdict_label: insufficient
      ? "inconclusive_by_default"
      : "operator_outcome",
  } as const;
}

export function timing(startDate: string, reviewDate: string, today: string) {
  return {
    elapsedDays: Math.max(0, daysBetween(startDate, today)),
    daysUntilReview: daysBetween(today, reviewDate),
  };
}
