import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (
  process.env.HUBSPOT_ACCESS_TOKEN ||
  process.env.META_ACCESS_TOKEN ||
  process.env.SLACK_WEBHOOK_URL
)
  throw new Error("Local fixtures refuse inherited live provider credentials.");
export const testEnvironment = {
  HUBSPOT_PORTAL_ID: "12345",
  HUBSPOT_WEBHOOK_SECRET: (process.env.PHASE8_TEST_SECRET ??=
    randomBytes(32).toString("hex")),
  INGEST_HMAC_SECRET: (process.env.PHASE7_TEST_HMAC ??=
    randomBytes(32).toString("hex")),
  INGEST_HMAC_SECRET_PREVIOUS: (process.env.PHASE7_TEST_PREVIOUS ??=
    randomBytes(32).toString("hex")),
  CRON_SECRET: (process.env.PHASE7_TEST_CRON ??=
    randomBytes(32).toString("hex")),
  JOBS_ENABLED: "true",
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
