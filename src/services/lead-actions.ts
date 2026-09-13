"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { createLead, importLeads, override, saveDeal } from "./leads";
const errors: Record<string, string> = {
  CONFLICT:
    "CONFLICT: identitas cocok dengan data berbeda atau inquiry ambigu. Periksa kontak yang sudah ada; data tidak digabung otomatis.",
  PREVIEW_STALE: "Data berubah sejak dry-run. Jalankan dry-run kembali.",
  CSV_INVALID:
    "CSV tidak valid. Gunakan UTF-8, header unik, maksimal 5.000 baris / 5 MB.",
  CSV_MAPPING:
    "Petakan occurred_at ke waktu inquiry sebenarnya dan periksa nama kolom.",
  CSV_ROWS: "Perbaiki seluruh kesalahan baris sebelum commit.",
  FORBIDDEN: "Anda tidak memiliki izin untuk perubahan ini.",
};
function message(error: unknown) {
  unstable_rethrow(error);
  if (error instanceof z.ZodError)
    return (
      "Periksa isian: " +
      [...new Set(error.issues.map((issue) => issue.path.join(".")))].join(
        ", ",
      ) +
      ". Tidak ada perubahan tersimpan."
    );
  return error instanceof Error && errors[error.message]
    ? errors[error.message]
    : "Perubahan belum tersimpan. Periksa isian lalu coba lagi.";
}
function refresh() {
  for (const path of ["/leads", "/funnel", "/today"])
    revalidatePath(path, "layout");
}
export async function createLeadAction(value: unknown, requestId: unknown) {
  try {
    const result = await createLead(value, requestId);
    refresh();
    return { ok: true as const, result };
  } catch (e) {
    return { ok: false as const, message: message(e) };
  }
}
export async function importLeadAction(value: unknown, commit = false) {
  try {
    const result = await importLeads(value, commit);
    if (commit) refresh();
    return { ok: true as const, result };
  } catch (e) {
    return { ok: false as const, message: message(e) };
  }
}
export async function overrideLeadAction(value: unknown) {
  try {
    await override(value);
    refresh();
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, message: message(e) };
  }
}
export async function saveDealAction(value: unknown) {
  try {
    await saveDeal(value);
    refresh();
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, message: message(e) };
  }
}
