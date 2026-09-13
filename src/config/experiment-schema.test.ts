import { describe, expect, it } from "vitest";
import {
  completionInputSchema,
  experimentInputSchema,
  externalRefsSchema,
} from "./experiment-schema";

describe("Phase 5 experiment boundaries", () => {
  const experiment = {
    title: "Creative test",
    hypothesis: "A clear message improves response",
    variable: "message",
    primaryKpi: "MQL rate",
    startDate: "2026-09-13",
    reviewDate: "2026-09-16",
    externalRefs: {},
  };

  it("accepts the six required creation fields with safe defaults", () => {
    expect(experimentInputSchema.parse(experiment)).toMatchObject({
      priority: 3,
      confidence: 3,
      effort: 3,
    });
  });

  it("rejects malformed dates, ranges and external references", () => {
    expect(
      experimentInputSchema.safeParse({ ...experiment, startDate: "bad" })
        .success,
    ).toBe(false);
    expect(
      experimentInputSchema.safeParse({ ...experiment, effort: 0 }).success,
    ).toBe(false);
    expect(
      externalRefsSchema.safeParse({ landingPageUrl: "javascript:alert(1)" })
        .success,
    ).toBe(false);
    expect(externalRefsSchema.safeParse({ unknown: "value" }).success).toBe(
      false,
    );
  });

  it("TEST-5.3 requires every completion field including learning", () => {
    const completion = {
      id: "55555555-5555-4555-8555-555555555555",
      revision: "2026-09-13T01:02:03+00:00",
      from: "running",
      outcome: "win",
      primaryKpiResult: 12,
      observedResults: 10,
      conclusion: "The change worked",
      learning: "Keep the message specific",
      nextAction: "Repeat on another audience",
    };
    expect(completionInputSchema.safeParse(completion).success).toBe(true);
    expect(
      completionInputSchema.safeParse({ ...completion, learning: " " }).success,
    ).toBe(false);
  });
});
