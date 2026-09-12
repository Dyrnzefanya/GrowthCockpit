import { z } from "zod";
const key = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
export const stepSchema = z.object({
  key,
  label: z.string().trim().min(1).max(240),
  help: z.string().trim().max(1000),
  required: z.boolean(),
});
export const templateSchema = z
  .object({
    id: z.uuid().optional(),
    version: z.number().int().positive().optional(),
    key,
    name: z.string().trim().min(1).max(120),
    cadence: z.enum(["daily", "weekly", "monthly"]),
    weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7).nullable(),
    is_active: z.boolean(),
    steps: z.array(stepSchema).min(1).max(50),
  })
  .refine(
    (data) => new Set(data.steps.map((s) => s.key)).size === data.steps.length,
    { message: "Kunci langkah harus unik." },
  )
  .refine((data) => data.cadence !== "weekly" || data.weekdays !== null, {
    message: "Pilih hari untuk checklist mingguan.",
  });
export const itemChangeSchema = z
  .object({
    runId: z.uuid(),
    itemId: z.uuid(),
    done: z.boolean().optional(),
    note: z.string().max(4000).optional(),
  })
  .refine((data) => (data.done !== undefined) !== (data.note !== undefined));
export const noteInputSchema = z.object({
  id: z.uuid(),
  body: z.string().trim().min(1).max(4000),
});
