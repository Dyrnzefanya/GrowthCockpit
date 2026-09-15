import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { registry, evaluate } from "./index";
import { rank, snoozeWorsened, type PriorityItem } from "./priority";
import type { Input, Settings, RuleKey } from "./types";
export const clock = Date.parse("2026-09-15T00:00:00Z");
export const settings: Settings = {
  targetCpql: 100,
  currency: "IDR",
  frequency: 3,
  minResults: 10,
  minCoverage: 0.7,
  minOutcome: 0.6,
  maturityDays: 14,
  cplRise: 0.2,
  cpqlFall: 0.1,
  qualityFall: 0.25,
  ctrFall: 0.25,
};
export const campaign: Input = {
  scope: "campaign",
  id: "campaign-a",
  label: "Campaign A",
  window: {
    from: "2026-09-08",
    to: "2026-09-14",
    previousFrom: "2026-08-25",
    previousTo: "2026-09-07",
    qualityFrom: "2026-08-25",
    qualityTo: "2026-08-31",
    qualityPreviousFrom: "2026-08-11",
    qualityPreviousTo: "2026-08-24",
  },
  missing: [],
  sources: [
    { name: "Meta", at: new Date(clock).toISOString(), slaHours: 24 },
    { name: "CRM", at: new Date(clock).toISOString(), slaHours: 0.5 },
  ],
  coverage: 0.9,
  currency: "IDR",
  mixedCurrency: false,
  spend: 1000,
  recentSpend: 1000,
  leads: 50,
  mql: 10,
  sql: 3,
  cpl: 20,
  cpql: 100,
  mqlRate: 0.2,
  priorCpl: 20,
  priorCpql: 100,
  priorMqlRate: 0.2,
  sample: 10,
  completeDays: 7,
  dailyCpql: [100, 100, 100, 100, 100, 100, 100],
  leadGen: true,
  noLeadHours: 1,
  outcomeCompleteness: 0.8,
  frequency: 2,
  ctr: 0.02,
  priorCtr: 0.02,
  staleWorkdays: 1,
  followUpSla: 2,
  reviewDate: "2026-09-16",
  running: true,
  today: "2026-09-15",
  experiments: [],
};
const run = (
  key: RuleKey,
  patch: Partial<Input> = {},
  config: Partial<Settings> = {},
) =>
  registry[key]({ ...campaign, ...patch }, { ...settings, ...config }, clock);
