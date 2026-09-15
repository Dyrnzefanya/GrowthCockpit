import { z } from "zod";
const count = z.coerce
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
const money = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/)
  .refine((v) => v.split(".")[0].length <= 16);
const action = z.object({ action_type: z.string(), value: z.string() });
export const accountSchema = z.object({
  account_id: z.string().regex(/^\d+$/),
  name: z.string().min(1).max(500),
  currency: z.string().regex(/^[A-Z]{3}$/),
  timezone_name: z.string().refine((v) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }),
});
export type MetaAccount = z.infer<typeof accountSchema>;
export const insightSchema = z.object({
  date_start: z.iso.date(),
  date_stop: z.iso.date(),
  campaign_id: z.string().regex(/^\d+$/),
  campaign_name: z.string().max(500),
  impressions: count,
  clicks: count,
  spend: money,
  reach: count.nullish(),
  frequency: z.coerce.number().finite().nonnegative().nullish(),
  actions: z.array(action).optional(),
  cost_per_action_type: z.array(action).optional(),
});
export function normalizeInsight(
  input: unknown,
  account: MetaAccount,
  date: string,
  resultType: string | null,
) {
  const row = insightSchema.parse(input);
  if (row.date_start !== date || row.date_stop !== date)
    throw new Error("META_DATE_MISMATCH");
  const results =
    row.actions?.filter((a) => a.action_type === resultType) ?? [];
  const costs =
    row.cost_per_action_type?.filter((a) => a.action_type === resultType) ?? [];
  if (results.length > 1 || costs.length > 1)
    throw new Error("META_AMBIGUOUS_RESULT");
  return {
    platform: "meta",
    metric_date: date,
    campaign_id: row.campaign_id,
    campaign_name: row.campaign_name,
    adset_id: "",
    ad_id: "",
    impressions: row.impressions,
    clicks: row.clicks,
    spend: row.spend,
    currency: account.currency,
    source_timezone: account.timezone_name,
    reach: row.reach ?? null,
    frequency: row.frequency ?? null,
    platform_results: results.length ? count.parse(results[0].value) : null,
    platform_result_type: resultType,
    platform_cost_per_result: costs.length
      ? z.coerce.number().finite().nonnegative().parse(costs[0].value)
      : null,
  };
}
export type AdMetricInput = ReturnType<typeof normalizeInsight>;
