import "server-only";
import { z } from "zod";
import { evaluate } from "@/domain/rules";
import { rank, snoozeWorsened } from "@/domain/rules/priority";
import { RULE_VERSION, type Input } from "@/domain/rules/types";
import {
  ruleSettings,
  windows,
  decisionInputs,
} from "@/domain/metrics/decision-inputs";
import { machineSettings } from "@/repositories/integrations";
import { resolveMissing, reactivate } from "@/repositories/alerts";
import { readSettings } from "@/repositories/settings";
import * as repository from "@/repositories/decisions";
import { requireUser } from "@/services/session";
import type { Json } from "@/types/database.generated";
const cursorSchema = z.object({
  at: z.iso.datetime({ offset: true }),
  after: z.string(),
  version: z.literal(RULE_VERSION),
  configuration: z.string(),
});
const severitySchema = z.enum(["critical", "warning", "info"]);
const worseningSchema = z.object({
  input: z.object({
    noLeadHours: z.number().nullable(),
    staleWorkdays: z.number().nullable(),
    coverage: z.number().nullable(),
    recentSpend: z.number().nullable(),
  }),
});
const keyFor = (input: Input, rule: string) =>
  `decision:${rule}:${input.scope}:${input.id}`;
export async function runDecisions(
  run: string,
  deadline: number,
  max: number,
  now = new Date(),
) {
  const previous = await repository.state();
  let cursor: z.infer<typeof cursorSchema> | null = null;
  if (previous) {
    const parsed = cursorSchema.safeParse(JSON.parse(previous));
    if (parsed.success) cursor = parsed.data;
  }
  const { values } = await machineSettings(),
    settings = ruleSettings(values);
  const configuration = JSON.stringify([
    settings,
    values["rules.lead_gen_campaigns"],
    values["meta.freshness_hours"],
    values["follow_up.mql_workdays"],
    values["follow_up.sql_workdays"],
  ]);
  if (cursor?.configuration !== configuration) cursor = null;
  const at = cursor ? new Date(cursor.at) : now,
    window = windows(at, settings.maturityDays);
  const [raw, existing] = await Promise.all([
    repository.facts(window.qualityPreviousFrom, window.to),
    repository.actions(true),
  ]);
  const inputs = decisionInputs(raw, values, at).filter(
    (i) => !cursor || `${i.scope}:${i.id}` > cursor.after,
  );
  const page = inputs.slice(0, Math.min(max, 40)),
    byKey = new Map(existing.map((a) => [a.alert_key, a]));
  const rows: Json[] = [];
  let failed = 0;
  for (const input of page)
    for (const evaluation of evaluate(input, settings, at.getTime())) {
      if (evaluation.condition.startsWith("EVALUATION_ERROR")) failed++;
      const key = keyFor(input, evaluation.rule),
        prior = byKey.get(key);
      const before = worseningSchema.safeParse(prior?.evidence);
      const override = Boolean(
        prior?.snooze_until &&
        Date.parse(prior.snooze_until) > at.getTime() &&
        snoozeWorsened(
          severitySchema.parse(prior.severity),
          evaluation.severity,
          before.success ? before.data.input : undefined,
          input,
        ),
      );
      const evidence = {
        ...evaluation,
        input,
        settings,
        basis: "cohort",
        frequencyBasis: "platform-reported latest complete day",
        comparison:
          "7 complete WIB days vs preceding 14; quality windows shifted by cohort maturity",
        snoozeOverride: override ? "severity_or_evidence_worsened" : null,
      };
      rows.push({
        rule_key: evaluation.rule,
        rule_version: RULE_VERSION,
        evaluated_at: at.toISOString(),
        window_start: input.window.from,
        window_end: input.window.to,
        scope_type: input.scope,
        scope_id: input.id,
        verdict: evaluation.verdict,
        evidence: JSON.parse(JSON.stringify(evidence)) as Json,
        alert_key: key,
        override_snooze: override,
        alert_revision: prior?.updated_at ?? null,
        alert: evaluation.surfaced
          ? {
              alert_key: key,
              type:
                evaluation.rule === "R-06"
                  ? "tracking_failure"
                  : "decision_recommendation",
              severity: evaluation.severity,
              source: "decisions",
              entity_type: input.scope,
              entity_id: ["lead", "experiment"].includes(input.scope)
                ? input.id
                : null,
              title: `${evaluation.rule} · ${evaluation.verdict}`,
              message: evaluation.action,
              evidence: JSON.parse(JSON.stringify(evidence)) as Json,
              notify: evaluation.rule === "R-06",
              detected_at: at.toISOString(),
            }
          : null,
      });
    }
  if (Date.now() + 5500 > deadline) throw new Error("DECISION_BUDGET_EXCEEDED");
  const hasMore = inputs.length > page.length,
    next = hasMore
      ? JSON.stringify({
          at: at.toISOString(),
          after: `${page.at(-1)!.scope}:${page.at(-1)!.id}`,
          version: RULE_VERSION,
          configuration,
        })
      : null;
  const written = await repository.commit(run, rows, next);
  if (!hasMore)
    await resolveMissing(
      ["decision_recommendation", "tracking_failure"],
      [],
      at.toISOString(),
    );
  return { read: page.length, written, failed, hasMore, cursor: next };
}
export const evidenceSchema = z
  .object({
    rule: z.string(),
    version: z.string(),
    verdict: z.enum([
      "MONITOR",
      "INVESTIGATE",
      "HOLD",
      "SCALE_CANDIDATE",
      "PAUSE_CANDIDATE",
      "SUPPRESSED",
    ]),
    condition: z.string(),
    action: z.string(),
    limitations: z.array(z.string()),
    precedence: z.string().nullable(),
    snoozeOverride: z.string().nullable(),
    input: z
      .object({
        scope: z.enum(["campaign", "lead", "experiment", "integration"]),
        id: z.string(),
        label: z.string(),
        currency: z.string().nullable(),
        spend: z.number().nullable(),
        recentSpend: z.number().nullable(),
        pipelineValue: z.number().nullable().optional(),
        experiments: z.array(
          z.object({ id: z.uuid(), code: z.string(), status: z.string() }),
        ),
      })
      .passthrough(),
  })
  .passthrough();
