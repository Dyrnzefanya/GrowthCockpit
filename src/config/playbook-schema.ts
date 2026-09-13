import { z } from "zod";
import { articleStatuses, articleTypes } from "@/domain/playbook";

const optionalFilter = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value : undefined),
  z.string().trim().max(200).optional(),
);
export const playbookFiltersSchema = z.object({
  q: optionalFilter,
  type: z.enum(articleTypes).optional().catch(undefined),
  category: optionalFilter,
  tag: optionalFilter,
  status: z.enum(articleStatuses).optional().catch(undefined),
  page: z.coerce.number().int().min(0).catch(0),
});

export const articleInputSchema = z.object({
  id: z.uuid().optional(),
  revision: z.iso.datetime({ offset: true }).optional(),
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(160).optional(),
  category: z.string().trim().min(1).max(80),
  articleType: z.enum(articleTypes),
  summary: z.string().trim().min(1).max(500),
  bodyMd: z.string().trim().min(1).max(100000),
  tags: z.array(z.string().max(80)).max(20),
  status: z.enum(articleStatuses),
});

export const deleteArticleSchema = z.object({
  id: z.uuid(),
  revision: z.iso.datetime({ offset: true }),
});
