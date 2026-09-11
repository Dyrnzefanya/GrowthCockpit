import { z } from "zod";

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const serverEnvSchema = publicEnvSchema.extend({
  APP_ENV: z.enum(["development", "preview", "production"]),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  APP_BASE_URL: z.url(),
  APP_TIMEZONE: z.literal("Asia/Jakarta"),
  INGEST_HMAC_SECRET: z.string().min(1).optional(),
  INGEST_HMAC_SECRET_PREVIOUS: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  JOBS_ENABLED: z.enum(["true", "false"]).optional(),
  HUBSPOT_ACCESS_TOKEN: z.string().min(1).optional(),
  HUBSPOT_WEBHOOK_SECRET: z.string().min(1).optional(),
  HUBSPOT_PORTAL_ID: z.string().min(1).optional(),
  SLACK_WEBHOOK_URL: z.url().optional(),
  META_AD_ACCOUNT_ID: z.string().min(1).optional(),
  META_ACCESS_TOKEN: z.string().min(1).optional(),
  META_API_VERSION: z.string().min(1).optional(),
});

export function parseEnvironment<T>(schema: z.ZodType<T>, values: unknown): T {
  const result = schema.safeParse(values);

  if (!result.success) {
    const details = result.error.issues
      .map(
        (issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`,
      )
      .join("; ");
    throw new Error(`Invalid environment variables: ${details}`);
  }

  return result.data;
}
