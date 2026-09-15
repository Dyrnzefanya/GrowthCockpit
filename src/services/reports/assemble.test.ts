import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/repositories/reports", () => ({ reportInputs: vi.fn() }));
vi.mock("@/repositories/integrations", () => ({ machineSettings: vi.fn() }));
import { settingsDefaults } from "@/config/settings-schema";
import {
  performanceFactsSchema,
  performanceSummary,
} from "@/domain/metrics/performance";
import { markdownReport, reportPeriod } from "@/domain/reports";
import { assembleReport } from "./assemble";

const now = new Date("2026-09-16T02:00:00.000Z"),
  period = reportPeriod("2026-W37", now),
  synced = "2026-09-16T01:00:00.000Z";

const performance = {
  ads: [
    {
      ad_account_id: "account",
      campaign_id: "campaign",
      names: ["Campaign A"],
      currency: "IDR",
      source_timezone: "Asia/Jakarta",
      current_period: true,
      spend: "1000.00",
      impressions: 10000,
      clicks: 500,
      platform_results: 10,
      synced_at: synced,
    },
    {
      ad_account_id: "account",
      campaign_id: "campaign",
      names: ["Campaign A"],
      currency: "IDR",
      source_timezone: "Asia/Jakarta",
      current_period: false,
      spend: "800.00",
      impressions: 8000,
      clicks: 400,
      platform_results: 8,
      synced_at: synced,
    },
  ],
  leads: [
    {
      platform: "meta",
      campaign_id: "campaign",
      lt_campaign: "Campaign A",
      current_period: true,
      leads: 10,
      mql: 4,
      sql: 2,
      synced_at: synced,
    },
    {
      platform: "meta",
      campaign_id: "campaign",
      lt_campaign: "Campaign A",
      current_period: false,
      leads: 8,
      mql: 2,
      sql: 1,
      synced_at: synced,
    },
  ],
  deals: [
    {
      id: "deal",
      stage_category: "won",
      amount: "2000.00",
      currency: "IDR",
      attribution_allocations: [{ campaign: "Campaign A", weight: 1 }],
      platform: "meta",
      campaign_id: "campaign",
      lt_campaign: "Campaign A",
      current_period: true,
      synced_at: synced,
    },
  ],
  days: [
    {
      metric_date: "2026-09-07",
      currency: "IDR",
      source_timezone: "Asia/Jakarta",
      spend: "1000.00",
    },
  ],
};

const cohort = {
  inquiry_date: "2026-09-07",
  platform: "meta",
  lt_campaign: "Campaign A",
  currency: "IDR",
  leads: 10,
  mql: 4,
  sql: 2,
  disqualified: 6,
  attributed: 10,
  deals: 1,
  open_deals: 0,
  won: 1,
  lost: 0,
  revenue: "2000.00",
  missing_revenue: 0,
  past_expected_close: 1,
  past_expected_closed: 1,
};

function inputs(outcome = cohort) {
  return {
    performance,
    cohort: [outcome],
    experiments: [
      {
        code: "EXP-2026-001",
        title: "Message test",
        status: "completed",
        start_date: "2026-09-01",
        end_date: "2026-09-10",
        review_date: "2026-09-10",
        experiment_results: {
          outcome: "win",
          learning: "Specific proof improved qualified response.",
          next_action: "Apply the message to the next test.",
        },
      },
    ],
    workflows: [
      {
        id: "run",
        status: "in_progress",
        run_date: "2026-09-08",
        workflow_items: [
          { required_snapshot: true, is_done: true },
          { required_snapshot: true, is_done: false },
        ],
      },
    ],
    notes: [{ note_date: "2026-09-09", body: "Sales feedback was reviewed." }],
    alerts: [
      {
        severity: "warning",
        title: "Follow-up due",
        message: "Review the lead.",
        source: "lead",
        evidence: {},
        last_seen_at: synced,
      },
      {
        severity: "info",
        title: "R-08 · INVESTIGATE",
        message: "Review experiment.",
        source: "decisions",
        evidence: { action: "Review the completed experiment learning." },
        last_seen_at: synced,
      },
    ],
    states: [
      {
        integration: "meta",
        resource: "ingest",
        last_success_at: synced,
        last_error: null,
        cursor: null,
      },
    ],
  } as unknown as Parameters<typeof assembleReport>[0];
}

