import "server-only";
import { z } from "zod";
import { shiftDate } from "@/domain/dates";
import { metaClient, MetaError } from "@/integrations/meta/client";
import { normalizeInsight } from "@/integrations/meta/transform";
import * as repository from "@/repositories/ad-metrics";
import { machineSettings } from "@/repositories/integrations";
import { raiseAlert } from "@/services/alerts";
import { resolveMetaCredentials } from "@/services/provider-credentials";

export const ingestRange = z
  .object({ from: z.iso.date(), to: z.iso.date() })
  .refine((v) => v.from <= v.to, "Invalid date range");
const progressSchema = z.object({
  account: z.string(),
  from: z.iso.date(),
  to: z.iso.date(),
  date: z.iso.date(),
  after: z.string().nullable(),
  completedDays: z.number().int().nonnegative(),
});
export function accountToday(timezone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export async function ingestMeta(
  run: string,
  deadline: number,
  max: number,
  range?: { from: string; to: string },
) {
  let read = 0,
    written = 0;
  try {
    const { credentials } = await resolveMetaCredentials();
    if (!credentials) throw new MetaError("META_NOT_CONFIGURED", false);
    const client = metaClient(credentials, deadline);
    const account = await client.account();
    const token = await client.tokenInfo();
    await repository.saveTokenMetadata(token);
    if (
      token.expires_at &&
      Date.parse(token.expires_at) <= Date.now() + 14 * 86400000
    )
      await raiseAlert({
        type: "meta_token_expiring",
        source: "meta",
        entityType: "integration",
        entityId: null,
        keyParts: ["meta"],
        evidence: { expires_at: token.expires_at },
      });
    const { values } = await machineSettings();
    const state = await repository.metaState();
    let progress = state?.cursor
      ? progressSchema.parse(JSON.parse(state.cursor))
      : null;
    if (progress && progress.account !== account.account_id)
      throw new MetaError("META_PENDING_ACCOUNT_MISMATCH", false);
    if (
      progress &&
      range &&
      (range.from !== progress.from || range.to !== progress.to)
    )
      throw new MetaError("META_RANGE_IN_PROGRESS", false);
    if (!progress) {
      const yesterday = shiftDate(accountToday(account.timezone_name), -1);
      const dates = range
        ? ingestRange.parse(range)
        : { from: shiftDate(yesterday, -3), to: yesterday };
      if (dates.to > yesterday)
        throw new MetaError("META_INCOMPLETE_DAY", false);
      progress = {
        account: account.account_id,
        ...dates,
        date: dates.from,
        after: null,
        completedDays: 0,
      };
      await repository.commitPage(
        run,
        account,
        [],
        JSON.stringify(progress),
        false,
      );
    }
    // Keep each provider page <= job batch and persist its exact next cursor atomically.
    if (!progress) throw new Error("META_INVALID_PROGRESS");
    while (
      progress.date <= progress.to &&
      read < max &&
      Date.now() + 14000 < deadline
    ) {
      const page = await client.insights(
        progress.date,
        progress.after,
        max - read,
      );
      const date = progress.date;
      const rows = page.rows.map((row) =>
        normalizeInsight(
          row,
          account,
          date,
          values["meta.primary_result_type"],
        ),
      );
      read += rows.length;
      const next: z.infer<typeof progressSchema> = {
        ...progress,
        after: page.after,
        date: page.after ? progress.date : shiftDate(progress.date, 1),
        completedDays: progress.completedDays + (page.after ? 0 : 1),
      };
      const complete = next.date > next.to;
      written += await repository.commitPage(
        run,
        account,
        rows,
        complete ? null : JSON.stringify(next),
        complete,
      );
      progress = next;
      if (complete) break;
    }
    if (Date.now() + 7000 < deadline)
      await (await import("@/services/meta-health")).evaluateMetaHealth();
    return {
      read,
      written,
      failed: 0,
      hasMore: progress.date <= progress.to,
      cursor: progress.date,
    };
  } catch (error) {
    const code =
      error instanceof MetaError ? error.code : "META_PROCESSING_FAILED";
    await repository.markFailure(run, code);
    return { read, written, failed: 1, hasMore: true, cursor: code };
  }
}
