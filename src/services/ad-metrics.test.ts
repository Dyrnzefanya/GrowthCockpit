// @vitest-environment node
import { vi, it, expect, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  account: vi.fn(),
  tokenInfo: vi.fn(),
  insights: vi.fn(),
  metaState: vi.fn(),
  commitPage: vi.fn(),
  markFailure: vi.fn(),
  saveTokenMetadata: vi.fn(),
  raiseAlert: vi.fn(),
}));
vi.mock("@/integrations/meta/client", async (original) => ({
  ...(await original<typeof import("@/integrations/meta/client")>()),
  metaClient: () => m,
}));
vi.mock("@/lib/env.server", () => ({ serverEnv: {} }));
vi.mock("@/repositories/ad-metrics", () => m);
vi.mock("@/repositories/integrations", () => ({
  machineSettings: async () => ({
    values: { "meta.primary_result_type": "lead" },
  }),
}));
vi.mock("@/services/alerts", () => ({ raiseAlert: m.raiseAlert }));
vi.mock("@/services/meta-health", () => ({ evaluateMetaHealth: vi.fn() }));
vi.mock("@/services/provider-credentials", () => ({
  resolveMetaCredentials: vi.fn().mockResolvedValue({
    source: "environment",
    credentials: {
      accessToken: "synthetic-meta-token-value",
      adAccountId: "123",
      apiVersion: "v26.0",
    },
    environmentFallbackAvailable: true,
  }),
}));
import { ingestMeta, accountToday } from "./ad-metrics";
let state: string | null;
beforeEach(() => {
  vi.clearAllMocks();
  state = null;
  m.account.mockResolvedValue({
    account_id: "123",
    name: "Fixture",
    currency: "IDR",
    timezone_name: "Asia/Jakarta",
  });
  m.tokenInfo.mockResolvedValue({
    expires_at: null,
    verified_at: new Date().toISOString(),
  });
  m.metaState.mockImplementation(async () => ({ cursor: state }));
  m.commitPage.mockImplementation(async (_run, _account, rows, cursor) => {
    state = cursor;
    return rows.length;
  });
  m.insights.mockResolvedValue({ rows: [], after: null });
});
it("TEST-10.2 previous-day plus three-day lookback repeats the identical dates", async () => {
  await ingestMeta("run", Date.now() + 40000, 500);
  const dates = m.insights.mock.calls.map((c) => c[0]);
  expect(dates).toHaveLength(4);
  expect(state).toBeNull();
  m.insights.mockClear();
  await ingestMeta("run", Date.now() + 40000, 500);
  expect(m.insights.mock.calls.map((c) => c[0])).toEqual(dates);
});
it("NFR-10.2 90-day backfill completes; failed page resumes exact account/date without losing rows", async () => {
  const range = { from: "2025-01-01", to: "2025-03-31" };
  m.insights.mockRejectedValueOnce(new Error("private-payload"));
  const failed = await ingestMeta("run", Date.now() + 40000, 500, range);
  expect(failed.failed).toBe(1);
  expect(JSON.parse(state!).date).toBe(range.from);
  m.insights.mockClear();
  await ingestMeta("run", Date.now() + 40000, 500, range);
  expect(m.insights).toHaveBeenCalledTimes(90);
  expect(state).toBeNull();
  expect(m.markFailure).toHaveBeenCalledWith("run", "META_PROCESSING_FAILED");
});
it("bounded page resume, token warning and timezone day boundaries", async () => {
  const range = { from: "2025-01-01", to: "2025-01-01" };
  m.tokenInfo.mockResolvedValue({
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    verified_at: new Date().toISOString(),
  });
  m.insights.mockResolvedValueOnce({
    rows: [
      {
        date_start: range.from,
        date_stop: range.to,
        campaign_id: "1",
        campaign_name: "Test",
        spend: "10.00",
        impressions: "1",
        clicks: "1",
      },
    ],
    after: "p2",
  });
  expect((await ingestMeta("run", Date.now() + 40000, 1, range)).hasMore).toBe(
    true,
  );
  expect(JSON.parse(state!).after).toBe("p2");
  await ingestMeta("run", Date.now() + 40000, 1);
  expect(m.insights.mock.calls.at(-1)?.[1]).toBe("p2");
  expect(state).toBeNull();
  expect(m.raiseAlert).toHaveBeenCalled();
  expect(accountToday("Asia/Jakarta", new Date("2026-09-14T17:00:00Z"))).toBe(
    "2026-09-15",
  );
  expect(
    accountToday("America/Los_Angeles", new Date("2026-09-14T17:00:00Z")),
  ).toBe("2026-09-14");
});
