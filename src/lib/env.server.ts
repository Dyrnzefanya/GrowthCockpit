import "server-only";

import { serverEnvSchema, parseEnvironment } from "@/config/env-schema";
import { env } from "@/lib/env";

export const serverEnv = parseEnvironment(serverEnvSchema, {
  ...env,
  APP_ENV: process.env.APP_ENV,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  APP_BASE_URL: process.env.APP_BASE_URL,
  APP_TIMEZONE: process.env.APP_TIMEZONE,
  INGEST_HMAC_SECRET: process.env.INGEST_HMAC_SECRET,
  INGEST_HMAC_SECRET_PREVIOUS: process.env.INGEST_HMAC_SECRET_PREVIOUS,
  CRON_SECRET: process.env.CRON_SECRET,
  JOBS_ENABLED: process.env.JOBS_ENABLED,
  HUBSPOT_ACCESS_TOKEN: process.env.HUBSPOT_ACCESS_TOKEN,
  HUBSPOT_WEBHOOK_SECRET: process.env.HUBSPOT_WEBHOOK_SECRET,
  HUBSPOT_PORTAL_ID: process.env.HUBSPOT_PORTAL_ID,
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
  META_AD_ACCOUNT_ID: process.env.META_AD_ACCOUNT_ID,
  META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN,
  META_API_VERSION: process.env.META_API_VERSION,
});
