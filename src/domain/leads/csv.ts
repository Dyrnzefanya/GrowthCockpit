import { parse } from "csv-parse/browser/esm/sync";
import { z } from "zod";
import { leadInputSchema } from "@/config/lead-schema";
export const csvFields = [
  "occurred_at",
  "full_name",
  "email",
  "phone",
  "company_name",
  "company_domain",
  "product_interest",
  "estimated_quantity",
  "required_by_date",
  "message",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "campaign_id",
  "landing_page",
  "referrer",
] as const;
export const csvInput = z
  .object({
    text: z.string().max(5_000_000),
    mapping: z.partialRecord(z.enum(csvFields), z.string().max(200)),
    fingerprint: z.string().max(64).optional(),
  })
  .strict();
export function readCsv(text: string) {
  if (
    new TextEncoder().encode(text).length > 5_000_000 ||
    text.includes("\uFFFD") ||
    text.includes("\0")
  )
    throw new Error("CSV_INVALID");
  let parsed: unknown;
  try {
    parsed = parse(text, {
      bom: true,
      skip_empty_lines: true,
      max_record_size: 20_000,
      trim: true,
    });
  } catch {
    throw new Error("CSV_INVALID");
  }
  const rows = z
    .array(z.array(z.string().max(4000)).max(100))
    .max(5001)
    .parse(parsed);
  if (rows.length < 2) throw new Error("CSV_INVALID");
  const headers = rows[0];
  if (headers.some((h) => !h) || new Set(headers).size !== headers.length)
    throw new Error("CSV_INVALID");
  return { headers, rows: rows.slice(1) };
}
export function mapCsv(
  text: string,
  mapping: Partial<Record<(typeof csvFields)[number], string>>,
) {
  const csv = readCsv(text);
  if (
    !mapping.occurred_at ||
    !csv.headers.includes(mapping.occurred_at) ||
    Object.values(mapping).some((v) => v && !csv.headers.includes(v))
  )
    throw new Error("CSV_MAPPING");
  const errors: { row: number; reason: string }[] = [],
    valid: { row: number; input: z.infer<typeof leadInputSchema> }[] = [];
  csv.rows.forEach((row, index) => {
    const input: Record<string, unknown> = { channel: "import" };
    for (const field of csvFields)
      if (mapping[field])
        input[field] = row[csv.headers.indexOf(mapping[field]!)];
    const result = leadInputSchema.safeParse(input);
    if (result.success) valid.push({ row: index + 2, input: result.data });
    else
      errors.push({
        row: index + 2,
        reason:
          "Isian tidak valid: " +
          [...new Set(result.error.issues.map((i) => i.path.join(".")))].join(
            ", ",
          ),
      });
  });
  return { valid, errors, total: csv.rows.length };
}
