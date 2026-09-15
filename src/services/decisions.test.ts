// @vitest-environment node
import { it, expect, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  facts: vi.fn(),
  actions: vi.fn(),
  state: vi.fn(),
  commit: vi.fn(),
  resolve: vi.fn(),
}));
vi.mock("@/repositories/decisions", () => mocks);
vi.mock("@/repositories/alerts", () => ({ resolveMissing: mocks.resolve }));
vi.mock("@/repositories/integrations", async () => ({
  machineSettings: async () => ({
    values: (await import("@/config/settings-schema")).settingsDefaults,
  }),
}));
vi.mock("@/repositories/settings", () => ({ readSettings: vi.fn() }));
vi.mock("@/services/session", () => ({ requireUser: vi.fn() }));
import { runDecisions, dismissalCandidates } from "./decisions";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.mockResolvedValue(null);
  mocks.actions.mockResolvedValue([]);
  mocks.commit.mockResolvedValue(1);
  mocks.facts.mockResolvedValue({
    ads: [],
    identities: [],
    leads: [],
    followups: [],
    experiments: [],
    outcomes: { due: 0, closed: 0 },
    states: [],
  });
});
it("TEST-11.7 persists unavailable-source suppression with evidence and a fix-measurement action", async () => {
  const result = await runDecisions(
    "run",
    Date.now() + 30000,
    40,
    new Date("2026-09-15T00:00:00Z"),
  );
  expect(result.hasMore).toBe(false);
  expect(result.written).toBe(1);
  const rows = mocks.commit.mock.calls[0][1];
  expect(rows[0]).toMatchObject({
    rule_key: "R-00",
    rule_version: "r1",
    verdict: "SUPPRESSED",
    scope_type: "integration",
    evidence: { settings: { targetCpql: null } },
    alert: { source: "decisions", notify: false },
  });
  expect(mocks.resolve).toHaveBeenCalledWith(
    ["decision_recommendation", "tracking_failure"],
    [],
    "2026-09-15T00:00:00.000Z",
  );
});
it("does not acknowledge success or clear active conditions when persistence fails", async () => {
  mocks.commit.mockRejectedValue(new Error("DB_FAILED"));
  await expect(runDecisions("run", Date.now() + 30000, 40)).rejects.toThrow(
    "DB_FAILED",
  );
  expect(mocks.resolve).not.toHaveBeenCalled();
});
it("enforces the bounded commit deadline without dropping a partial audit batch", async () => {
  await expect(runDecisions("run", Date.now() + 100, 40)).rejects.toThrow(
    "DECISION_BUDGET_EXCEEDED",
  );
  expect(mocks.commit).not.toHaveBeenCalled();
});
it("FR-11.8 counts dismissals across occurrences within thirty days only", async () => {
  const now = Date.now();
  mocks.actions.mockResolvedValue([
    {
      alert_key: "same-rule-scope",
      dismissed_reason: "Review",
      action_dismissals: [
        { at: new Date(now - 86400000).toISOString() },
        { at: new Date(now - 2 * 86400000).toISOString() },
      ],
    },
    {
      alert_key: "same-rule-scope",
      dismissed_reason: "Review",
      action_dismissals: [
        { at: new Date(now - 3 * 86400000).toISOString() },
        { at: new Date(now - 31 * 86400000).toISOString() },
      ],
    },
    {
      alert_key: "other-scope",
      dismissed_reason: null,
      action_dismissals: [{ at: new Date(now).toISOString() }],
    },
  ]);
  expect(await dismissalCandidates()).toEqual([
    { key: "same-rule-scope", count: 3, reason: "Review" },
  ]);
});
it("bounded batches resume with the original evaluation clock and clear retired scopes only at completion", async () => {
  const raw = {
    ads: [],
    identities: [],
    leads: [],
    experiments: [],
    outcomes: { due: 0, closed: 0 },
    states: [],
    followups: Array.from({ length: 41 }, (_, n) => ({
      id: `11111111-1111-4111-8111-${String(n).padStart(12, "0")}`,
      qualification_status: "mql",
      last_activity: "2026-09-01T00:00:00Z",
      pipeline_value: null,
      pipeline_currency: null,
      stage_category: null,
    })),
  };
  mocks.facts.mockResolvedValue(raw);
  const first = await runDecisions(
    "first",
    Date.now() + 30000,
    40,
    new Date("2026-09-15T00:00:00Z"),
  );
  expect(first.read).toBe(40);
  expect(first.hasMore).toBe(true);
  expect(mocks.resolve).not.toHaveBeenCalled();
  mocks.state.mockResolvedValue(first.cursor);
  const second = await runDecisions(
    "second",
    Date.now() + 30000,
    40,
    new Date("2026-09-16T00:00:00Z"),
  );
  expect(second.read).toBe(2);
  expect(second.hasMore).toBe(false);
  expect(mocks.commit.mock.calls[1][1][0].evaluated_at).toBe(
    "2026-09-15T00:00:00.000Z",
  );
});
