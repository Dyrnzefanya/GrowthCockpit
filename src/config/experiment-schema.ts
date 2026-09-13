import { z } from "zod";
import { experimentStatuses, outcomes } from "@/domain/experiments/state";

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value : undefined),
    z.string().trim().max(maximum).optional(),
  );
const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().finite().optional(),
);

export const externalRefsSchema = z
  .object({
    campaignId: optionalText(200),
    adsetId: optionalText(200),
    adId: optionalText(200),
    landingPageUrl: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() ? value : undefined,
      z
        .url()
        .max(2000)
        .refine((url) => /^https?:\/\//.test(url))
        .optional(),
    ),
  })
  .strict();

export const experimentInputSchema = z.object({
  id: z.uuid().optional(),
  revision: z.iso.datetime({ offset: true }).optional(),
  title: z.string().trim().min(1).max(200),
  hypothesis: z.string().trim().min(1).max(2000),
  variable: z.string().trim().min(1).max(200),
  primaryKpi: z.string().trim().min(1).max(120),
  startDate: z.iso.date(),
  reviewDate: z.iso.date(),
  controlDescription: z.string().trim().max(2000).default(""),
  variantDescription: z.string().trim().max(2000).default(""),
  secondaryKpi: optionalText(120),
  baselineValue: optionalNumber,
  targetValue: optionalNumber,
  priority: z.coerce.number().int().min(1).max(5).default(3),
  confidence: z.coerce.number().int().min(1).max(5).default(3),
  effort: z.coerce.number().int().min(1).max(5).default(3),
  platform: optionalText(80),
  externalRefs: externalRefsSchema.default({}),
});

export const experimentFiltersSchema = z.object({
  status: z.enum(experimentStatuses).catch("draft"),
  page: z.coerce.number().int().min(0).catch(0),
});

export const learningFiltersSchema = z.object({
  q: optionalText(200),
  variable: optionalText(200),
  kpi: optionalText(120),
  outcome: z.enum(outcomes).optional().catch(undefined),
  page: z.coerce.number().int().min(0).catch(0),
});

export const transitionInputSchema = z.object({
  id: z.uuid(),
  revision: z.iso.datetime({ offset: true }),
  from: z.enum(experimentStatuses),
  to: z.enum(experimentStatuses),
});

export const completionInputSchema = z.object({
  id: z.uuid(),
  revision: z.iso.datetime({ offset: true }),
  from: z.literal("running"),
  outcome: z.enum(outcomes),
  primaryKpiResult: z.coerce.number().finite(),
  observedResults: z.coerce.number().int().min(0),
  conclusion: z.string().trim().min(1).max(4000),
  learning: z.string().trim().min(1).max(4000),
  nextAction: z.string().trim().min(1).max(2000),
});
