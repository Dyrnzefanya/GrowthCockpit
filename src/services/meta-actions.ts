"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/services/session";
import { can } from "@/lib/auth/can";
import { ingestRange } from "@/services/ad-metrics";
import { runJob } from "@/services/jobs/runner";
import { settingsSchema } from "@/config/settings-schema";
import { saveResultType, cancelRange } from "@/repositories/ad-metrics";
import { startJob, finishRun } from "@/repositories/integrations";
import { randomUUID } from "node:crypto";
export async function metaIngestAction(
  _previous: { message: string },
  form: FormData,
) {
  await requireUser();
  if (!(await can("integration:write"))) return { message: "Akses ditolak." };
  if (form.get("operation") === "cancel-range") {
    const run = await startJob("JOB-META-INGEST", "manual", randomUUID());
    if (!run)
      return {
        message: "Job masih berjalan; tunggu sebelum membatalkan rentang.",
      };
    try {
      await cancelRange(run);
      await finishRun(run, "skipped", 0, 0, 0, "META_RANGE_CANCELLED", null);
      revalidatePath("/integrations");
      return {
        message:
          "Rentang tertunda dibatalkan. Data dan riwayat sebelumnya tetap tersedia.",
      };
    } catch {
      await finishRun(run, "failed", 0, 0, 1, "META_RANGE_CANCEL_FAILED", null);
      return { message: "Pembatalan belum berhasil. Tinjau riwayat." };
    }
  }
  if (form.get("operation") === "result-type") {
    const result = settingsSchema.shape["meta.primary_result_type"].safeParse(
      form.get("result_type") || null,
    );
    if (!result.success) return { message: "Action type tidak valid." };
    try {
      await saveResultType(result.data);
      revalidatePath("/integrations");
      return {
        message:
          "Action type tersimpan. Jalankan re-ingest untuk memperbarui fakta.",
      };
    } catch {
      return { message: "Konfigurasi belum tersimpan." };
    }
  }
  const result = ingestRange.safeParse({
    from: form.get("from"),
    to: form.get("to"),
  });
  if (!result.success) return { message: "Rentang tanggal tidak valid." };
  const run = await runJob("JOB-META-INGEST", "manual", result.data);
  revalidatePath("/integrations");
  revalidatePath("/performance");
  return {
    message: `Ingest ${run.status}. Rentang yang belum selesai dapat dilanjutkan dengan Run job; periksa riwayat.`,
  };
}
