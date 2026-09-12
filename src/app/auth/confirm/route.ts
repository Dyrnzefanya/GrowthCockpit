import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { confirmLogin } from "@/repositories/auth";
import { safeNext } from "@/lib/auth/redirect";
import { serverEnv } from "@/lib/env.server";
const confirmation = z.object({
  token_hash: z.string().regex(/^[a-zA-Z0-9_-]{20,256}$/),
  type: z.enum(["email", "invite"]),
});
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = confirmation.safeParse({
    token_hash: params.get("token_hash"),
    type: params.get("type"),
  });
  let valid = false;
  if (parsed.success)
    try {
      valid = await confirmLogin(parsed.data.token_hash, parsed.data.type);
    } catch {
      console.warn("auth_confirmation_unavailable");
    }
  const target = valid ? safeNext(params.get("next")) : "/login?error=link";
  const response = NextResponse.redirect(
    new URL(target, serverEnv.APP_BASE_URL),
    303,
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
