import { r00 } from "./r00";
import { r01 } from "./r01";
import { r02 } from "./r02";
import { r03 } from "./r03";
import { r04 } from "./r04";
import { r05 } from "./r05";
import { r06 } from "./r06";
import { r07 } from "./r07";
import { r08 } from "./r08";
import { r09 } from "./r09";
import { r10 } from "./r10";
import {
  RULE_VERSION,
  missing,
  type Rule,
  type RuleKey,
  type Input,
  type Settings,
  type Evaluation,
} from "./types";
export const registry: Record<RuleKey, Rule> = {
  "R-00": r00,
  "R-01": r01,
  "R-02": r02,
  "R-03": r03,
  "R-04": r04,
  "R-05": r05,
  "R-06": r06,
  "R-07": r07,
  "R-08": r08,
  "R-09": r09,
  "R-10": r10,
};
export function evaluate(
  input: Input,
  settings: Settings,
  clock: number,
  rules = registry,
): Evaluation[] {
  const keys: RuleKey[] =
    input.scope === "lead"
      ? ["R-07"]
      : input.scope === "experiment"
        ? ["R-08"]
        : input.scope === "integration"
          ? ["R-00"]
          : [
              "R-00",
              "R-01",
              "R-06",
              "R-02",
              "R-03",
              "R-04",
              "R-05",
              "R-09",
              "R-10",
            ];
  const rows = keys.map((rule): Evaluation => {
    let outcome;
    try {
      outcome = rules[rule](input, settings, clock);
    } catch {
      outcome = missing(
        "EVALUATION_ERROR: aturan gagal; periksa riwayat evaluasi.",
      );
    }
    return {
      ...outcome,
      rule,
      version: RULE_VERSION,
      severity:
        rule === "R-06"
          ? "critical"
          : ["INVESTIGATE", "SUPPRESSED", "PAUSE_CANDIDATE"].includes(
                outcome.verdict,
              )
            ? "warning"
            : "info",
      surfaced: outcome.matched,
      precedence: null,
    };
  });
  const gate = rows.find(
      (r) => r.rule === "R-00" && r.verdict === "SUPPRESSED",
    ),
    sample = rows.find((r) => r.rule === "R-01" && r.matched),
    tracking = rows.find((r) => r.rule === "R-06" && r.matched);
  for (const row of rows) {
    if (gate && row.rule !== "R-00") {
      row.verdict = "SUPPRESSED";
      row.surfaced = false;
      row.action = gate.action;
      row.precedence = "R-00: " + gate.condition;
    } else if (
      sample &&
      ["SCALE_CANDIDATE", "PAUSE_CANDIDATE"].includes(row.verdict)
    ) {
      row.verdict = "MONITOR";
      row.surfaced = false;
      row.action = sample.action;
      row.precedence = "R-01: sampel tidak cukup";
    } else if (
      tracking &&
      ["R-02", "R-03", "R-04", "R-05"].includes(row.rule)
    ) {
      row.surfaced = false;
      row.verdict = "SUPPRESSED";
      row.action = tracking.action;
      row.precedence = "R-06: periksa tracking terlebih dahulu";
    }
  }
  const quality = rows.find(
    (r) => r.surfaced && ["R-03", "R-04", "R-10"].includes(r.rule),
  );
  if (quality)
    for (const row of rows)
      if (row.rule === "R-05" && row.surfaced) {
        row.surfaced = false;
        row.verdict = "SUPPRESSED";
        row.action = quality.action;
        row.precedence = "Quality diagnosis mendahului scale";
      }
  return rows;
}
