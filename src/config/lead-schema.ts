import { z } from "zod";
export const leadStatuses = ["new", "mql", "sql", "disqualified"] as const;
export const channels = [
  "manual",
  "import",
  "web_form",
  "whatsapp",
  "referral",
  "other",
] as const;
export const platforms = [
  "unknown",
  "meta",
  "google",
  "linkedin",
  "tiktok",
  "organic",
  "direct",
  "referral",
] as const;
const text = (max: number) => z.string().trim().max(max).default("");
const optionalDate = z.preprocess(
  (v) => (v === "" ? null : v),
  z.iso.date().nullable().default(null),
);
export const leadInputSchema = z
  .object({
    occurred_at: z
      .string()
      .transform((v) =>
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v)
          ? v + (v.length === 16 ? ":00" : "") + "+07:00"
          : v,
      )
      .pipe(z.iso.datetime({ offset: true }))
      .transform((v) => new Date(v).toISOString()),
    full_name: text(160),
    email: text(254),
    phone: text(50),
    company_name: text(200),
    company_domain: text(254),
    product_interest: text(200),
    estimated_quantity: z.preprocess(
      (v) => (v === "" ? null : v),
      z.coerce.number().int().min(0).max(2147483647).nullable().default(null),
    ),
    required_by_date: optionalDate,
    message: text(4000),
    out_of_scope: z.boolean().default(false),
    channel: z.enum(channels).default("manual"),
    platform: z.enum(platforms).default("unknown"),
    utm_source: text(300),
    utm_medium: text(300),
    utm_campaign: text(300),
    utm_content: text(300),
    utm_term: text(300),
    landing_page: text(2000),
    referrer: text(2000),
    click_id_type: z
      .enum(["none", "fbclid", "gclid", "ctwa_clid", "li_fat_id"])
      .default("none"),
    click_id: text(500),
    campaign_id: text(300),
    adset_id: text(300),
    ad_id: text(300),
    owner_id: z.preprocess(
      (v) => (v === "" ? null : v),
      z.uuid().nullable().default(null),
    ),
  })
  .strict()
  .refine((v) => v.click_id_type === "none" || Boolean(v.click_id), {
    path: ["click_id"],
    message: "Click ID required for its type",
  });
export type LeadInput = z.infer<typeof leadInputSchema>;
export const overrideSchema = z
  .object({
    id: z.uuid(),
    revision: z.iso.datetime({ offset: true }),
    status: z.enum(leadStatuses),
    reason: z.string().trim().min(1).max(2000),
  })
  .strict();
export const dealSchema = z
  .object({
    lead_id: z.uuid(),
    revision: z.iso.datetime({ offset: true }).nullable(),
    name: z.string().trim().min(1).max(200),
    pipeline: z.string().trim().min(1).max(120),
    stage_key: z.string().trim().min(1).max(120),
    stage_label: z.string().trim().min(1).max(120),
    stage_category: z.enum(["open", "won", "lost"]),
    amount: z
      .string()
      .trim()
      .regex(/^\d{1,12}(\.\d{1,2})?$/)
      .or(z.literal("")),
    currency: z.string().regex(/^[A-Z]{3}$/),
    expected_close_date: optionalDate,
    close_date: optionalDate,
  })
  .strict()
  .refine((v) => v.stage_category === "open" || v.close_date !== null, {
    path: ["close_date"],
    message: "Closing date required",
  });
export const leadFiltersSchema = z.object({
  status: z.enum(leadStatuses).optional().catch(undefined),
  channel: z.enum(channels).optional().catch(undefined),
  platform: z.enum(platforms).optional().catch(undefined),
  campaign: z.string().trim().max(300).default(""),
  from: optionalDate,
  to: optionalDate,
  attribution: z.enum(["all", "missing", "complete"]).catch("all"),
  owner: z.uuid().optional().catch(undefined),
  page: z.coerce.number().int().min(0).max(100000).catch(0),
  sort: z
    .enum([
      "inquiry_date",
      "product_interest",
      "qualification_status",
      "platform",
      "channel",
      "lt_campaign",
      "attribution_missing",
    ])
    .catch("inquiry_date"),
  direction: z.enum(["asc", "desc"]).catch("desc"),
});
