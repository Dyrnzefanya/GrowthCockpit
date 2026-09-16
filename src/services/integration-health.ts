import "server-only";
import { z } from "zod";
import { dashboard } from "@/repositories/integrations";
import { requireUser } from "@/services/session";
import { serverEnv } from "@/lib/env.server";
import { integrationHealth } from "@/domain/integrations";
import { notificationVolume } from "@/repositories/alerts";
import { jobs } from "@/services/jobs/registry";
import { weekdayJobOverdue } from "@/domain/alerts/policy";
import {
  resolveHubspotCredentials,
  resolveMetaCredentials,
} from "@/services/provider-credentials";
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
  const [data, volume, meta, hubspot] = await Promise.all([
    dashboard(filters.page, filters.status, filters.trigger),
    notificationVolume(),
    resolveMetaCredentials(),
    resolveHubspotCredentials(),
  ]);
  const state = data.states.find(
    (candidate) =>
      candidate.integration === "jobs" &&
      candidate.resource === "JOB-RETRY-EVENTS",
  );
  const configured = Boolean(
    serverEnv.APP_ENV === "production" &&
    serverEnv.CRON_SECRET &&
    serverEnv.JOBS_ENABLED === "true",
  );
  const now = new Date();
  const jobHealth = jobs.map((job) => {
    const jobState = data.states.find(
      (candidate) =>
        candidate.integration === "jobs" && candidate.resource === job.key,
    );
    const providerConfigured =
      (job.key !== "JOB-META-INGEST" || Boolean(meta.credentials)) &&
      (job.key !== "JOB-HUBSPOT-RECONCILE" || Boolean(hubspot.credentials)) &&
      (job.key !== "JOB-NOTIFY-DISPATCH" ||
        Boolean(serverEnv.SLACK_WEBHOOK_URL));
    const isConfigured = configured && providerConfigured;
    const failures = jobState?.consecutive_failures ?? 0;
    const partial = Boolean(
      jobState?.last_run_at &&
      jobState.last_run_at !== jobState.last_success_at &&
      !jobState.last_error,
    );
    const health =
      job.cadenceMinutes === null
        ? !isConfigured
          ? ("not_configured" as const)
          : failures >= 3 ||
              weekdayJobOverdue(jobState?.last_run_at ?? null, now)
            ? ("failing" as const)
            : failures > 0 || partial
              ? ("degraded" as const)
              : ("healthy" as const)
        : integrationHealth(
            isConfigured,
            jobState?.last_success_at ?? null,
            failures,
            partial,
            job.cadenceMinutes * 60000,
            now.getTime(),
          );
    return {
      ...job,
      health,
      lastRun: jobState?.last_run_at ?? null,
      lastSuccess: jobState?.last_success_at ?? null,
      failures,
      error: jobState?.last_error ?? null,
    };
  });
  const sourceState = (integration: string, resource?: string) =>
    data.states
      .filter(
        (candidate) =>
          candidate.integration === integration &&
          (!resource || candidate.resource === resource),
      )
      .sort((a, b) => (b.last_run_at ?? "").localeCompare(a.last_run_at ?? ""));
  const integrationSummary = (
    integration: string,
    isConfigured: boolean,
    resource?: string,
  ) => {
    const states = sourceState(integration, resource);
    const failures = Math.max(
      0,
      ...states.map((candidate) => candidate.consecutive_failures),
    );
    const lastSuccess =
      states
        .map((candidate) => candidate.last_success_at)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null;
    return {
      status: !isConfigured
        ? ("not_configured" as const)
        : failures >= 3
          ? ("failing" as const)
          : failures > 0
            ? ("degraded" as const)
            : lastSuccess
              ? ("healthy" as const)
              : ("info" as const),
      lastRun: states[0]?.last_run_at ?? null,
      lastSuccess,
      failures,
      error:
        states.find((candidate) => candidate.last_error)?.last_error ?? null,
    };
  };
  const ingestConfigured = Boolean(serverEnv.INGEST_HMAC_SECRET);
  const slackConfigured = Boolean(serverEnv.SLACK_WEBHOOK_URL);
  return {
    ...data,
    volume,
    filters,
    configured,
    ingestConfigured,
    ingest: integrationSummary("lead_ingest", ingestConfigured),
    slackConfigured,
    slack: integrationSummary("jobs", slackConfigured, "JOB-NOTIFY-DISPATCH"),
    health: integrationHealth(
      configured,
      state?.last_success_at ?? null,
      state?.consecutive_failures ?? 0,
      Boolean(
        state?.last_run_at &&
        state.last_run_at !== state.last_success_at &&
        !state.last_error,
      ),
      600000,
      now.getTime(),
    ),
    lastSuccess: state?.last_success_at ?? null,
    criticalCandidates:
      data.deadTotal + jobHealth.filter((job) => job.failures >= 3).length,
    jobHealth,
  };
}
