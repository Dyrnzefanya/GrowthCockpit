// @vitest-environment node
import { vi, it, expect, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  data: vi.fn(),
  raise: vi.fn(),
  resolve: vi.fn(),
}));
vi.mock("@/repositories/ad-metrics", () => ({ metaHealthData: m.data }));
vi.mock("@/repositories/settings", () => ({ readSettings: vi.fn() }));
vi.mock("@/repositories/integrations", () => ({
  machineSettings: async () => ({
    values: { "meta.primary_result_type": null, "meta.freshness_hours": 24 },
  }),
}));
vi.mock("@/repositories/alerts", () => ({ resolveMissing: m.resolve }));
vi.mock("@/services/alerts", () => ({ raiseAlerts: m.raise }));
vi.mock("@/lib/env.server", () => ({
  serverEnv: { META_ACCESS_TOKEN: "synthetic", META_AD_ACCOUNT_ID: "123" },
}));
import { evaluateMetaHealth } from "./meta-health";
const now = new Date("2026-09-15T00:00:00Z");
beforeEach(() => vi.clearAllMocks());
it("TEST-10.3/7 currency refusal and stale/14-day expiry create deduplicated actionable conditions", async () => {
  m.data.mockResolvedValue({
    accounts: [],
    state: {
      last_success_at: "2026-09-12T00:00:00Z",
      cursor: null,
      last_error: null,
    },
    token: {
      expires_at: "2026-09-29T00:00:00Z",
      verified_at: now.toISOString(),
    },
    facts: {
      names: [],
      currencies: [{ currency: "IDR" }, { currency: "USD" }],
    },
  });
  expect(await evaluateMetaHealth(now)).toBe(3);
  expect(m.raise.mock.calls[0][0].map((v: { type: string }) => v.type)).toEqual(
    ["meta_currency_mismatch", "meta_stale", "meta_token_expiring"],
  );
  await evaluateMetaHealth(now);
  expect(m.raise.mock.calls[0][0]).toEqual(m.raise.mock.calls[1][0]);
});
it("recovery auto-resolves cleared conditions; never reports unknown token as expiring", async () => {
  m.data.mockResolvedValue({
    accounts: [],
    state: {
      last_success_at: now.toISOString(),
      cursor: null,
      last_error: null,
    },
    token: null,
    facts: { names: [], currencies: [] },
  });
  expect(await evaluateMetaHealth(now)).toBe(0);
  expect(m.resolve.mock.calls[0][1]).toEqual([]);
});