describe("Phase 12 weekly report assembly", () => {
  it("TEST-12.1 matches authoritative performance formulas on a hand-computed week", () => {
    const report = assembleReport(inputs(), settingsDefaults, period, now),
      source = performanceSummary(
        performanceFactsSchema.parse(performance),
        true,
        now.getTime(),
        24,
      );
    expect(report.metrics.spend.current).toBe(1000);
    expect(report.metrics.leads.current).toBe(10);
    expect(report.metrics.cpl.current).toBe(100);
    expect(report.metrics.mql.current).toBe(4);
    expect(report.metrics.cpql.current).toBe(250);
    expect(report.metrics.sql.current).toBe(2);
    expect(report.metrics.cpsql.current).toBe(500);
    expect(report.metrics.opportunities.current).toBe(1);
    expect(report.metrics.revenue.current).toBe(2000);
    expect(report.metrics.roas.current).toBe(2);
    expect(report.metrics.cac.current).toBe(1000);
    expect(report.metrics.cpql.current).toBe(source.cpql);
    expect(report.workflow.rate).toBe(0.5);
    expect(report.experiments.completed[0].learning).toContain("qualified");
  });

  it("TEST-12.4/12.5 always records caveats and withholds revenue below the R-09 gate", () => {
    const report = assembleReport(
      inputs({ ...cohort, past_expected_close: 2, past_expected_closed: 1 }),
      settingsDefaults,
      period,
      now,
    );
    expect(report.caveats.items.length).toBeGreaterThanOrEqual(4);
    expect(report.caveats.revenueAvailable).toBe(false);
    expect(report.metrics.revenue.current).toBeNull();
    expect(report.metrics.roas.current).toBeNull();
    expect(report.metrics.cac.current).toBeNull();
    expect(markdownReport(report, "## Summary\n\nNo assertion.")).not.toContain(
      "| REVENUE |",
    );
    expect(markdownReport(report, "## Summary\n\nNo assertion.")).toContain(
      "## Data-quality caveats",
    );
  });

  it("TEST-12.6 produces a stable explicit empty-week report", () => {
    const empty = {
      performance: { ads: [], leads: [], deals: [], days: [] },
      cohort: [],
      experiments: [],
      workflows: [],
      notes: [],
      alerts: [],
      states: [],
    } as unknown as Parameters<typeof assembleReport>[0];
    const first = assembleReport(empty, settingsDefaults, period, now);
    expect(first).toEqual(assembleReport(empty, settingsDefaults, period, now));
    expect(first.metrics.spend.current).toBeNull();
    expect(first.metrics.leads.current).toBe(0);
    expect(first.caveats.outcomeCompleteness).toBeNull();
  });

  it("TEST-12.7 handles ISO boundaries, partial weeks and presentable Markdown", () => {
    expect(reportPeriod("2026-W36", now)).toMatchObject({
      start: "2026-08-31",
      end: "2026-09-06",
      partial: false,
    });
    expect(reportPeriod("2026-W38", now).partial).toBe(true);
    expect(() => reportPeriod("2026-W39", now)).toThrow("INVALID_WEEK");
    expect(() => reportPeriod("2026-W54", now)).toThrow("INVALID_WEEK");
    const output = markdownReport(
      assembleReport(inputs(), settingsDefaults, period, now),
      "## Executive summary\n\nFacts reviewed.",
    );
    for (const heading of [
      "# Weekly GrowthCockpit Report",
      "## Performance",
      "## What changed",
      "## Experiments completed",
      "## Lead quality and sales follow-up",
      "## Data-quality caveats",
    ])
      expect(output).toContain(heading);
  });
});
