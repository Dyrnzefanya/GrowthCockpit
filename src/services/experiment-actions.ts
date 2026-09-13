"use server";
import { revalidatePath } from "next/cache";
import {
  completeExperiment,
  saveExperiment,
  transitionExperiment,
} from "@/services/experiments";

function message(error: unknown) {
  if (error instanceof Error && error.message === "CONFLICT")
    return "Eksperimen berubah di tab lain. Muat ulang sebelum mencoba lagi.";
  if (
    error instanceof Error &&
    error.message.startsWith("BUSINESS_RULE_REJECTED")
  )
    return error.message;
  if (error instanceof Error && error.message === "FORBIDDEN")
    return "Anda tidak memiliki izin untuk mengubah eksperimen.";
  return "Perubahan belum tersimpan. Periksa isian lalu coba lagi.";
}

export async function saveExperimentAction(value: unknown) {
  try {
    const id = await saveExperiment(value);
    revalidatePath("/experiments", "layout");
    return { ok: true as const, id, message: "Eksperimen tersimpan." };
  } catch (error) {
    return { ok: false as const, message: message(error) };
  }
}

export async function transitionExperimentAction(value: unknown) {
  try {
    await transitionExperiment(value);
    revalidatePath("/experiments", "layout");
    revalidatePath("/today");
    return { ok: true as const, message: "Status eksperimen diperbarui." };
  } catch (error) {
    return { ok: false as const, message: message(error) };
  }
}

export async function completeExperimentAction(value: unknown) {
  try {
    const evidence = await completeExperiment(value);
    revalidatePath("/experiments", "layout");
    revalidatePath("/today");
    return {
      ok: true as const,
      message: evidence.sample_warning
        ? "Eksperimen selesai dan diberi label inconclusive by default karena sampel kecil."
        : "Eksperimen selesai dan learning tersimpan.",
    };
  } catch (error) {
    return { ok: false as const, message: message(error) };
  }
}
