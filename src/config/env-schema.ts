import { z } from "zod";

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .regex(
      /^sb_publishable_[A-Za-z0-9_-]+$/,
      "Expected a Supabase publishable key.",
    ),
});

export const serverEnvSchema = publicEnvSchema
  .extend({
    APP_ENV: z.enum(["development", "preview", "production"]),
    SUPABASE_SECRET_KEY: z
      .string()
      .regex(
        /^sb_secret_[A-Za-z0-9_-]+$/,
        "Expected a server-only Supabase secret key.",
      ),
    APP_BASE_URL: z.url(),
    APP_TIMEZONE: z.literal("Asia/Jakarta"),
    INGEST_HMAC_SECRET: z.string().min(32).optional(),
    INGEST_HMAC_SECRET_PREVIOUS: z.string().min(32).optional(),
    CRON_SECRET: z.string().min(32).optional(),
    JOBS_ENABLED: z.enum(["true", "false"]).optional(),
    HUBSPOT_ACCESS_TOKEN: z.string().min(1).optional(),
    HUBSPOT_WEBHOOK_SECRET: z.string().min(1).optional(),
    HUBSPOT_PORTAL_ID: z
      .string()
      .regex(/^\d{1,30}$/)
      .optional(),
    SLACK_WEBHOOK_URL: z.url().optional(),
    META_AD_ACCOUNT_ID: z.string().min(1).optional(),
    META_ACCESS_TOKEN: z.string().min(1).optional(),
    META_API_VERSION: z.string().min(1).optional(),
  })
  .superRefine((v, context) => {
    const keys = [
      "INGEST_HMAC_SECRET",
      "INGEST_HMAC_SECRET_PREVIOUS",
      "CRON_SECRET",
      "SUPABASE_SECRET_KEY",
    ] as const;
    for (let i = 0; i < keys.length; i++)
      for (let j = i + 1; j < keys.length; j++) {
        if (v[keys[i]] && v[keys[i]] === v[keys[j]])
          context.addIssue({
            code: "custom",
            path: [keys[i]],
            message: "Secrets must be distinct.",
          });
      }
    if (v.INGEST_HMAC_SECRET_PREVIOUS && !v.INGEST_HMAC_SECRET)
      context.addIssue({
        code: "custom",
        path: ["INGEST_HMAC_SECRET"],
        message: "Current key is required during rotation.",
      });
    if (v.JOBS_ENABLED === "true" && !v.CRON_SECRET)
      context.addIssue({
        code: "custom",
        path: ["CRON_SECRET"],
        message: "Required when jobs are enabled.",
      });
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
