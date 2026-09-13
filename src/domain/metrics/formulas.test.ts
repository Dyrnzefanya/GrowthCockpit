import { it, expect } from "vitest";
import * as m from "./formulas";
import { summarizeFunnel, percent, type CohortFact } from "./funnel";
it("TEST-6.10 every ratio formula: known, zero, missing and nonfinite inputs", () => {
  for (const formula of [
    m.cpm,
    m.ctr,
    m.cpc,
    m.cpl,
    m.mqlRate,
    m.cpql,
    m.sqlRate,
    m.cpsql,
    m.quotationRate,
    m.cac,
    m.roas,
    m.attributionCoverage,
    m.outcomeCompleteness,
  ]) {
    expect(formula(10, 5)).toBe(formula === m.cpm ? 2000 : 2);
    expect(formula(0, 5)).toBe(0);
    for (const [n, d] of [
      [1, 0],
      [null, 2],
      [2, null],
      [undefined, 2],
      [1, -1],
      [Infinity, 1],
      [1, NaN],
      [1, Infinity],
      [NaN, 1],
      [Number.MAX_VALUE, Number.MIN_VALUE],
    ] as const)
      expect(formula(n, d)).toBeNull();
  }
  expect(m.winRate(2, 3)).toBe(0.4);
  expect(m.winRate(null, 2)).toBeNull();
  expect(m.winRate(2, null)).toBeNull();
  expect(m.winRate(0, 0)).toBeNull();
  expect(m.frequency(1.2)).toBe(1.2);
  expect(m.reported(null)).toBeNull();
  expect(m.reported(Infinity)).toBeNull();
  expect(m.sum([1, 2])).toBe(3);
  expect(m.sum([1, null])).toBeNull();
  expect(m.sum([Infinity])).toBeNull();
  expect(m.revenue([])).toEqual({ amount: "0.00", currency: "IDR" });
  expect(
    m.revenue([
      { amount: "900719925474099.11", currency: "IDR" },
      { amount: "0.09", currency: "IDR" },
    ]),
  ).toEqual({ amount: "900719925474099.20", currency: "IDR" });
  expect(
    m.revenue([
      { amount: "1", currency: "IDR" },
      { amount: "2", currency: "USD" },
    ]),
  ).toBeNull();
  expect(m.revenue([{ amount: null, currency: "IDR" }])).toBeNull();
  expect(m.minorUnits("10")).toBe(1000n);
  expect(() => m.minorUnits("1.234")).toThrow();
  expect(() => m.minorUnits("-1")).toThrow();
});
it("TEST-6.7 hand-calculated cohort: 4 inquiries, 3 MQL incl SQL, 1 SQL, one won and one lost", () => {
  const fact: CohortFact = {
    inquiry_date: "2026-09-01",
    platform: "meta",
    lt_campaign: "Gift",
    currency: "IDR",
    leads: 4,
    mql: 3,
    sql: 1,
    disqualified: 1,
    attributed: 3,
    deals: 2,
    won: 1,
    lost: 1,
    revenue: "1000000.00",
    missing_revenue: 0,
    past_expected_close: 2,
    past_expected_closed: 2,
  };
  const result = summarizeFunnel([fact], "2026-09-30", 14);
  expect(result).toMatchObject({
    leads: 4,
    mql: 3,
    sql: 1,
    mqlRate: 0.75,
    sqlRate: 1 / 3,
    winRate: 0.5,
    coverage: 0.75,
    revenue: { amount: "1000000.00", currency: "IDR" },
    outcomeCompleteness: 1,
    immature: false,
  });
  expect(summarizeFunnel([fact], "2026-09-10", 14).immature).toBe(true);
  expect(summarizeFunnel([], "2026-09-30", 14).mqlRate).toBeNull();
  expect(
    summarizeFunnel([{ ...fact, missing_revenue: 1 }], "2026-09-30", 14)
      .revenue,
  ).toBeNull();
  const absent = Object.fromEntries(
    Object.keys(fact).map((key) => [key, null]),
  ) as CohortFact;
  expect(summarizeFunnel([absent], "2026-09-30", 14).leads).toBe(0);
  expect(
    summarizeFunnel([{ ...fact, won: null }], "2026-09-30", 14).revenue,
  ).toEqual({ amount: "0.00", currency: "IDR" });
  expect(percent(null)).toBe("—");
  expect(percent(0.75)).toContain("75");
});
