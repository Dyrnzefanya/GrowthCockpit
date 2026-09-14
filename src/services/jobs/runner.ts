import "server-only";
import { randomUUID } from "node:crypto";
import { registeredJob } from "./registry";
import * as repository from "@/repositories/integrations";
import { processNext, safeResponse } from "@/services/integration-runs";
import { errorCode } from "@/domain/integrations";
import { serverEnv } from "@/lib/env.server";
import { equalSecret } from "@/lib/http/hmac";
import { authenticatedUser } from "@/repositories/auth";
import { can } from "@/lib/auth/can";
export async function runJob(key: string, trigger: "manual" | "schedule") {
  const job = registeredJob(key);
  if (!job) return { http: 404, status: "not_found" };
  const correlation = randomUUID();
  const started = Date.now();
  let run: string | null = null,
    read = 0,
    written = 0,
    failed = 0,
    cursor: string | null = null;
  let status = "failed",
    code: string | null = null,
    hasMore = false;
  try {
    run = await repository.startJob(key, trigger, correlation);
    if (!run) {
      status = "skipped";
      return {
        http: 409,
        status: "already_running",
        correlation_id: correlation,
      };
    }
    const deadline = Date.now() + job.budgetMs;
    const { values } = await repository.machineSettings(),
      maxBatch = Math.min(values["jobs.max_batch"], 500),
      maxAttempts = Math.min(values["jobs.max_attempts"], 100);
    if (key === "JOB-HUBSPOT-RECONCILE") {
      const result = await (
        await import("@/services/crm-sync")
      ).reconcileHubspot(deadline, maxBatch);
      read = result.read;
      written = result.written;
      failed = result.failed;
      hasMore = result.hasMore;
    } else {
      // Reserve the worst-case 24-second item budget before claiming another item.
      while (read < maxBatch && Date.now() + 24000 < deadline) {
        const result = await processNext(null, trigger, maxAttempts);
        if (!result) break;
        read++;
        written += result.written;
        failed += result.failed;
        cursor = result.id;
      }
      hasMore = await repository.dueExists();
    }
    status = failed
      ? written
        ? "partial"
        : "failed"
      : hasMore
        ? "partial"
        : "success";
    if (failed) code = "EVENT_PROCESSING_FAILED";
  } catch (e) {
    code = errorCode(e);
    status = "failed";
    failed = Math.max(1, failed);
  } finally {
    if (run)
      try {
        await repository.finishRun(
          run,
          status,
          read,
          written,
          failed,
          code,
          hasMore ? cursor : null,
        );
      } catch {
        code = "RUN_FINALIZATION_FAILED";
        status = "failed";
      }
    console.info(
      JSON.stringify({
        correlation_id: correlation,
        route: "/api/jobs/[job]",
        outcome: status,
        duration_ms: Date.now() - started,
        records_read: read,
        records_written: written,
        records_failed: failed,
      }),
    );
  }
  return {
    http: 200,
    status,
    hasMore,
    records_read: read,
    records_written: written,
    records_failed: failed,
    correlation_id: correlation,
    ...(code ? { code } : {}),
  };
}
export async function dispatchJob(request: Request, key: string) {
  try {
    const authorization = request.headers.get("authorization");
    let trigger: "manual" | "schedule" = "schedule";
    if (authorization !== null) {
      if (
        !serverEnv.CRON_SECRET ||
        !equalSecret(authorization, `Bearer ${serverEnv.CRON_SECRET}`)
      )
        return safeResponse({ code: "UNAUTHENTICATED" }, 401);
      if (
        serverEnv.APP_ENV !== "production" ||
        serverEnv.JOBS_ENABLED !== "true"
      )
        return safeResponse({ code: "JOBS_DISABLED" }, 503);
    } else {
      if (request.method !== "POST")
        return safeResponse({ code: "UNAUTHENTICATED" }, 401);
      if (
        request.headers.get("origin") !== new URL(serverEnv.APP_BASE_URL).origin
      )
        return safeResponse({ code: "FORBIDDEN" }, 403);
      const user = await authenticatedUser();
      if (!user?.email_confirmed_at)
        return safeResponse({ code: "UNAUTHENTICATED" }, 401);
      if (!(await can("integration:write")))
        return safeResponse({ code: "FORBIDDEN" }, 403);
      trigger = "manual";
    }
    const result = await runJob(key, trigger);
    return safeResponse(result, result.http);
  } catch {
    return safeResponse({ status: "failed", code: "INTERNAL" });
  }
}
