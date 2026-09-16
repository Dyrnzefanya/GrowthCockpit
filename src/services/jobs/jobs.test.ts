// @vitest-environment node
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  accept: vi.fn(),
  claim: vi.fn(),
  machineSettings: vi.fn(),
  finishEvent: vi.fn(),
  startJob: vi.fn(),
  finishRun: vi.fn(),
  dueExists: vi.fn(),
  lead: vi.fn(),
  user: vi.fn(),
  can: vi.fn(),
  after: vi.fn(),
  stale: vi.fn(),
  health: vi.fn(),
  dispatch: vi.fn(),
  weekly: vi.fn(),
  runRetention: vi.fn(),
  safeRaise: vi.fn(),
}));
const env = vi.hoisted(() => ({
  APP_ENV: "production",
  APP_BASE_URL: "http://localhost",
  JOBS_ENABLED: "true",
  CRON_SECRET: "",
  INGEST_HMAC_SECRET: "",
  INGEST_HMAC_SECRET_PREVIOUS: undefined as string | undefined,
}));
vi.mock("@/lib/env.server", () => ({ serverEnv: env }));
vi.mock("@/repositories/integrations", () => mocks);
vi.mock("@/lib/http/idempotency", () => ({ insertOrReturn: mocks.accept }));
vi.mock("@/services/leads", () => ({ ingestLead: mocks.lead }));
vi.mock("@/repositories/auth", () => ({ authenticatedUser: mocks.user }));
vi.mock("@/lib/auth/can", () => ({ can: mocks.can }));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/services/alert-jobs", () => ({
  runStaleLeads: mocks.stale,
  runDataHealth: mocks.health,
  dispatchNotifications: mocks.dispatch,
}));
vi.mock("@/services/alerts", () => ({ safelyRaise: mocks.safeRaise }));
vi.mock("@/services/meta-health", () => ({ evaluateMetaHealth: vi.fn() }));
vi.mock("@/services/reports", () => ({ runWeeklyReport: mocks.weekly }));
import { runJob, dispatchJob } from "./runner";
import { receiveLead, processNext } from "../integration-runs";
import { sign } from "@/lib/http/hmac";
const key = "JOB-RETRY-EVENTS",
  payload = { source_channel: "web_form", occurred_at: "2026-09-14T00:00:00Z" };
