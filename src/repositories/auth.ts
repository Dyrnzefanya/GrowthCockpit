import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import {
  serverClient,
  sessionClient,
  sessionCookieOptions,
} from "@/lib/supabase/server";
export async function authenticatedUser() {
  const client = await serverClient();
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}
export async function refreshSession(request: NextRequest) {
  const changes: {
    name: string;
    value: string;
    options: Parameters<NextResponse["cookies"]["set"]>[2];
  }[] = [];
  const client = sessionClient({
    getAll: () => request.cookies.getAll(),
    setAll: (values) => {
      values.forEach((value) => {
        request.cookies.set(value.name, value.value);
        changes.push(value);
      });
    },
  });
  const { data, error } = await client.auth.getUser();
  return {
    user: error ? null : data.user,
    applyCookies(response: NextResponse) {
      changes.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, {
          ...options,
          ...sessionCookieOptions,
        }),
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    },
  };
}
export async function requestLogin(email: string, redirectTo: string) {
  const { error } = await (
    await serverClient()
  ).auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
  });
  if (error)
    console.warn("auth_request_failed", {
      code: error.code,
      status: error.status,
    });
}
export async function confirmLogin(
  token_hash: string,
  type: "email" | "invite",
) {
  const { error } = await (
    await serverClient()
  ).auth.verifyOtp({ token_hash, type });
  if (error)
    console.warn("auth_confirmation_failed", {
      code: error.code,
      status: error.status,
    });
  return !error;
}
export async function endSession() {
  const client = await serverClient();
  const { error } = await client.auth.signOut();
  if (error)
    console.warn("auth_signout_failed", {
      code: error.code,
      status: error.status,
    });
}
