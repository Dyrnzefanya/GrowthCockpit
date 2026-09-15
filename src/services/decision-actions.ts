"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/services/session";
import { can } from "@/lib/auth/can";
import * as repository from "@/repositories/decisions";
import { thresholdKey, thresholdShape } from "@/config/decision-schema";
import { settingsDefaults } from "@/config/settings-schema";
import { shiftDate, toJakartaDate } from "@/domain/dates";
export async function saveDecisionThreshold(_previous: string, form: FormData) {
  await requireUser();
  if (!(await can("settings:update"))) return "Akses ditolak.";
  const key = thresholdKey.safeParse(form.get("key"));
  if (!key.success) return "Pengaturan tidak valid.";
  let value: unknown = settingsDefaults[key.data];
  if (form.get("operation") !== "reset") {
    const text = z.string().max(250000).safeParse(form.get("value"));
    if (!text.success) return "Nilai tidak valid.";
    value =
      key.data === "rules.lead_gen_campaigns"
        ? text.data
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : key.data === "rules.currency"
          ? text.data.trim().toUpperCase() || null
          : text.data.trim()
            ? Number(text.data)
            : null;
  }
  const parsed = thresholdShape[key.data].safeParse(value);
  if (!parsed.success)
    return "Nilai di luar batas. Tidak ada perubahan tersimpan.";
  try {
    await repository.saveThreshold(key.data, parsed.data);
  } catch {
    return "Pengaturan belum tersimpan. Coba lagi.";
  }
  revalidatePath("/settings");
  revalidatePath("/today");
  return "Tersimpan dan diaudit. Berlaku pada evaluasi berikutnya; riwayat tetap.";
}
export async function decisionAction(_previous: string, form: FormData) {
  const actor = await requireUser();
  if (!(await can("alert:write"))) return "Akses ditolak.";
  const input = z
    .object({
      id: z.uuid(),
      revision: z.iso.datetime({ offset: true }),
      operation: z.enum(["snooze", "dismiss"]),
      minutes: z.coerce.number().int().min(15).max(43200),
      reason: z.string().trim().max(200),
    })
    .safeParse(Object.fromEntries(form));
  if (
    !input.success ||
    (input.data.operation === "dismiss" && !input.data.reason)
  )
    return "Masukkan durasi atau alasan dismiss yang valid.";
  const v = input.data,
    until =
      v.operation === "dismiss"
        ? `${shiftDate(toJakartaDate(new Date()), 1)}T00:00:00+07:00`
        : new Date(Date.now() + v.minutes * 60000).toISOString();
  try {
    await repository.action(
      v.id,
      v.revision,
      v.operation,
      v.reason,
      until,
      actor.id,
    );
  } catch {
    return "Perubahan belum tersimpan atau evaluasi berubah. Muat ulang dan coba lagi.";
  }
  revalidatePath("/today");
  revalidatePath("/settings");
  return "Tersimpan. Tindakan dihormati pada evaluasi berikutnya.";
}
