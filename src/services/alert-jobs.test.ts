// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  reactivate: vi.fn(),
  pending: vi.fn(),
  notified: vi.fn(),
  record: vi.fn(),
  health: vi.fn(),
  unresolved: vi.fn(),
  resolveMissing: vi.fn(),
  raiseMany: vi.fn(),
  send: vi.fn(),
  safeRaise: vi.fn(),
}));
vi.mock("@/repositories/alerts", () => ({
  reactivate: mocks.reactivate,
  pending: mocks.pending,
  notifiedForKeys: mocks.notified,
  recordDelivery: mocks.record,
  healthFacts: mocks.health,
  unresolved: mocks.unresolved,
  resolveMissing: mocks.resolveMissing,
}));
vi.mock("@/services/alerts", () => ({
  safelyRaise: mocks.safeRaise,
  raiseAlerts: mocks.raiseMany,
}));
vi.mock("@/repositories/integrations", () => ({
  machineSettings: vi.fn().mockResolvedValue({
    values: { "health.min_coverage": 0.8 },
  }),
}));
vi.mock("@/integrations/slack/client", () => ({ sendSlack: mocks.send }));
vi.mock("@/services/provider-credentials", () => ({
  resolveMetaCredentials: async () => ({
    source: "none",
    credentials: null,
    environmentFallbackAvailable: false,
  }),
  resolveHubspotCredentials: async () => ({
    source: "none",
    credentials: null,
    environmentFallbackAvailable: false,
  }),
}));
vi.mock("@/lib/env.server", () => ({
  serverEnv: {
    APP_BASE_URL: "https://app.example.test",
    APP_ENV: "production",
    JOBS_ENABLED: "true",
  },
}));
import { dispatchNotifications, runDataHealth } from "./alert-jobs";
import { jobs } from "./jobs/registry";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.notified.mockResolvedValue([]);
});
it("Phase 10 unconfigured Meta does not create scheduler noise", async () => {
  mocks.health.mockResolvedValue({
    events: [],
    states: [],
    coverage: [],
    runs: [],
  });
  mocks.unresolved.mockResolvedValue([]);
  mocks.resolveMissing.mockResolvedValue(0);
  await runDataHealth(Date.now() + 10000, 500);
  expect(
    mocks.raiseMany.mock.calls[0][0].some((candidate: { keyParts: string[] }) =>
      candidate.keyParts.includes("JOB-META-INGEST"),
    ),
  ).toBe(false);
});

it("dispatches one eligible MQL alert exactly once and records the send", async () => {
  const alert = {
    id: "00000000-0000-4000-8000-000000000001",
    alert_key: "new_mql:00000000-0000-4000-8000-000000000001",
    type: "new_mql",
    severity: "info",
    entity_type: "lead",
    entity_id: "00000000-0000-4000-8000-000000000001",
    first_seen_at: "2026-09-14T01:00:00Z",
    notification_attempts: 0,
    evidence: {},
  };
  mocks.pending.mockResolvedValue([alert]);
  mocks.send.mockResolvedValue(undefined);
  await dispatchNotifications(
    Date.now() + 10000,
    100,
    5,
    new Date("2026-09-14T06:00:00Z"),
  );
  expect(mocks.send).toHaveBeenCalledOnce();
  expect(mocks.record).toHaveBeenCalledWith([alert.id], "sent", null, null, 5);
});

it("NFR-9.1 evaluates a bounded day-health batch within ten seconds", async () => {
  const now = new Date("2026-09-14T06:00:00Z");
  mocks.health.mockResolvedValue({
    events: Array.from({ length: 500 }, (_, index) => ({
      id: `00000000-0000-4000-8${String(index).padStart(3, "0")}-000000000001`,
      source: "landing_page",
      last_error: "RETRY_EXHAUSTED",
    })),
    states: [],
    coverage: [],
    runs: jobs.map((job) => ({
      job_key: job.key,
      started_at: now.toISOString(),
      status: "success",
    })),
  });
  mocks.unresolved.mockResolvedValue([]);
  mocks.resolveMissing.mockResolvedValue(0);
  const started = performance.now();
  const result = await runDataHealth(Date.now() + 10000, 500, now);
  expect(performance.now() - started).toBeLessThan(10000);
  expect(result.read).toBe(500 + jobs.length);
  expect(mocks.health).toHaveBeenCalledWith(500);
  expect(mocks.raiseMany).toHaveBeenCalledOnce();
});

it("TEST-9.8 persists delivery failure, retries, and raises a terminal in-app alert", async () => {
  const alert = {
    id: "11111111-1111-4111-8111-111111111111",
    alert_key: "new_mql:11111111-1111-4111-8111-111111111111",
    type: "new_mql",
    severity: "info",
    entity_type: "lead",
    entity_id: "11111111-1111-4111-8111-111111111111",
    first_seen_at: "2026-09-14T01:00:00Z",
    notification_attempts: 4,
    evidence: { reason_code: "Q_BUSINESS" },
  };
  mocks.pending.mockResolvedValue([alert]);
  mocks.send.mockRejectedValue(new Error("TIMEOUT"));
  const result = await dispatchNotifications(
    Date.now() + 10000,
    100,
    5,
    new Date("2026-09-14T06:00:00Z"),
  );
  expect(result.failed).toBe(1);
  expect(mocks.record).toHaveBeenCalledWith(
    [alert.id],
    "failed",
    "TIMEOUT",
    null,
    1,
  );
  expect(mocks.safeRaise).toHaveBeenCalledWith(
    expect.objectContaining({ type: "slack_delivery_failure" }),
  );
});

it("does not call Slack for a key already delivered on the WIB date", async () => {
  const alert = {
    id: "22222222-2222-4222-8222-222222222222",
    alert_key: "new_mql:22222222-2222-4222-8222-222222222222",
    type: "new_mql",
    severity: "info",
    entity_type: "lead",
    entity_id: "22222222-2222-4222-8222-222222222222",
    first_seen_at: "2026-09-14T01:00:00Z",
    notification_attempts: 0,
    evidence: {},
  };
  mocks.pending.mockResolvedValue([alert]);
  mocks.notified.mockResolvedValue([
    { alert_key: alert.alert_key, last_notified_at: "2026-09-14T02:00:00Z" },
  ]);
  await dispatchNotifications(
    Date.now() + 10000,
    100,
    5,
    new Date("2026-09-14T06:00:00Z"),
  );
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.record).toHaveBeenCalledWith(
    [alert.id],
    "deferred",
    "daily_cap",
    "2026-09-15T00:00:00.000Z",
    5,
  );
});
