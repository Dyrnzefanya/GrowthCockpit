// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  dashboard: vi.fn(),
  requireUser: vi.fn(),
  notificationVolume: vi.fn(),
}));
const environment = vi.hoisted(() => ({
  APP_ENV: "production",
  CRON_SECRET: "configured",
  JOBS_ENABLED: "true",
  INGEST_HMAC_SECRET: "configured",
  SLACK_WEBHOOK_URL: "configured",
  META_ACCESS_TOKEN: undefined as string | undefined,
  META_AD_ACCOUNT_ID: undefined as string | undefined,
  HUBSPOT_ACCESS_TOKEN: "configured",
  HUBSPOT_PORTAL_ID: "123",
}));
vi.mock("@/repositories/integrations", () => ({ dashboard: mocks.dashboard }));
vi.mock("@/services/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/repositories/alerts", () => ({
  notificationVolume: mocks.notificationVolume,
}));
vi.mock("@/lib/env.server", () => ({ serverEnv: environment }));
vi.mock("@/services/provider-credentials", () => ({
  resolveMetaCredentials: vi.fn().mockResolvedValue({
    source: "none",
    credentials: null,
    environmentFallbackAvailable: false,
  }),
  resolveHubspotCredentials: vi.fn().mockResolvedValue({
    source: "environment",
    credentials: {
      accessToken: "configured",
      portalId: "123",
    },
    environmentFallbackAvailable: true,
  }),
}));

import { integrationModel } from "./integration-health";

beforeEach(() => {
  mocks.notificationVolume.mockResolvedValue([]);
  mocks.dashboard.mockResolvedValue({
    runs: [],
    total: 0,
    dead: [],
    deadTotal: 0,
    rejected: [],
    rejectedTotal: 0,
    states: [
      {
        integration: "jobs",
        resource: "JOB-NOTIFY-DISPATCH",
        last_run_at: new Date().toISOString(),
        last_success_at: null,
        consecutive_failures: 2,
        last_error: "UPSTREAM_RATE_LIMITED",
      },
    ],
  });
});

it("TEST-13.8 exposes every job and preserves configuration/failure evidence", async () => {
  const model = await integrationModel();
  expect(model.jobHealth).toHaveLength(9);
  expect(
    model.jobHealth.find((job) => job.key === "JOB-RETENTION"),
  ).toBeDefined();
  expect(
    model.jobHealth.find((job) => job.key === "JOB-META-INGEST")?.health,
  ).toBe("not_configured");
  expect(
    model.jobHealth.find((job) => job.key === "JOB-NOTIFY-DISPATCH"),
  ).toMatchObject({
    health: "failing",
    failures: 2,
    error: "UPSTREAM_RATE_LIMITED",
  });
});
