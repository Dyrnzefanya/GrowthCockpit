import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticatedUser } from "@/repositories/auth";
import { safeNext } from "@/lib/auth/redirect";
export async function requireUser() {
  const user = await authenticatedUser();
  if (!user || !user.email_confirmed_at) {
    const path = safeNext((await headers()).get("x-workspace-path"));
    redirect("/login?next=" + encodeURIComponent(path));
  }
  return user;
}
