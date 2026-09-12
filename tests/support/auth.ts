import { test as base, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { testEnvironment } from "./environment";
export const admin = createClient(
  testEnvironment.NEXT_PUBLIC_SUPABASE_URL,
  testEnvironment.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
export async function invitedSession(page: Page, next = "/today") {
  const email = `phase2-${randomUUID()}@example.test`;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
  });
  if (error) throw new Error(`Local invitation failed: ${error.code}`);
  try {
    await page.goto(
      `/auth/confirm?type=invite&token_hash=${data.properties.hashed_token}&next=${encodeURIComponent(next)}`,
    );
    await expect(page).toHaveURL(new RegExp(next.replace(/[?]/g, "\\?")));
  } catch (error) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw error;
  }
  return { id: data.user.id, email };
}
export const test = base.extend({
  page: async ({ page }, runTest) => {
    const user = await invitedSession(page);
    try {
      await runTest(page);
    } finally {
      await admin.auth.admin.deleteUser(user.id);
    }
  },
});
export { expect };