export async function todayDecisions() {
  await requireUser();
  await reactivate(new Date().toISOString());
  const [rows, { values }] = await Promise.all([
    repository.actions(),
    readSettings(),
  ]);
  const items = rows.map((row) => {
    const evidence = evidenceSchema.parse(row.evidence),
      input = evidence.input;
    return {
      id: row.id,
      revision: row.updated_at,
      key: row.alert_key,
      severity: severitySchema.parse(row.severity),
      firstSeen: row.first_seen_at,
      evaluatedAt: row.last_seen_at,
      spend: input.recentSpend,
      impact: input.pipelineValue ?? input.recentSpend,
      currency: input.currency,
      snoozeUntil: row.snooze_until,
      dismissedUntil: row.dismissed_until,
      evidence,
    };
  });
  const unconfigured =
    values["rules.target_cpql"] === null || values["rules.currency"] === null;
  return {
    unconfigured,
    items: rank(
      items.filter(
        (i) => !unconfigured || !["R-02", "R-05"].includes(i.evidence.rule),
      ),
      Date.now(),
    ),
    suppressed: items
      .filter(
        (i) =>
          i.evidence.rule === "R-00" && i.evidence.verdict === "SUPPRESSED",
      )
      .map((i) => i.evidence.condition),
    total: items.length,
  };
}
export async function dismissalCandidates() {
  await requireUser();
  const rows = await repository.actions(false, true),
    groups = new Map<
      string,
      { key: string; count: number; reason: string | null }
    >();
  for (const row of rows) {
    const entries = z
      .array(z.object({ at: z.string() }))
      .parse(row.action_dismissals);
    const count = entries.filter(
      (e) => Date.parse(e.at) >= Date.now() - 30 * 86400000,
    ).length;
    const item = groups.get(row.alert_key) ?? {
      key: row.alert_key,
      count: 0,
      reason: row.dismissed_reason,
    };
    item.count += count;
    groups.set(row.alert_key, item);
  }
  return [...groups.values()].filter((g) => g.count >= 3);
}
