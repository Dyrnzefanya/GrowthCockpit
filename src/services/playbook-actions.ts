"use server";
import { revalidatePath } from "next/cache";
import {
  deletePlaybookArticle,
  savePlaybookArticle,
} from "@/services/playbook";

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message === "CONFLICT")
    return "Artikel berubah di tab lain. Muat ulang sebelum menyimpan lagi.";
  if (error instanceof Error && error.message === "FORBIDDEN")
    return "Anda tidak memiliki izin untuk mengubah playbook.";
  return "Artikel belum tersimpan. Periksa isi lalu coba lagi.";
}

export async function saveArticleAction(value: unknown) {
  try {
    const article = await savePlaybookArticle(value);
    revalidatePath("/playbook", "layout");
    return {
      ok: true as const,
      slug: article.slug,
      message: "Artikel tersimpan.",
    };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error) };
  }
}

export async function deleteArticleAction(value: unknown) {
  try {
    await deletePlaybookArticle(value);
    revalidatePath("/playbook", "layout");
    return { ok: true as const, message: "Artikel dihapus." };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error) };
  }
}
