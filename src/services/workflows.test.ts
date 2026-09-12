import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const repo = vi.hoisted(() => ({
  readTemplates: vi.fn(),
  readRuns: vi.fn(),
  insertRun: vi.fn(),
  readRun: vi.fn(),
  commitItem: vi.fn(),
}));
vi.mock("@/repositories/workflows", () => repo);
vi.mock("@/services/session", () => ({
  requireUser: vi.fn(async () => ({ id: "user" })),
}));
vi.mock("@/lib/auth/can", () => ({ can: vi.fn(async () => true) }));
import { getOrCreateRunsForDate, updateWorkflowItem } from "./workflows";
beforeEach(() => vi.resetAllMocks());
it("TEST-3.1 materialisation retries a concurrent template edit using fresh cadence", async () => {
  const template = {
    id: "template",
    version: 1,
    name: "Test",
    cadence: "daily",
    weekdays: [1],
    is_active: true,
    steps: [{ key: "one", label: "Original", help: "", required: true }],
  };
  repo.readTemplates
    .mockResolvedValueOnce([template])
    .mockResolvedValueOnce([{ ...template, is_active: false, version: 2 }]);
  repo.readRuns.mockResolvedValue([]);
  repo.insertRun.mockRejectedValueOnce(new Error("CONFLICT"));
  expect(
    await getOrCreateRunsForDate(new Date("2026-09-14T00:00:00Z")),
  ).toEqual([]);
  expect(repo.insertRun).toHaveBeenCalledTimes(1);
});
it("TEST-3.4 a concurrent item write recomputes from fresh rows before retry", async () => {
  const runId = "44444444-4444-4444-8444-444444444444",
    itemId = "55555555-5555-4555-8555-555555555555";
  const item = {
    id: itemId,
    run_id: runId,
    is_done: false,
    required_snapshot: true,
    completed_at: null,
    notes: "Keep note",
  };
  const other = { ...item, id: "66666666-6666-4666-8666-666666666666" };
  const run = {
    id: runId,
    updated_at: "earlier",
    started_at: null,
    completed_at: null,
    workflow_items: [item, other],
  };
  repo.readRun.mockResolvedValueOnce(run).mockResolvedValueOnce({
    ...run,
    updated_at: "later",
    workflow_items: [item, { ...other, is_done: true }],
  });
  repo.commitItem
    .mockRejectedValueOnce(new Error("CONFLICT"))
    .mockResolvedValueOnce(undefined);
  await updateWorkflowItem({ runId, itemId, done: true });
  expect(repo.commitItem).toHaveBeenCalledTimes(2);
  expect(repo.commitItem.mock.calls[0][2]).toBe("in_progress");
  expect(repo.commitItem.mock.calls[1][2]).toBe("completed");
  expect(repo.commitItem.mock.calls[1][1].notes).toBe("Keep note");
});
