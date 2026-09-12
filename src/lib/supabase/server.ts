import "server-only";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.generated";
export const sessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};
export function sessionClient(cookieMethods: CookieMethodsServer) {
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { cookies: cookieMethods, cookieOptions: sessionCookieOptions },
  );
}
export async function serverClient() {
  const jar = await cookies();
  return sessionClient({
    getAll: () => jar.getAll(),
    setAll: (values) => {
      try {
        values.forEach(({ name, value, options }) =>
          jar.set(name, value, { ...options, ...sessionCookieOptions }),
        );
      } catch {
        /* Server Components cannot write cookies; proxy refreshes them. */
      }
    },
  });
}
