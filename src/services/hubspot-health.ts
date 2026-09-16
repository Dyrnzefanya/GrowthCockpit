import "server-only";
import { configuration, statusData } from "@/repositories/hubspot";
import { serverEnv } from "@/lib/env.server";
import { integrationHealth } from "@/domain/integrations";
import { requireUser } from "@/services/session";
export async function hubspotModel() {
  await requireUser();
  try {
    const [config, data] = await Promise.all([configuration(), statusData()]);
    const configured = Boolean(
      serverEnv.HUBSPOT_ACCESS_TOKEN &&
      config.mapping &&
      config.mapping.portal_id === serverEnv.HUBSPOT_PORTAL_ID,
    );
    const successes = data.states
      .filter((s) => ["contacts", "companies", "deals"].includes(s.resource))
      .map((s) => s.last_success_at)
      .filter((v): v is string => Boolean(v))
      .sort();
    const healthSuccess = successes[0] ?? null;
    const lastSuccess = successes.at(-1) ?? null;
    const failures = Math.max(
      0,
      ...data.states.map((s) => s.consecutive_failures),
    );
    const lastRun =
      data.runs[0]?.started_at ??
      data.states
        .map((state) => state.last_run_at)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ??
      null;
    return {
      ...data,
      ...config,
      health:
        (!config.mapping && serverEnv.HUBSPOT_ACCESS_TOKEN) ||
        data.runs[0]?.status === "failed"
          ? ("failing" as const)
          : integrationHealth(
              configured,
              healthSuccess,
              failures,
              data.runs[0]?.status === "partial",
              1800000,
              Date.now(),
            ),
      configured,
      lastRun,
      lastSuccess,
      failures,
      error:
        data.runs.find((run) => run.error_summary)?.error_summary ??
        data.states.find((state) => state.last_error)?.last_error ??
        null,
    };
  } catch {
    return {
      states: [],
      runs: [],
      mapping: null,
      writeLifecycle: false,
      rule: "lead_last_touch",
      health: "failing" as const,
      configured: false,
      lastRun: null,
      lastSuccess: null,
      failures: 0,
      error: "STATUS_UNAVAILABLE",
    };
  }
}
