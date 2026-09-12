"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/services/session";
import { can } from "@/lib/auth/can";
import { noteInputSchema } from "@/config/workflow-schema";
import { toJakartaDate } from "@/domain/dates";
import { insertNote } from "@/repositories/notes";
export async function addNote(value: unknown) {
  const user = await requireUser();
  if (!(await can("note:write")))
    return { ok: false, message: "Anda tidak memiliki izin menulis catatan." };
  const parsed = noteInputSchema.safeParse(value);
  if (!parsed.success)
    return { ok: false, message: "Isi catatan harus 1–4000 karakter." };
  try {
    await insertNote(
      parsed.data.id,
      parsed.data.body,
      toJakartaDate(new Date()),
      user.id,
    );
    revalidatePath("/today");
    return { ok: true, message: "Catatan tersimpan untuk hari ini (WIB)." };
  } catch {
    return {
      ok: false,
      message:
        "Catatan belum tersimpan. Teks tetap tersedia; silakan coba lagi.",
    };
  }
}
