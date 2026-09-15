"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { can } from "@/lib/auth/can";
import { requireUser } from "@/services/session";
import {
  exportReport,
  finalizeReport,
  generateWeeklyReport,
  saveReport,
} from "@/services/reports";

const mutation = z.object({
  id: z.uuid(),
  revision: z.iso.datetime({ offset: true }),
  narrative: z.string().trim().min(1).max(50000),
});

export async function generateReportFormAction(formData: FormData) {
  const user = await requireUser();
  if (!(await can("report:write"))) throw new Error("FORBIDDEN");
  const week = z
    .string()
    .regex(/^\d{4}-W\d{2}$/)
    .parse(formData.get("week"));
  const id = await generateWeeklyReport(week, user.id);
  revalidatePath("/reports");
  redirect(`/reports/${id}`);
}

export async function saveReportAction(input: unknown) {
  const value = mutation.parse(input);
  const revision = await saveReport(value.id, value.revision, value.narrative);
  revalidatePath(`/reports/${value.id}`);
  return revision;
}

export async function finalizeReportAction(input: unknown) {
  const value = mutation.parse(input);
  const id = await finalizeReport(value.id, value.revision, value.narrative);
  revalidatePath(`/reports/${id}`);
}

export async function exportReportAction(id: string) {
  return exportReport(z.uuid().parse(id));
}
