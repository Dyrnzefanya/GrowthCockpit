import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
export const testEnvironment = {
  APP_BASE_URL: "http://127.0.0.1:3000",
  APP_ENV: "development",
  APP_TIMEZONE: "Asia/Jakarta",
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY!,
};
if (
  !testEnvironment.NEXT_PUBLIC_SUPABASE_URL ||
  !["127.0.0.1", "localhost"].includes(
    new URL(testEnvironment.NEXT_PUBLIC_SUPABASE_URL).hostname,
  )
)
  throw new Error(
    "Auth tests require local Supabase. Remote test execution is refused.",
  );
