import { describe, expect, it } from "vitest";
import {
  assertTransition,
  daysBetween,
  durationWarning,
  orderBacklog,
  priorityScore,
  sampleEvidence,
  timing,
  transitions,
  type ExperimentStatus,
} from "./state";

describe("Phase 5 experiment state", () => {
  it("TEST-5.1 exhaustively accepts only the transition table", () => {
    const statuses = Object.keys(transitions) as ExperimentStatus[];
    for (const from of statuses)
      for (const to of statuses) {
        const allowed = transitions[from].includes(to);
        if (allowed) expect(() => assertTransition(from, to)).not.toThrow();
        else
          expect(() => assertTransition(from, to)).toThrow(
            /^BUSINESS_RULE_REJECTED: allowed /,
          );
      }
  });

  it("TEST-5.4 scores and orders priority deterministically", () => {
    expect(priorityScore(5, 4, 2)).toBe(10);
    expect(priorityScore(3, 3, 5)).toBe(1.8);
    expect(priorityScore(1, 1, 3)).toBe(0.33);
    const ordered = orderBacklog([
      {
        code: "EXP-2026-002",
        priority: 3,
        confidence: 3,
        effort: 3,
        created_at: "2026-09-13T00:00:01Z",
      },
      {
        code: "EXP-2026-003",
        priority: 5,
        confidence: 4,
        effort: 2,
        created_at: "2026-09-13T00:00:02Z",
      },
      {
        code: "EXP-2026-001",
        priority: 3,
        confidence: 3,
        effort: 3,
        created_at: "2026-09-13T00:00:00Z",
      },
    ]);
    expect(ordered.map((item) => item.code)).toEqual([
      "EXP-2026-003",
      "EXP-2026-001",
      "EXP-2026-002",
    ]);
  });

  it("TEST-5.5 warns on short duration and insufficient samples", () => {
    expect(daysBetween("2026-12-31", "2027-01-03")).toBe(3);
    expect(durationWarning("2026-09-13", "2026-09-15", 3)).toContain("2 hari");
    expect(durationWarning("2026-09-13", "2026-09-16", 3)).toBeNull();
    expect(durationWarning("", "2026-09-16", 3)).toBeNull();
    expect(sampleEvidence(9, 10)).toMatchObject({
      sample_warning: true,
      verdict_label: "inconclusive_by_default",
    });
    expect(sampleEvidence(10, 10).sample_warning).toBe(false);
  });

  it("reports elapsed and review timing across overdue dates", () => {
    expect(timing("2026-09-10", "2026-09-15", "2026-09-13")).toEqual({
      elapsedDays: 3,
      daysUntilReview: 2,
    });
    expect(timing("2026-09-10", "2026-09-12", "2026-09-13")).toEqual({
      elapsedDays: 3,
      daysUntilReview: -1,
    });
  });
});
