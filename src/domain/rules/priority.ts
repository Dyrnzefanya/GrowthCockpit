export type PriorityItem = {
  key: string;
  severity: "critical" | "warning" | "info";
  firstSeen: string;
  spend: number | null;
  impact: number | null;
  currency: string | null;
  snoozeUntil: string | null;
  dismissedUntil: string | null;
};
export function rank<T extends PriorityItem>(items: T[], clock: number) {
  const maximum = new Map<string, number>();
  for (const item of items)
    if (item.currency && item.impact !== null)
      maximum.set(
        item.currency,
        Math.max(maximum.get(item.currency) ?? 0, item.impact),
      );
  return items
    .map((item) => {
      const severityWeight = { critical: 3, warning: 2, info: 1 }[
        item.severity
      ];
      const recencyWeight = Math.max(
        0,
        1 - Math.max(0, clock - Date.parse(item.firstSeen)) / 604800000,
      );
      const max = item.currency ? (maximum.get(item.currency) ?? 0) : 0;
      const impactWeight =
        max && item.impact !== null ? Math.max(0, item.impact / max) : 0;
      const snoozePenalty =
        item.snoozeUntil && Date.parse(item.snoozeUntil) > clock ? 1 : 0;
      return {
        ...item,
        severityWeight,
        recencyWeight,
        impactWeight,
        snoozePenalty,
        score:
          severityWeight * recencyWeight * impactWeight * (1 - snoozePenalty),
      };
    })
    .filter(
      (i) =>
        !i.snoozePenalty &&
        (!i.dismissedUntil || Date.parse(i.dismissedUntil) <= clock),
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.spend ?? 0) - (a.spend ?? 0) ||
        a.key.localeCompare(b.key),
    )
    .slice(0, 5);
}
export type WorseningFacts = {
  noLeadHours: number | null;
  staleWorkdays: number | null;
  coverage: number | null;
  recentSpend: number | null;
};
export function snoozeWorsened(
  previous: "critical" | "warning" | "info",
  next: "critical" | "warning" | "info",
  before?: WorseningFacts,
  after?: WorseningFacts,
) {
  const weights = { critical: 3, warning: 2, info: 1 };
  return (
    weights[next] > weights[previous] ||
    Boolean(
      before &&
      after &&
      ((before.noLeadHours !== null &&
        after.noLeadHours !== null &&
        after.noLeadHours >= before.noLeadHours + 24) ||
        (before.staleWorkdays !== null &&
          after.staleWorkdays !== null &&
          after.staleWorkdays >= before.staleWorkdays + 1) ||
        (before.coverage !== null &&
          after.coverage !== null &&
          after.coverage <= before.coverage - 0.1) ||
        (before.recentSpend !== null &&
          before.recentSpend > 0 &&
          after.recentSpend !== null &&
          after.recentSpend >= before.recentSpend * 1.5)),
    )
  );
}