beforeEach(() => {
  vi.resetAllMocks();
  env.CRON_SECRET = randomBytes(32).toString("hex");
  env.INGEST_HMAC_SECRET = randomBytes(32).toString("hex");
  env.JOBS_ENABLED = "true";
  env.APP_ENV = "production";
  mocks.accept.mockImplementation(async (e) => ({ inserted: true, event: e }));
  mocks.startJob.mockResolvedValue(randomUUID());
  mocks.claim.mockResolvedValue(null);
  mocks.machineSettings.mockResolvedValue({
    values: { "jobs.max_batch": 2, "jobs.max_attempts": 5 },
  });
  mocks.dueExists.mockResolvedValue(false);
  mocks.user.mockResolvedValue({ email_confirmed_at: "2026-01-01" });
  mocks.can.mockResolvedValue(true);
  const alertJobResult = {
    read: 1,
    written: 1,
    failed: 0,
    hasMore: false,
    cursor: null,
  };
  mocks.stale.mockResolvedValue(alertJobResult);
  mocks.health.mockResolvedValue(alertJobResult);
  mocks.dispatch.mockResolvedValue(alertJobResult);
  mocks.weekly.mockResolvedValue(alertJobResult);
  mocks.runRetention.mockResolvedValue({
    payloads_cleared: 2,
    runs_pruned: 3,
  });
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function request(
  body = JSON.stringify(payload),
  signed = true,
  headers: Record<string, string> = {},
) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  return new Request("http://localhost/api/ingest/lead", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "x-timestamp": timestamp,
      "idempotency-key": randomUUID(),
      ...(signed
        ? {
            "x-signature": sign(
              env.INGEST_HMAC_SECRET,
              timestamp,
              "POST",
              "/api/ingest/lead",
              Buffer.from(body),
            ),
          }
        : {}),
      ...headers,
    },
  });
}
it("durably accepts then schedules shared-service work; replay writes no second execution", async () => {
  expect((await receiveLead(request())).status).toBe(202);
  expect(mocks.after).toHaveBeenCalledOnce();
  expect(mocks.lead).not.toHaveBeenCalled();
  const first = mocks.accept.mock.calls[0][0];
  mocks.accept.mockResolvedValue({ inserted: false, event: first });
  const replay = await receiveLead(request());
  expect(replay.status).toBe(200);
  expect((await replay.json()).replayed).toBe(true);
  expect(mocks.after).toHaveBeenCalledOnce();
});
it("unauthenticated and oversized rejections never store their bodies; valid invalid payload is auditable", async () => {
  const pii = '{"contact":{"email":"privacy@example.test"}}';
  expect((await receiveLead(request(pii, false))).status).toBe(401);
  expect(mocks.accept.mock.calls.at(-1)![0].payload).toBeNull();
  expect(
    (await receiveLead(request(pii, true, { "content-type": "text/plain" })))
      .status,
  ).toBe(415);
  expect(mocks.accept.mock.calls.at(-1)![0].payload).toBeNull();
  expect(
    (await receiveLead(request(pii, true, { "content-length": "999999" })))
      .status,
  ).toBe(413);
  expect((await receiveLead(request(pii))).status).toBe(400);
  expect(mocks.accept.mock.calls.at(-1)![0].signature_valid).toBe(true);
  expect((await receiveLead(request("{"))).status).toBe(400);
  expect(mocks.after).not.toHaveBeenCalled();
});
it("TEST-7.9/10/12 retries system failures and terminates validation with scrubbed errors", async () => {
  const event = {
    id: randomUUID(),
    claim_id: randomUUID(),
    payload,
    attempts: 1,
  };
  mocks.claim.mockResolvedValue(event);
  mocks.lead.mockRejectedValue(new Error("UPSTREAM_UNAVAILABLE"));
  await processNext(null, "schedule", 5);
  expect(mocks.finishEvent.mock.calls[0][1]).toBe("failed");
  expect(mocks.finishEvent.mock.calls[0][3]).not.toBeNull();
  mocks.claim.mockResolvedValue({ ...event, attempts: 5 });
  await processNext(null, "schedule", 5);
  expect(mocks.finishEvent.mock.calls.at(-1)![1]).toBe("dead_letter");
  mocks.claim.mockResolvedValue({ ...event, payload: { invalid: true } });
  await processNext(null, "schedule", 5);
  expect(mocks.finishEvent.mock.calls.at(-1)![1]).toBe("rejected");
  mocks.claim.mockResolvedValue(event);
  mocks.lead.mockRejectedValue(new Error("privacy@example.test"));
  await processNext(null, "schedule", 5);
  expect(mocks.finishEvent.mock.calls.at(-1)![2]).toBe("INTERNAL");
});
it("TEST-7.8/11 job concurrency, bounded batches, double-run and failure capture", async () => {
  mocks.startJob.mockResolvedValueOnce(null);
  expect((await runJob(key, "manual")).http).toBe(409);
  expect(mocks.claim).not.toHaveBeenCalled();
  const event = {
    id: randomUUID(),
    claim_id: randomUUID(),
    payload,
    attempts: 1,
  };
  mocks.claim.mockResolvedValue(event);
  mocks.lead.mockResolvedValue({ status: "created" });
  mocks.dueExists.mockResolvedValue(true);
  const first = await runJob(key, "manual");
  expect(first).toMatchObject({
    status: "partial",
    records_read: 2,
    hasMore: true,
  });
  expect(mocks.lead).toHaveBeenCalledTimes(2);
  mocks.claim.mockResolvedValue(null);
  mocks.dueExists.mockResolvedValue(false);
  expect(await runJob(key, "manual")).toMatchObject({
    status: "success",
    records_written: 0,
  });
  mocks.claim.mockRejectedValue(new Error("unexpected secret text"));
  expect(await runJob(key, "manual")).toMatchObject({
    status: "failed",
    http: 200,
    code: "INTERNAL",
  });
  expect(mocks.finishRun).toHaveBeenLastCalledWith(
    expect.any(String),
    "failed",
    0,
    0,
    1,
    "INTERNAL",
    null,
  );
  expect((await runJob("UNKNOWN", "manual")).http).toBe(404);
});
it("stops before timeout and leaves due work resumable", async () => {
  vi.useFakeTimers();
  mocks.machineSettings.mockImplementation(async () => {
    vi.advanceTimersByTime(18000);
    return { values: { "jobs.max_batch": 500, "jobs.max_attempts": 5 } };
  });
  mocks.dueExists.mockResolvedValue(true);
  expect(await runJob(key, "manual")).toMatchObject({
    status: "partial",
    hasMore: true,
    records_read: 0,
  });
  expect(mocks.claim).not.toHaveBeenCalled();
});
it("TEST-9.10 runs every Phase 9 job through the existing lease and remains repeatable", async () => {
  for (const [key, handler] of [
    ["JOB-STALE-LEADS", mocks.stale],
    ["JOB-DATA-HEALTH", mocks.health],
    ["JOB-NOTIFY-DISPATCH", mocks.dispatch],
  ] as const) {
    expect(await runJob(key, "manual")).toMatchObject({ status: "success" });
    expect(await runJob(key, "manual")).toMatchObject({ status: "success" });
    expect(handler).toHaveBeenCalledTimes(2);
    handler.mockClear();
  }
});
it("JOB-12.1 runs weekly draft generation through the existing lease and remains repeatable", async () => {
  expect(await runJob("JOB-WEEKLY-REPORT", "manual")).toMatchObject({
    status: "success",
    records_written: 1,
  });
  expect(await runJob("JOB-WEEKLY-REPORT", "manual")).toMatchObject({
    status: "success",
  });
  expect(mocks.weekly).toHaveBeenCalledTimes(2);
});
it("TEST-13.7 runs retention through the existing lease and remains repeatable", async () => {
  expect(await runJob("JOB-RETENTION", "manual")).toMatchObject({
    status: "success",
    records_read: 5,
    records_written: 5,
  });
  expect(await runJob("JOB-RETENTION", "manual")).toMatchObject({
    status: "success",
  });
  expect(mocks.runRetention).toHaveBeenCalledTimes(2);
});
it("TEST-7.7 bearer and session paths reject wrong secrets, cross-origin requests and GET sessions", async () => {
  const req = (headers: Record<string, string> = {}, method = "POST") =>
    new Request("http://localhost/api/jobs/" + key, { method, headers });
  expect(
    (await dispatchJob(req({ authorization: "Bearer wrong" }), key)).status,
  ).toBe(401);
  expect(
    (await dispatchJob(req({ origin: "https://attacker.test" }), key)).status,
  ).toBe(403);
  expect(
    (await dispatchJob(req({ origin: "http://localhost" }, "GET"), key)).status,
  ).toBe(401);
  mocks.user.mockResolvedValueOnce(null);
  expect(
    (await dispatchJob(req({ origin: "http://localhost" }), key)).status,
  ).toBe(401);
  expect(
    (await dispatchJob(req({ origin: "http://localhost" }), key)).status,
  ).toBe(200);
  expect(
    (
      await dispatchJob(
        req({ authorization: `Bearer ${env.CRON_SECRET}` }, "GET"),
        key,
      )
    ).status,
  ).toBe(200);
  env.APP_ENV = "preview";
  expect(
    (
      await dispatchJob(
        req({ authorization: `Bearer ${env.CRON_SECRET}` }),
        key,
      )
    ).status,
  ).toBe(503);
});
