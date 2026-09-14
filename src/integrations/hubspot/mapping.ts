import { z } from "zod";
export const providerId = z.string().regex(/^\d{1,30}$/);
const property = z.string().regex(/^[a-z][a-z0-9_]{0,99}$/);
export const mappingSchema = z
  .object({
    portal_id: providerId,
    pipeline_id: z.string().min(1).max(100),
    lifecycle_map: z.record(
      property,
      z.enum(["new", "mql", "sql", "disqualified"]),
    ),
    deal_stage_map: z.record(
      z.string().min(1).max(100),
      z.enum(["open", "won", "lost"]),
    ),
    owner_map: z.record(providerId, z.string().trim().min(1).max(120)),
    properties: z
      .object({
        first_touch_source: z.literal("original_utm_source"),
        first_touch_medium: z.literal("original_utm_medium"),
        first_touch_campaign: z.literal("original_utm_campaign"),
        first_touch_content: z.literal("original_utm_content"),
        first_touch_term: z.literal("original_utm_term"),
        first_touch_landing_page: z.literal("original_landing_page"),
      })
      .strict(),
  })
  .strict()
  .refine(
    (v) =>
      Object.keys(v.lifecycle_map).length > 0 &&
      Object.keys(v.deal_stage_map).length > 0,
    "Stage mappings are required",
  );
export type Mapping = z.infer<typeof mappingSchema>;
export const recordSchema = z.object({
  id: providerId,
  properties: z.record(z.string(), z.string().nullable()),
  updatedAt: z.iso.datetime({ offset: true }),
  archived: z.boolean().default(false),
  propertiesWithHistory: z
    .record(
      z.string(),
      z.array(
        z.object({
          value: z.string(),
          timestamp: z.iso.datetime({ offset: true }),
        }),
      ),
    )
    .optional(),
  associations: z
    .record(
      z.string(),
      z.object({
        results: z.array(z.object({ id: providerId, type: z.string() })),
        paging: z.unknown().optional(),
      }),
    )
    .optional(),
});
export type CrmRecord = z.infer<typeof recordSchema>;
export const pageSchema = z.object({
  results: z.array(recordSchema),
  paging: z
    .object({ next: z.object({ after: z.union([z.string(), z.number()]) }) })
    .optional(),
});
export const kinds = ["companies", "contacts", "deals"] as const;
export type Kind = (typeof kinds)[number];
export const kindSchema = z.enum(kinds);
export const webhookSchema = z
  .array(
    z.object({
      eventId: z.number().int().nonnegative(),
      subscriptionId: z.number().int().nonnegative(),
      portalId: z.number().int().positive(),
      objectId: z.number().int().positive(),
      occurredAt: z.number().int().positive(),
      subscriptionType: z.enum([
        "contact.creation",
        "contact.propertyChange",
        "contact.deletion",
        "contact.merge",
        "deal.creation",
        "deal.propertyChange",
        "deal.deletion",
      ]),
      propertyName: property.optional(),
      propertyValue: z.string().max(10000).optional(),
    }),
  )
  .min(1)
  .max(100);
export const requestedProperties: Record<Kind, string[]> = {
  companies: ["name", "domain", "industry", "hs_lastmodifieddate"],
  contacts: [
    "email",
    "phone",
    "firstname",
    "lastname",
    "lifecyclestage",
    "hubspot_owner_id",
    "pmos_lead_id",
    "lead_quality_reason",
    "lead_product_interest",
    "estimated_quantity",
    "pmos_qualified_at",
    "original_utm_source",
    "original_utm_medium",
    "original_utm_campaign",
    "original_utm_content",
    "original_utm_term",
    "original_landing_page",
    "original_click_id",
    "original_click_id_type",
    "lastmodifieddate",
  ],
  deals: [
    "dealname",
    "pipeline",
    "dealstage",
    "amount",
    "deal_currency_code",
    "closedate",
    "hubspot_owner_id",
    "pmos_lead_id",
    "hs_lastmodifieddate",
  ],
};
