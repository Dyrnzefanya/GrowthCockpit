"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/services/session";
import { can } from "@/lib/auth/can";
import { updateWorkflowItem } from "@/services/workflows";
import { templateSchema } from "@/config/workflow-schema";
import { writeTemplate } from "@/repositories/workflows";
function message(error: unknown) {
  return error instanceof Error && error.message === "CONFLICT"
    ? "Data berubah di tab lain. Muat ulang, lalu coba lagi."
    : "Perubahan belum tersimpan. Periksa input atau koneksi, lalu coba lagi.";
}
function refreshWorkflows() {
  revalidatePath("/today");
  revalidatePath("/workflows", "layout");
}
export async function changeItem(value: unknown) {
  await requireUser();
  try {
    await updateWorkflowItem(value);
    refreshWorkflows();
    return { ok: true, message: "Tersimpan." };
  } catch (error) {
    return { ok: false, message: message(error) };
  }
}
export async function saveTemplate(value: unknown) {
  await requireUser();
  if (!(await can("workflow:write")))
    return {
      ok: false,
      message: "Anda tidak memiliki izin untuk mengubah template.",
    };
  const parsed = templateSchema.safeParse(value);
  if (!parsed.success)
    return {
      ok: false,
      message: "Periksa nama, kunci unik, hari, dan langkah template.",
    };
  try {
    await writeTemplate(parsed.data);
    refreshWorkflows();
    return {
      ok: true,
      message: "Template tersimpan. Checklist yang sudah dibuat tetap utuh.",
    };
  } catch (error) {
    return { ok: false, message: message(error) };
  }
}