describe("Phase 11 business scenarios", () => {
  const cases: [RuleKey, Partial<Input>, Partial<Input>][] = [
    ["R-00", { coverage: 0.69 }, { coverage: 0.7 }],
    ["R-01", { sample: 9 }, { sample: 10 }],
    ["R-02", { spend: 300, mql: 0 }, { spend: 299.99, mql: 0 }],
    ["R-03", { cpl: 24, cpql: 90 }, { cpl: 23.99, cpql: 90 }],
    [
      "R-04",
      { cpl: 19, mqlRate: 0.15, cpql: 101 },
      { cpl: 20, mqlRate: 0.15, cpql: 101 },
    ],
    ["R-05", { cpql: 100 }, { cpql: 100.01 }],
    ["R-06", { noLeadHours: 24.01 }, { noLeadHours: 24 }],
    [
      "R-07",
      { scope: "lead", staleWorkdays: 3 },
      { scope: "lead", staleWorkdays: 2 },
    ],
    [
      "R-08",
      { scope: "experiment", reviewDate: "2026-09-15" },
      { scope: "experiment", reviewDate: "2026-09-16" },
    ],
    ["R-09", { outcomeCompleteness: 0.59 }, { outcomeCompleteness: 0.6 }],
    ["R-10", { frequency: 3.01, ctr: 0.015 }, { frequency: 3, ctr: 0.015 }],
  ];
  it.each(cases)(
    "TEST-11.1 %s fires and respects its exact boundary",
    (key, fire, quiet) => {
      expect(run(key, fire).matched).toBe(true);
      expect(run(key, quiet).matched).toBe(false);
    },
  );
  it("R-00 checks strictly beyond 2× SLA, unknown freshness, and mixed currency", () => {
    expect(
      run("R-00", {
        sources: [
          {
            name: "Meta",
            at: new Date(clock - 48 * 3600000).toISOString(),
            slaHours: 24,
          },
        ],
      }).matched,
    ).toBe(false);
    for (const patch of [
      { mixedCurrency: true },
      { missing: ["partial ingest"] },
      { sources: [] },
      { sources: [{ name: "CRM", at: null, slaHours: 0.5 }] },
      {
        sources: [
          {
            name: "Meta",
            at: new Date(clock - 48 * 3600000 - 1).toISOString(),
            slaHours: 24,
          },
        ],
      },
    ]) {
      const rows = evaluate({ ...campaign, ...patch }, settings, clock);
      expect(rows.every((r) => r.verdict === "SUPPRESSED")).toBe(true);
      expect(rows.filter((r) => r.surfaced).map((r) => r.rule)).toEqual([
        "R-00",
      ]);
    }
  });
  it("A11 unconfigured suppresses only benchmark rules, and configuration needs no code change", () => {
    const rows = evaluate(
      { ...campaign, cpl: 24, cpql: 90 },
      { ...settings, targetCpql: null },
      clock,
    );
    for (const key of ["R-02", "R-05"])
      expect(rows.find((r) => r.rule === key)?.condition).toContain(
        "belum dikonfigurasi",
      );
    expect(rows.find((r) => r.rule === "R-03")?.verdict).toBe("HOLD");
    expect(run("R-05").verdict).toBe("SCALE_CANDIDATE");
    expect(run("R-05", {}, { currency: "USD" }).verdict).toBe("SUPPRESSED");
  });
  it("TEST-11.3 sample and complete-day gates block pause/scale, never investigate", () => {
    for (const patch of [{ sample: 9 }, { completeDays: 2 }]) {
      const rows = evaluate(
        { ...campaign, ...patch, frequency: 4, ctr: 0.015 },
        settings,
        clock,
      );
      expect(rows.find((r) => r.rule === "R-05")?.verdict).toBe("MONITOR");
      expect(rows.find((r) => r.rule === "R-10")?.verdict).toBe("INVESTIGATE");
    }
    const rows = evaluate(
      { ...campaign, mql: 0, sample: 0, spend: 300, noLeadHours: 25 },
      settings,
      clock,
    );
    expect(rows.find((r) => r.rule === "R-02")?.verdict).toBe("MONITOR");
    expect(rows.find((r) => r.rule === "R-06")?.surfaced).toBe(true);
    expect(run("R-01", { completeDays: 3 }).matched).toBe(false);
  });
  it("TEST-11.4/8 tracking precedes quality; CPL up / CPQL down is HOLD and never pause", () => {
    const improving = { ...campaign, cpl: 24, cpql: 90, mqlRate: 0.3 };
    const rows = evaluate(improving, settings, clock);
    expect(rows.find((r) => r.rule === "R-03")?.surfaced).toBe(true);
    expect(rows.find((r) => r.rule === "R-05")?.surfaced).toBe(false);
    expect(rows.some((r) => r.verdict === "PAUSE_CANDIDATE")).toBe(false);
    const tracking = evaluate(
      { ...improving, noLeadHours: 25 },
      settings,
      clock,
    );
    expect(tracking.find((r) => r.rule === "R-03")?.precedence).toContain(
      "R-06",
    );
  });
  it("R-09 suppresses only revenue scope, not a supported scale finding", () => {
    const rows = evaluate(
      { ...campaign, outcomeCompleteness: 0.1 },
      settings,
      clock,
    );
    expect(rows.find((r) => r.rule === "R-09")?.verdict).toBe("SUPPRESSED");
    expect(rows.find((r) => r.rule === "R-05")?.surfaced).toBe(true);
  });
  it("missing comparisons, missing frequency, incomplete stable days never become findings", () => {
    for (const key of ["R-03", "R-04"] as const)
      expect(run(key, { priorCpql: null }).verdict).toBe("SUPPRESSED");
    expect(
      run("R-05", { dailyCpql: [null, 100, 100, 100, 100, 100, 100] }).verdict,
    ).toBe("SUPPRESSED");
    expect(
      run("R-05", { dailyCpql: [101, 100, 100, 100, 100, 100, 100] }).matched,
    ).toBe(false);
    expect(run("R-06", { leadGen: null }).verdict).toBe("SUPPRESSED");
    expect(run("R-06", { leadGen: false }).matched).toBe(false);
    expect(run("R-10", {}, { frequency: null }).verdict).toBe("SUPPRESSED");
  });
  it("no-action state and repeated evaluation are stable and explainable", () => {
    const input = {
      ...campaign,
      cpql: 101,
      dailyCpql: [101, 101, 101, 101, 101, 101, 101],
    };
    const before = JSON.stringify(input),
      result = evaluate(input, settings, clock);
    expect(result.every((r) => !r.surfaced)).toBe(true);
    expect(evaluate(input, settings, clock)).toEqual(result);
    expect(JSON.stringify(input)).toBe(before);
    expect(
      result.every(
        (r) =>
          r.condition.length > 0 && r.action.length > 0 && r.version === "r1",
      ),
    ).toBe(true);
  });
  it("failing rule is recorded without aborting siblings", () => {
    const rows = evaluate(campaign, settings, clock, {
      ...registry,
      "R-03": () => {
        throw new Error("do not leak this");
      },
    });
    expect(rows.find((r) => r.rule === "R-03")?.condition).toContain(
      "EVALUATION_ERROR",
    );
    expect(rows.some((r) => r.condition.includes("do not leak"))).toBe(false);
    expect(rows).toHaveLength(9);
  });
  it("rule imports cannot reach I/O or vendor write APIs", () => {
    for (const path of readdirSync("src/domain/rules").filter(
      (p) => p.endsWith(".ts") && !p.endsWith(".test.ts"),
    )) {
      const source = readFileSync(`src/domain/rules/${path}`, "utf8");
      for (const match of source.matchAll(/from\s+["']([^"']+)["']/g))
        expect(match[1]).toMatch(/^\.\/(?!\.\.)/);
      expect(source).not.toMatch(/\bfetch\(|\bDate\.now\(|\bMath\.random\(/);
    }
  });
});
describe("TEST-11.5/6 priority and snooze", () => {
  it("material worsening reopens a snooze at the documented boundaries", () => {
    const before = {
      noLeadHours: 25,
      staleWorkdays: 3,
      coverage: 0.8,
      recentSpend: 100,
    };
    for (const patch of [
      { noLeadHours: 49 },
      { staleWorkdays: 4 },
      { coverage: 0.7 },
      { recentSpend: 150 },
    ])
      expect(
        snoozeWorsened("warning", "warning", before, { ...before, ...patch }),
      ).toBe(true);
    expect(
      snoozeWorsened("warning", "warning", before, {
        ...before,
        noLeadHours: 48.99,
        staleWorkdays: 3,
        coverage: 0.71,
        recentSpend: 149.99,
      }),
    ).toBe(false);
  });
  const item = (
    key: string,
    patch: Partial<PriorityItem> = {},
  ): PriorityItem => ({
    key,
    severity: "warning",
    firstSeen: new Date(clock).toISOString(),
    spend: 100,
    impact: 100,
    currency: "IDR",
    snoozeUntil: null,
    dismissedUntil: null,
    ...patch,
  });
  it("uses severity × recency × normalized impact and caps at five", () => {
    const rows = rank(
      [
        item("old", { firstSeen: new Date(clock - 604800000).toISOString() }),
        item("critical", { severity: "critical", spend: 50, impact: 50 }),
        item("large", { spend: 100, impact: 100 }),
        ...Array.from({ length: 8 }, (_, i) =>
          item(`other-${i}`, { impact: 1 }),
        ),
      ],
      clock,
    );
    expect(rows).toHaveLength(5);
    expect(rows[0].key).toBe("large");
    expect(rows[0].score).toBe(2);
    expect(rows[1].key).toBe("critical");
  });
  it("respects durations, tie spend, missing impact and dismiss expiry", () => {
    const rows = rank(
      [
        item("snoozed", { snoozeUntil: new Date(clock + 1).toISOString() }),
        item("dismissed", {
          dismissedUntil: new Date(clock + 1).toISOString(),
        }),
        item("expired", { dismissedUntil: new Date(clock).toISOString() }),
        item("tie", { spend: 200 }),
        item("unknown", { impact: null, currency: null }),
      ],
      clock,
    );
    expect(rows.map((r) => r.key)).toEqual(["tie", "expired", "unknown"]);
    expect(rows[2].score).toBe(0);
    expect(snoozeWorsened("warning", "critical")).toBe(true);
    expect(snoozeWorsened("critical", "critical")).toBe(false);
  });
});
