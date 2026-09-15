import { z } from "zod";
export const decisionShape = {
  "rules.target_cpql": z.number().positive().max(1e12).nullable(),
  "rules.currency": z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullable(),
  "rules.frequency": z.number().positive().max(100).nullable(),
  "rules.lead_gen_campaigns": z.array(z.string().min(1).max(200)).max(1000),
  "rules.cpl_rise": z.number().min(0.01).max(5),
  "rules.cpql_fall": z.number().min(0.01).max(1),
  "rules.quality_fall": z.number().min(0.01).max(1),
  "rules.ctr_fall": z.number().min(0.01).max(1),
};
export const decisionDefaults = {
  "rules.target_cpql": null,
  "rules.currency": null,
  "rules.frequency": null,
  "rules.lead_gen_campaigns": [],
  "rules.cpl_rise": 0.2,
  "rules.cpql_fall": 0.1,
  "rules.quality_fall": 0.25,
  "rules.ctr_fall": 0.25,
};
export const thresholdShape = {
  ...decisionShape,
  "health.min_coverage": z.number().min(0.01).max(1),
  "health.min_outcome_completeness": z.number().min(0.01).max(1),
  "metrics.min_results_for_verdict": z.number().int().min(1).max(10000),
  "metrics.cohort_maturity_days": z.number().int().min(1).max(365),
};
export const thresholdKeys = Object.keys(
  thresholdShape,
) as (keyof typeof thresholdShape)[];
export const thresholdKey = z.enum(
  thresholdKeys as [
    keyof typeof thresholdShape,
    ...(keyof typeof thresholdShape)[],
  ],
);
