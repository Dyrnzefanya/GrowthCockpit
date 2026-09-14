"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/services/session";
import { can } from "@/lib/auth/can";
import { retry } from "@/repositories/integrations";
import { runJob } from "@/services/jobs/runner";
export async function integrationAction(
  _previous: { message: string },
  form: FormData,
) {
  await requireUser();
  if (!(await can("integration:write"))) return { message: "Akses ditolak." };
  try {
    if (form.get("operation") === "retry") {
      if (!(await retry(z.uuid().parse(form.get("id")))))
        return { message: "Event tidak dapat diulang; muat ulang statusnya." };
      return {
        message:
          "Event dijadwalkan ulang. Jalankan retry job atau tunggu scheduler.",
      };
    }
    if (form.get("operation") !== "run")
      return { message: "Permintaan tidak valid." };
    const result = await runJob("JOB-RETRY-EVENTS", "manual");
    revalidatePath("/integrations");
    revalidatePath("/today");
    return {
      message:
        result.http === 409
          ? "Job masih berjalan."
          : `Job: ${result.status}. Periksa riwayat eksekusi.`,
    };
  } catch {
    return { message: "Operasi belum berhasil. Muat ulang dan coba lagi." };
  }
}
