import { z } from "zod";
import { decisionShape, decisionDefaults } from "./decision-schema";
export const qualificationKeys = [
  "qualification.min_quantity",
  "qualification.free_email_domains",
  "qualification.internal_domains",
  "qualification.competitor_domains",
] as const;
export const qualificationKey = z.enum(qualificationKeys);
export const settingsSchema = z.object({
  ...decisionShape,
  "meta.primary_result_type": z
    .string()
    .regex(/^[a-zA-Z0-9_.]+$/)
    .max(150)
    .nullable(),
  "meta.freshness_hours": z.number().int().min(1).max(168),
  "workspace.timezone": z.literal("Asia/Jakarta"),
  "qualification.min_quantity": z.number().int().positive(),
  "qualification.free_email_domains": z
    .array(z.string().trim().toLowerCase().max(254))
    .max(500),
  "qualification.internal_domains": z
    .array(z.string().trim().toLowerCase().max(254))
    .max(500),
  "qualification.competitor_domains": z
    .array(z.string().trim().toLowerCase().max(254))
    .max(500),
  "hubspot.write_lifecycle_stage": z.boolean(),
  "attribution.revenue_rule": z.enum([
    "lead_last_touch",
    "contact_first_touch",
    "split_50_50",
  ]),
  "health.min_coverage": z.number().min(0).max(1),
  "health.min_outcome_completeness": z.number().min(0).max(1),
  "metrics.min_results_for_verdict": z.number().int().positive(),
  "metrics.cohort_maturity_days": z.number().int().positive(),
  "experiments.min_duration_days": z.number().int().positive(),
  "jobs.max_batch": z.number().int().positive(),
  "jobs.max_attempts": z.number().int().positive(),
  "follow_up.mql_workdays": z.number().int().positive(),
  "follow_up.sql_workdays": z.number().int().positive(),
});
export const settingsDefaults: z.infer<typeof settingsSchema> = {
  ...decisionDefaults,
  "meta.primary_result_type": null,
  "meta.freshness_hours": 24,
  "workspace.timezone": "Asia/Jakarta",
  "qualification.min_quantity": 50,
  "qualification.free_email_domains": [
    "gmail.com",
    "yahoo.com",
    "yahoo.co.id",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "live.com",
    "aol.com",
  ],
  "qualification.internal_domains": [],
  "qualification.competitor_domains": [],
  "hubspot.write_lifecycle_stage": false,
  "attribution.revenue_rule": "lead_last_touch",
  "health.min_coverage": 0.7,
  "health.min_outcome_completeness": 0.6,
  "metrics.min_results_for_verdict": 10,
  "metrics.cohort_maturity_days": 14,
  "experiments.min_duration_days": 3,
  "jobs.max_batch": 500,
  "jobs.max_attempts": 5,
  "follow_up.mql_workdays": 2,
  "follow_up.sql_workdays": 3,
};
export function parseSettings(rows: { key: string; value: unknown }[]) {
  const values: Record<string, unknown> = { ...settingsDefaults };
  const warnings: string[] = [];
  for (const key of Object.keys(
    settingsDefaults,
  ) as (keyof typeof settingsDefaults)[]) {
    const parsed = settingsSchema.shape[key].safeParse(
      rows.find((row) => row.key === key)?.value,
    );
    if (parsed.success) values[key] = parsed.data;
    else
      warnings.push(
        `${key}: unavailable or invalid; using its documented default.`,
      );
  }
  if (
    rows.some(
      (row) =>
        row.key !== "hubspot.mapping" &&
        row.key !== "meta.token_metadata" &&
        !Object.hasOwn(settingsDefaults, row.key),
    )
  )
    warnings.push("An unknown setting was ignored.");
  return { values: settingsSchema.parse(values), warnings };
}
export const profileInput = z.object({
  full_name: z.string().trim().min(1).max(120),
});
export const preferenceInput = z.object({
  timezone: z.literal("Asia/Jakarta"),
});
