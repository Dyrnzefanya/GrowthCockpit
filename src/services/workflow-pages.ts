import "server-only";
import { z } from "zod";
import { requireUser } from "@/services/session";
import { getOrCreateRunsForDate, runView } from "@/services/workflows";
import {
  readHistory,
  readRun,
  readRuns,
  readTemplates,
} from "@/repositories/workflows";
import { readNotes } from "@/repositories/notes";
import { toJakartaDate, todayHeading, shiftDate } from "@/domain/dates";
type Search = Record<string, string | string[] | undefined>;
const pageSchema = z.coerce.number().int().min(0).max(100000).catch(0);
export async function todayModel(search: Search) {
  await requireUser();
  const now = new Date();
  const today = toJakartaDate(now);
  const parsedDate = z.iso.date().safeParse(search.note_date);
  const noteDate =
    parsedDate.success && parsedDate.data <= today ? parsedDate.data : today;
  const notePage = pageSchema.parse(search.note_page ?? 0);
  const [runResult, noteResult] = await Promise.allSettled([
    getOrCreateRunsForDate(now),
    readNotes(noteDate, notePage),
  ]);
  const runs =
    runResult.status === "fulfilled"
      ? runResult.value
      : (await readRuns(today).catch(() => [])).map(runView);
  return {
    today,
    heading: todayHeading(now),
    runs,
    runError: runResult.status === "rejected",
    noteDate,
    notePage,
    notes: noteResult.status === "fulfilled" ? noteResult.value.notes : [],
    noteTotal: noteResult.status === "fulfilled" ? noteResult.value.total : 0,
    noteError: noteResult.status === "rejected",
  };
}
export async function historyModel(search: Search) {
  await requireUser();
  const end = toJakartaDate(new Date());
  const start = shiftDate(end, -29);
  const page = pageSchema.parse(search.page ?? 0);
  const sort = z
    .enum(["run_date", "template_name_snapshot", "status"])
    .catch("run_date")
    .parse(search.sort);
  const direction = search.direction === "asc" ? "asc" : "desc";
  const id = z.uuid().safeParse(search.run);
  const history = await readHistory(
    start,
    end,
    page,
    sort,
    direction === "asc",
  );
  const detail = id.success ? runView(await readRun(id.data)) : null;
  return {
    ...history,
    runs: history.runs.map(runView),
    start,
    end,
    page,
    sort,
    direction,
    detail,
  };
}
export async function templatesModel() {
  await requireUser();
  return readTemplates();
}
