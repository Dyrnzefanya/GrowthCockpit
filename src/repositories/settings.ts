import "server-only";
import { serverClient } from "@/lib/supabase/server";
import { parseSettings, settingsSchema } from "@/config/settings-schema";
export async function readProfile(id: string) {
  const { data, error } = await (
    await serverClient()
  )
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Profile could not be loaded.");
  return data;
}
export async function updateProfile(id: string, full_name: string) {
  const { data, error } = await (
    await serverClient()
  )
    .from("profiles")
    .update({ full_name })
    .eq("id", id)
    .select("id")
    .single();
  if (error || !data) throw new Error("Profile could not be saved.");
}
export async function readSettings() {
  const { data, error } = await (
    await serverClient()
  )
    .from("app_settings")
    .select("*");
  if (error) {
    console.warn("settings_read_failed", { code: error.code });
    throw new Error("Settings could not be loaded.");
  }
  return {
    ...parseSettings(data),
    updatedAt:
      data.find((row) => row.key === "workspace.timezone")?.updated_at ?? null,
  };
}
export async function updateTimezone(value: unknown) {
  const timezone = settingsSchema.shape["workspace.timezone"].parse(value);
  const { error } = await (
    await serverClient()
  )
    .from("app_settings")
    .update({ value: timezone })
    .eq("key", "workspace.timezone")
    .select("key")
    .single();
  if (error) throw new Error("Preferences could not be saved.");
}
