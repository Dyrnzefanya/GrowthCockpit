import "server-only";
import { requireUser } from "@/services/session";
import { readProfile } from "@/repositories/settings";
export async function can(
  action:
    | "profile:update"
    | "settings:update"
    | "workflow:write"
    | "note:write"
    | "playbook:write"
    | "experiment:write"
    | "lead:write"
    | "integration:write"
    | "alert:write",
) {
  const user = await requireUser();
  const profile = await readProfile(user.id);
  // All MVP actions are available to owner; future role rules belong here only.
  return Boolean(action && profile?.role === "owner");
}
