import { z } from "zod";

const metric = z.object({
  current: z.number().finite().nullable(),
  previous: z.number().finite().nullable(),
  change: z.number().finite().nullable(),
  unit: z.string().max(20),
});

export const reportFactsSchema = z.object({
  schemaVersion: z.literal("weekly-v1"),
  period: z.object({
    isoWeek: z.string().regex(/^\d{4}-W\d{2}$/),
    start: z.iso.date(),
    end: z.iso.date(),
    previousStart: z.iso.date(),
    previousEnd: z.iso.date(),
    timezone: z.literal("Asia/Jakarta"),
    partial: z.boolean(),
  }),
  context: z.object({
    basis: z.literal("cohort"),
    scope: z.literal("all joined campaigns"),
    oldestSourceAt: z.iso.datetime({ offset: true }).nullable(),
    freshness: z.enum(["fresh", "stale", "unknown"]),
  }),
  metrics: z.object({
    spend: metric,
    leads: metric,
    cpl: metric,
    mql: metric,
    cpql: metric,
    sql: metric,
    cpsql: metric,
    opportunities: metric,
    revenue: metric,
    roas: metric,
    cac: metric,
  }),
  funnel: z.object({
    mqlRate: z.number().finite().nullable(),
    sqlRate: z.number().finite().nullable(),
    winRate: z.number().finite().nullable(),
    leads: z.number().int().nonnegative(),
    disqualified: z.number().int().nonnegative(),
    won: z.number().int().nonnegative(),
  }),
  campaigns: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      currency: z.string().nullable(),
      spend: z.number().finite().nullable(),
      leads: z.number().int().nonnegative(),
      mql: z.number().int().nonnegative(),
      cpql: z.number().finite().nullable(),
      previousSpend: z.number().finite().nullable(),
      previousMql: z.number().int().nonnegative().nullable(),
      previousCpql: z.number().finite().nullable(),
    }),
  ),
  experiments: z.object({
    completed: z.array(
      z.object({
        code: z.string(),
        title: z.string(),
        outcome: z.string(),
        learning: z.string(),
        nextAction: z.string(),
      }),
    ),
    running: z.array(
      z.object({
        code: z.string(),
        title: z.string(),
        reviewDate: z.iso.date(),
      }),
    ),
  }),
  workflow: z.object({
    completed: z.number().int().nonnegative(),
    required: z.number().int().nonnegative(),
    rate: z.number().finite().nullable(),
    runs: z.number().int().nonnegative(),
  }),
  notes: z.array(z.object({ date: z.iso.date(), body: z.string().max(4000) })),
  issues: z.array(
    z.object({ severity: z.string(), title: z.string(), message: z.string() }),
  ),
  nextActions: z.array(z.object({ title: z.string(), action: z.string() })),
  caveats: z.object({
    attributionCoverage: z.number().finite().nullable(),
    minimumCoverage: z.number().finite(),
    outcomeCompleteness: z.number().finite().nullable(),
    minimumOutcomeCompleteness: z.number().finite(),
    staleSources: z.array(z.string()),
    revenueAvailable: z.boolean(),
    revenueReason: z.string(),
    items: z.array(z.string()).min(1),
  }),
});

export type ReportFacts = z.infer<typeof reportFactsSchema>;
export const reportNarrativeSchema = z.string().trim().min(1).max(50000);
export const reportWeekSchema = z.string().regex(/^\d{4}-W\d{2}$/);
export const reportIdSchema = z.uuid();
export const reportRevisionSchema = z.iso.datetime({ offset: true });
