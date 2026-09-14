import "server-only";
import { z } from "zod";
import { dashboard } from "@/repositories/integrations";
import { requireUser } from "@/services/session";
import { serverEnv } from "@/lib/env.server";
import { integrationHealth } from "@/domain/integrations";
export async function integrationModel(
  search: Record<string, string | string[] | undefined> = {},
) {
  await requireUser();
  const filters = z
    .object({
      page: z.coerce.number().int().min(0).max(100000).catch(0),
      status: z
        .enum(["running", "success", "partial", "failed"])
        .optional()
        .catch(undefined),
      trigger: z
        .enum(["manual", "schedule", "webhook"])
        .optional()
        .catch(undefined),
    })
    .parse(search);
  const data = await dashboard(filters.page, filters.status, filters.trigger);
  const state = data.states.find(
    (s) => s.integration === "jobs" && s.resource === "JOB-RETRY-EVENTS",
  );
  const configured = Boolean(
    serverEnv.APP_ENV === "production" &&
    serverEnv.CRON_SECRET &&
    serverEnv.JOBS_ENABLED === "true",
  );
  return {
    ...data,
    filters,
    configured,
    ingestConfigured: Boolean(serverEnv.INGEST_HMAC_SECRET),
    health: integrationHealth(
      configured,
      state?.last_success_at ?? null,
      state?.consecutive_failures ?? 0,
      data.last?.status === "partial",
      600000,
      Date.now(),
    ),
    lastSuccess: state?.last_success_at ?? null,
    criticalCandidates:
      data.deadTotal +
      (state?.consecutive_failures && state.consecutive_failures >= 3 ? 1 : 0),
  };
}
