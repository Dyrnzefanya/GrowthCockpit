// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseEnvironment,
  publicEnvSchema,
  serverEnvSchema,
} from "@/config/env-schema";

const publishableKey = ["sb", "publishable", "test".repeat(8)].join("_");
const secretKey = ["sb", "secret", "test".repeat(8)].join("_");

describe("public environment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("rejects a missing required variable by name", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    await expect(import("./env")).rejects.toThrow(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  });

  it("accepts valid required variables", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishableKey);

    const { env } = await import("./env");

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:54321");
  });

  it("rejects secret or legacy credentials in public configuration without exposing values", () => {
    for (const key of [secretKey, "legacy-jwt-key"]) {
      expect(() =>
        parseEnvironment(publicEnvSchema, {
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
        }),
      ).toThrow(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Expected a Supabase publishable key.",
      );
    }
  });

  it("requires all six core variables and keeps privileged values out of the public result", () => {
    const values = {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      SUPABASE_SECRET_KEY: secretKey,
      APP_ENV: "preview",
      APP_BASE_URL: "https://preview.example.test",
      APP_TIMEZONE: "Asia/Jakarta",
    };
    expect(parseEnvironment(serverEnvSchema, values)).toEqual(values);
    expect(Object.keys(parseEnvironment(publicEnvSchema, values))).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ]);
    for (const key of Object.keys(values))
      expect(() =>
        parseEnvironment(serverEnvSchema, { ...values, [key]: undefined }),
      ).toThrow(key);
    expect(() =>
      parseEnvironment(serverEnvSchema, {
        ...values,
        SUPABASE_SECRET_KEY: publishableKey,
      }),
    ).toThrow("SUPABASE_SECRET_KEY");
    expect(() =>
      parseEnvironment(serverEnvSchema, { ...values, APP_ENV: "staging" }),
    ).toThrow("APP_ENV");
  });

  it("accepts only a Slack Incoming Webhook URL", () => {
    const values = {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      SUPABASE_SECRET_KEY: secretKey,
      APP_ENV: "preview",
      APP_BASE_URL: "https://preview.example.test",
      APP_TIMEZONE: "Asia/Jakarta",
    };
    expect(
      parseEnvironment(serverEnvSchema, {
        ...values,
        SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/test/path/value",
      }).SLACK_WEBHOOK_URL,
    ).toContain("hooks.slack.com/services/");
    expect(() =>
      parseEnvironment(serverEnvSchema, {
        ...values,
        SLACK_WEBHOOK_URL: "https://example.test/services/test/path/value",
      }),
    ).toThrow("SLACK_WEBHOOK_URL");
  });
});
