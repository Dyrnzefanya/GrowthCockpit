import { z } from "zod";
import { leadInputSchema } from "./lead-schema";
const t = (max: number) => z.string().max(max).optional();
export const ingestSchema = z
  .object({
    source_channel: z.enum(["web_form", "whatsapp", "manual"]),
    occurred_at: z.iso.datetime({ offset: true }),
    contact: z
      .object({ full_name: t(160), email: t(254), phone: t(50) })
      .strict()
      .optional(),
    company: z
      .object({ name: t(200), domain: t(254) })
      .strict()
      .optional(),
    inquiry: z
      .object({
        product_interest: t(200),
        estimated_quantity: z
          .number()
          .int()
          .min(0)
          .max(2147483647)
          .nullable()
          .optional(),
        required_by_date: z.iso.date().nullable().optional(),
        message: t(4000),
      })
      .strict()
      .optional(),
    attribution: z
      .object({
        utm_source: t(300),
        utm_medium: t(300),
        utm_campaign: t(300),
        utm_content: t(300),
        utm_term: t(300),
        landing_page: t(2000),
        referrer: t(2000),
        click_id_type: z
          .enum(["none", "fbclid", "gclid", "ctwa_clid", "li_fat_id"])
          .optional(),
        click_id: t(500),
        campaign_id: t(300),
        adset_id: t(300),
        ad_id: t(300),
      })
      .strict()
      .optional(),
  })
  .strict()
  .transform((v): z.input<typeof leadInputSchema> => ({
    occurred_at: v.occurred_at,
    channel: v.source_channel,
    ...v.contact,
    company_name: v.company?.name,
    company_domain: v.company?.domain,
    ...v.inquiry,
    ...v.attribution,
  }))
  .pipe(leadInputSchema);
export const idempotencyKeySchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9._:-]+$/);
