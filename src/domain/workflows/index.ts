import { jakartaMonthBounds, jakartaWeekday, shiftDate } from "../dates";
export type Step = {
  key: string;
  label: string;
  help: string;
  required: boolean;
};
export type Schedule = {
  cadence: "daily" | "weekly" | "monthly";
  weekdays: number[] | null;
  is_active: boolean;
};
export function isDue(template: Schedule, date: string) {
  if (!template.is_active) return false;
  if (template.cadence === "monthly") {
    const first = jakartaMonthBounds(date).start;
    const weekday = jakartaWeekday(first);
    return date === shiftDate(first, weekday > 5 ? 8 - weekday : 0);
  }
  return (
    template.weekdays === null ||
    template.weekdays.includes(jakartaWeekday(date))
  );
}
export function snapshotSteps(steps: Step[]) {
  return steps.map((step, position) => ({ ...step, position }));
}
type CompletionItem = { required_snapshot: boolean; is_done: boolean };
export function completion(items: CompletionItem[]) {
  const required = items.filter((item) => item.required_snapshot);
  const counted = required.length ? required : items;
  const done = counted.filter((item) => item.is_done).length;
  return {
    done,
    total: counted.length,
    percentage: counted.length ? Math.round((done / counted.length) * 100) : 0,
  };
}
export function recomputeRunStatus(items: CompletionItem[]) {
  const progress = completion(items);
  if (progress.total > 0 && progress.done === progress.total)
    return "completed" as const;
  return items.some((item) => item.is_done)
    ? ("in_progress" as const)
    : ("pending" as const);
}
export function runTimes(
  status: string,
  previous: { started_at: string | null; completed_at: string | null },
  now: string,
) {
  return {
    started_at:
      status === "pending" ? previous.started_at : (previous.started_at ?? now),
    completed_at:
      status === "completed" ? (previous.completed_at ?? now) : null,
  };
}
