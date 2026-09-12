import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/services/session", () => ({
  requireUser: async () => ({ id: "user" }),
}));
const data = vi.hoisted(() => ({
  runs: vi.fn(),
  notes: vi.fn(),
  existing: vi.fn(),
}));
vi.mock("@/services/workflows", () => ({
  getOrCreateRunsForDate: data.runs,
  runView: (run: unknown) => run,
}));
vi.mock("@/repositories/workflows", () => ({ readRuns: data.existing }));
vi.mock("@/repositories/notes", () => ({ readNotes: data.notes }));
import { todayModel } from "./workflow-pages";
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});
it("an empty scheduled day stays empty and uses the Jakarta business date", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-12T16:50:00Z"));
  data.runs.mockResolvedValue([]);
  data.notes.mockResolvedValue({ notes: [], total: 0 });
  const model = await todayModel({
    note_date: "2099-01-01",
    note_page: "invalid",
  });
  expect(model.today).toBe("2026-09-12");
  expect(model.runs).toEqual([]);
  expect(model.runError).toBe(false);
  expect(data.notes).toHaveBeenCalledWith("2026-09-12", 0);
});
it("a materialization failure preserves existing runs and the independent notes section", async () => {
  data.runs.mockRejectedValue(new Error("Unavailable"));
  data.existing.mockResolvedValue([{ id: "existing" }]);
  data.notes.mockResolvedValue({
    notes: [{ body: "Saved observation" }],
    total: 1,
  });
  const model = await todayModel({});
  expect(model.runError).toBe(true);
  expect(model.runs).toEqual([{ id: "existing" }]);
  expect(model.noteError).toBe(false);
  expect(model.noteTotal).toBe(1);
});
