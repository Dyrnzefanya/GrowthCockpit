import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/repositories/auth";
import { safeNext } from "@/lib/auth/redirect";
import { serverEnv } from "@/lib/env.server";
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (
    pathname === "/api/ingest/lead" ||
    pathname === "/api/ingest/hubspot" ||
    /^\/api\/jobs\/[^/]+$/.test(pathname) ||
    pathname === "/api/health"
  )
    return NextResponse.next();
  if (pathname === "/auth/confirm") return NextResponse.next();
  const session = await refreshSession(request);
  const publicPage = pathname === "/login";
  if (!publicPage && (!session.user || !session.user.email_confirmed_at)) {
    const login = new URL("/login", serverEnv.APP_BASE_URL);
    login.searchParams.set("next", safeNext(pathname + request.nextUrl.search));
    return session.applyCookies(NextResponse.redirect(login));
  }
  const headers = new Headers(request.headers);
  headers.set("x-workspace-path", pathname + request.nextUrl.search);
  return session.applyCookies(NextResponse.next({ request: { headers } }));
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
