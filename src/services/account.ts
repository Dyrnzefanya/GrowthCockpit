"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requestLogin, endSession } from "@/repositories/auth";
import {
  updateProfile,
  updateTimezone,
  updateQualification,
} from "@/repositories/settings";
import { requireUser } from "@/services/session";
import { safeNext } from "@/lib/auth/redirect";
import { can } from "@/lib/auth/can";
import { serverEnv } from "@/lib/env.server";
import {
  profileInput,
  preferenceInput,
  qualificationKey,
  settingsSchema,
} from "@/config/settings-schema";
export async function sendLoginLink(_previous: string, form: FormData) {
  const parsed = z.email().max(254).safeParse(form.get("email"));
  if (parsed.success) {
    try {
      await requestLogin(
        parsed.data,
        `${serverEnv.APP_BASE_URL}/auth/confirm?next=${encodeURIComponent(safeNext(form.get("next")))}`,
      );
    } catch {
      console.warn("auth_request_unavailable");
    }
  }
  return "If your account is invited, a sign-in link will arrive by email. Check your inbox or contact your workspace administrator.";
}
export async function signOut() {
  await requireUser();
  try {
    await endSession();
  } catch {
    console.warn("auth_signout_unavailable");
  } finally {
    const jar = await cookies();
    for (const cookie of jar.getAll())
      if (cookie.name.startsWith("sb-")) jar.delete(cookie.name);
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
export async function saveProfile(_previous: string, form: FormData) {
  const user = await requireUser();
  if (!(await can("profile:update")))
    return "Your profile is unavailable or you do not have permission. Contact your workspace administrator.";
  const input = profileInput.safeParse({ full_name: form.get("full_name") });
  if (!input.success)
    return "Enter a name between 1 and 120 characters. Nothing was saved.";
  try {
    await updateProfile(user.id, input.data.full_name);
  } catch {
    return "Profile could not be saved. Try again.";
  }
  revalidatePath("/settings");
  return "Profile saved.";
}
export async function savePreferences(_previous: string, form: FormData) {
  await requireUser();
  if (!(await can("settings:update")))
    return "You do not have permission to save preferences.";
  const input = preferenceInput.safeParse({ timezone: form.get("timezone") });
  if (!input.success)
    return "The workspace timezone must be Asia/Jakarta. Nothing was saved.";
  try {
    await updateTimezone(input.data.timezone);
  } catch {
    return "Preferences could not be saved. Try again.";
  }
  revalidatePath("/settings");
  return "Preferences saved.";
}
export async function saveQualification(_previous: string, form: FormData) {
  await requireUser();
  if (!(await can("settings:update"))) return "Anda tidak memiliki izin.";
  const key = qualificationKey.safeParse(form.get("key"));
  if (!key.success) return "Pengaturan tidak valid.";
  const raw = z.string().max(128000).safeParse(form.get("value"));
  if (!raw.success) return "Nilai tidak valid. Tidak ada perubahan tersimpan.";
  const value =
    key.data === "qualification.min_quantity"
      ? Number(raw.data)
      : raw.data
          .split(/[\n,]/)
          .map((v) => v.trim())
          .filter(Boolean);
  const parsed = settingsSchema.shape[key.data].safeParse(value);
  if (!parsed.success)
    return "Nilai tidak valid. Tidak ada perubahan tersimpan.";
  try {
    await updateQualification(key.data, parsed.data);
  } catch {
    return "Pengaturan belum tersimpan. Coba lagi.";
  }
  revalidatePath("/settings");
  return "Tersimpan. Berlaku untuk inquiry baru; riwayat tidak diubah.";
}
