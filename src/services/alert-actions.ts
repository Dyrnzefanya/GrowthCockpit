"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/services/session";
import { can } from "@/lib/auth/can";
import { transition } from "@/repositories/alerts";

const actionSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("acknowledge"), id: z.uuid() }),
  z.object({
    operation: z.literal("snooze"),
    id: z.uuid(),
    minutes: z.coerce.number().int().min(15).max(43200),
  }),
]);

export async function alertAction(
  _previous: { message: string; success: boolean },
  form: FormData,
) {
  const actor = await requireUser();
  if (!(await can("alert:write")))
    return { message: "Akses ditolak.", success: false };
  const input = actionSchema.safeParse({
    operation: form.get("operation"),
    id: form.get("id"),
    minutes: form.get("minutes"),
  });
  if (!input.success)
    return { message: "Permintaan alert tidak valid.", success: false };
  try {
    await transition(
      input.data.id,
      input.data.operation,
      input.data.operation === "acknowledge"
        ? "operator_acknowledged"
        : "operator_snoozed",
      actor.id,
      input.data.operation === "snooze"
        ? new Date(Date.now() + input.data.minutes * 60000).toISOString()
        : null,
    );
    revalidatePath("/today");
    revalidatePath("/integrations");
    return {
      message:
        input.data.operation === "acknowledge"
          ? "Alert diakui."
          : "Alert ditunda.",
      success: true,
    };
  } catch {
    return {
      message: "Perubahan belum tersimpan. Muat ulang dan coba lagi.",
      success: false,
    };
  }
}
