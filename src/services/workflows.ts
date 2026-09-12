import "server-only";
import { requireUser } from "@/services/session";
import { can } from "@/lib/auth/can";
import {
  isDue,
  snapshotSteps,
  completion,
  recomputeRunStatus,
  runTimes,
} from "@/domain/workflows";
import { toJakartaDate } from "@/domain/dates";
import {
  readTemplates,
  readRuns,
  insertRun,
  readRun,
  commitItem,
  type WorkflowRun,
} from "@/repositories/workflows";
import { itemChangeSchema } from "@/config/workflow-schema";
export function runView(run: WorkflowRun) {
  return { ...run, progress: completion(run.workflow_items) };
}
export async function getOrCreateRunsForDate(now = new Date()) {
  await requireUser();
  // No caller-supplied historical date: visiting history never backfills missed days.
  const date = toJakartaDate(now);
  for (let attempt = 0; attempt < 3; attempt++) {
    const templates = await readTemplates();
    const existing = await readRuns(date);
    const missing = templates.filter(
      (t) =>
        isDue(t, date) && !existing.some((run) => run.template_id === t.id),
    );
    if (missing.length && !(await can("workflow:write")))
      throw new Error("FORBIDDEN");
    try {
      await Promise.all(
        missing.map((t) => insertRun(t, date, snapshotSteps(t.steps))),
      );
      return (missing.length ? await readRuns(date) : existing).map(runView);
    } catch (error) {
      if (
        !(error instanceof Error && error.message === "CONFLICT") ||
        attempt === 2
      )
        throw error;
    }
  }
  throw new Error("CONFLICT");
}
export async function updateWorkflowItem(value: unknown) {
  await requireUser();
  if (!(await can("workflow:write"))) throw new Error("FORBIDDEN");
  const input = itemChangeSchema.parse(value);
  for (let attempt = 0; attempt < 3; attempt++) {
    const run = await readRun(input.runId);
    const previous = run.workflow_items.find(
      (item) => item.id === input.itemId,
    );
    if (!previous) throw new Error("NOT_FOUND");
    const now = new Date().toISOString();
    const item = { ...previous };
    if (input.done !== undefined) {
      item.is_done = input.done;
      item.completed_at = input.done ? (previous.completed_at ?? now) : null;
    }
    if (input.note !== undefined) item.notes = input.note;
    const items = run.workflow_items.map((existing) =>
      existing.id === item.id ? item : existing,
    );
    const status = recomputeRunStatus(items);
    try {
      await commitItem(run, item, status, runTimes(status, run, now));
      return;
    } catch (error) {
      if (
        !(error instanceof Error && error.message === "CONFLICT") ||
        attempt === 2
      )
        throw error;
    }
  }
}
