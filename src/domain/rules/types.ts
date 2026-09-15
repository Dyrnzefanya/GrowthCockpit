export const RULE_VERSION = "r1";
export type Verdict =
  | "MONITOR"
  | "INVESTIGATE"
  | "HOLD"
  | "SCALE_CANDIDATE"
  | "PAUSE_CANDIDATE"
  | "SUPPRESSED";
export type RuleKey =
  `R-${"00" | "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10"}`;
export type Scope = "campaign" | "lead" | "experiment" | "integration";
export type Settings = {
  targetCpql: number | null;
  currency: string | null;
  frequency: number | null;
  minResults: number;
  minCoverage: number;
  minOutcome: number;
  maturityDays: number;
  cplRise: number;
  cpqlFall: number;
  qualityFall: number;
  ctrFall: number;
};
export type Input = {
  scope: Scope;
  id: string;
  label: string;
  window: {
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    qualityFrom: string;
    qualityTo: string;
    qualityPreviousFrom: string;
    qualityPreviousTo: string;
  };
  missing: string[];
  sources: { name: string; at: string | null; slaHours: number }[];
  coverage: number | null;
  currency: string | null;
  mixedCurrency: boolean;
  spend: number | null;
  recentSpend: number | null;
  pipelineValue?: number | null;
  leads: number | null;
  mql: number | null;
  sql: number | null;
  cpl: number | null;
  cpql: number | null;
  mqlRate: number | null;
  priorCpl: number | null;
  priorCpql: number | null;
  priorMqlRate: number | null;
  sample: number | null;
  completeDays: number;
  dailyCpql: (number | null)[];
  leadGen: boolean | null;
  noLeadHours: number | null;
  outcomeCompleteness: number | null;
  frequency: number | null;
  ctr: number | null;
  priorCtr: number | null;
  staleWorkdays: number | null;
  followUpSla: number | null;
  reviewDate: string | null;
  running: boolean;
  today: string;
  experiments: { id: string; code: string; status: string }[];
};
export type Result = {
  verdict: Verdict;
  matched: boolean;
  condition: string;
  action: string;
  limitations: string[];
};
export type Rule = (input: Input, settings: Settings, clock: number) => Result;
export type Evaluation = Result & {
  rule: RuleKey;
  version: string;
  severity: "critical" | "warning" | "info";
  surfaced: boolean;
  precedence: string | null;
};
export function result(
  verdict: Verdict,
  matched: boolean,
  condition: string,
  action = "Pantau pada evaluasi berikutnya.",
  limitations: string[] = [],
): Result {
  return { verdict, matched, condition, action, limitations };
}
export const missing = (condition: string) =>
  result(
    "SUPPRESSED",
    false,
    condition,
    "Lengkapi input yang disebutkan sebelum mengevaluasi aturan ini.",
  );
export const quiet = (condition = "Kondisi aturan tidak terpenuhi.") =>
  result("MONITOR", false, condition);
export function changed(
  current: number | null,
  prior: number | null,
  fraction: number,
  direction: "up" | "down",
) {
  return (
    current !== null &&
    prior !== null &&
    prior > 0 &&
    (direction === "up"
      ? current >= prior * (1 + fraction)
      : current <= prior * (1 - fraction))
  );
}
