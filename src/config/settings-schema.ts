import { z } from "zod";
export const settingsSchema = z.object({
  "workspace.timezone": z.literal("Asia/Jakarta"),
  "qualification.min_quantity": z.number().int().positive(),
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
  "workspace.timezone": "Asia/Jakarta",
  "qualification.min_quantity": 50,
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
  if (rows.some((row) => !Object.hasOwn(settingsDefaults, row.key)))
    warnings.push("An unknown setting was ignored.");
  return { values: settingsSchema.parse(values), warnings };
}
export const profileInput = z.object({
  full_name: z.string().trim().min(1).max(120),
});
export const preferenceInput = z.object({
  timezone: z.literal("Asia/Jakarta"),
});
