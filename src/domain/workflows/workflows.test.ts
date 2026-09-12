import { describe, expect, it } from "vitest";
import {
  isDue,
  snapshotSteps,
  completion,
  recomputeRunStatus,
  runTimes,
} from "./index";
import {
  toJakartaDate,
  jakartaWeekBounds,
  jakartaMonthBounds,
  jakartaIsoWeek,
  shiftDate,
} from "../dates";
import { templateSchema, noteInputSchema } from "@/config/workflow-schema";
describe("Phase 3 deterministic workflow rules", () => {
  it("TEST-3.2 daily/weekly cadence covers every weekday; monthly uses first workday", () => {
    const daily = {
      cadence: "daily" as const,
      weekdays: [1, 2, 3, 4, 5],
      is_active: true,
    };
    expect(
      Array.from({ length: 7 }, (_, i) =>
        isDue(daily, shiftDate("2026-09-07", i)),
      ),
    ).toEqual([true, true, true, true, true, false, false]);
    expect(
      Array.from({ length: 7 }, (_, i) =>
        isDue(
          { ...daily, cadence: "weekly", weekdays: [1] },
          shiftDate("2026-09-07", i),
        ),
      ),
    ).toEqual([true, false, false, false, false, false, false]);
    expect(isDue({ ...daily, is_active: false }, "2026-09-07")).toBe(false);
    expect(isDue({ ...daily, weekdays: null }, "2026-09-12")).toBe(true);
    for (const date of ["2026-08-03", "2026-11-02", "2026-09-01"])
      expect(isDue({ ...daily, cadence: "monthly" }, date)).toBe(true);
    expect(isDue({ ...daily, cadence: "monthly" }, "2026-08-01")).toBe(false);
  });
  it("TEST-3.3 WIB midnight, leap month and ISO week-year are timezone independent", () => {
    expect(toJakartaDate("2026-09-11T16:50:00Z")).toBe("2026-09-11");
    expect(toJakartaDate("2026-09-11T16:59:59Z")).toBe("2026-09-11");
    expect(toJakartaDate("2026-09-11T17:00:00Z")).toBe("2026-09-12");
    expect(jakartaWeekBounds("2027-01-01")).toEqual({
      start: "2026-12-28",
      end: "2027-01-03",
    });
    expect(jakartaIsoWeek("2027-01-01")).toBe("2026-W53");
    expect(jakartaIsoWeek("2024-12-30")).toBe("2025-W01");
    expect(jakartaMonthBounds("2024-02-15")).toEqual({
      start: "2024-02-01",
      end: "2024-02-29",
    });
    expect(jakartaMonthBounds("2026-12-31")).toEqual({
      start: "2026-12-01",
      end: "2026-12-31",
    });
    expect(() => shiftDate("2026-02-30", 1)).toThrow();
  });
  it("TEST-3.4 status and required-step progress support undo and optional steps", () => {
    const items = [
      { required_snapshot: true, is_done: false },
      { required_snapshot: false, is_done: false },
    ];
    expect(recomputeRunStatus(items)).toBe("pending");
    expect(recomputeRunStatus([items[0], { ...items[1], is_done: true }])).toBe(
      "in_progress",
    );
    const done = [{ ...items[0], is_done: true }, items[1]];
    expect(recomputeRunStatus(done)).toBe("completed");
    expect(completion(done)).toEqual({ done: 1, total: 1, percentage: 100 });
    expect(
      recomputeRunStatus([{ required_snapshot: false, is_done: false }]),
    ).toBe("pending");
    expect(
      recomputeRunStatus([{ required_snapshot: false, is_done: true }]),
    ).toBe("completed");
    expect(recomputeRunStatus([])).toBe("pending");
    expect(
      runTimes(
        "in_progress",
        { started_at: "earlier", completed_at: "old" },
        "now",
      ),
    ).toEqual({ started_at: "earlier", completed_at: null });
  });
  it("TEST-3.5 snapshot is independent of later template edits", () => {
    const steps = [
      { key: "one", label: "Original", help: "Original help", required: true },
    ];
    const snapshot = snapshotSteps(steps);
    steps[0].label = "Changed";
    steps[0].required = false;
    expect(snapshot[0]).toEqual({
      key: "one",
      label: "Original",
      help: "Original help",
      required: true,
      position: 0,
    });
  });
  it("template/note boundaries reject duplicate keys and malformed inputs", () => {
    const step = { key: "one", label: "Check", help: "", required: true };
    const template = {
      key: "test",
      name: "Test",
      cadence: "daily",
      weekdays: [1],
      steps: [step],
      is_active: true,
    };
    expect(templateSchema.safeParse(template).success).toBe(true);
    expect(
      templateSchema.safeParse({ ...template, steps: [step, step] }).success,
    ).toBe(false);
    expect(
      templateSchema.safeParse({ ...template, weekdays: [9] }).success,
    ).toBe(false);
    expect(noteInputSchema.safeParse({ id: "123", body: "" }).success).toBe(
      false,
    );
  });
});
