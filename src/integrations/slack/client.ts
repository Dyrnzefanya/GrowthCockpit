import "server-only";
import { z } from "zod";
import { serverEnv } from "@/lib/env.server";

const messageSchema = z
  .object({
    type: z.string().regex(/^[a-z_]{1,80}$/),
    severity: z.enum(["info", "warning", "critical"]),
    entityType: z.string().regex(/^[a-z_]{1,80}$/),
    entityIds: z.array(z.uuid()).max(25),
    count: z.number().int().positive().max(10000),
    url: z.url().max(500),
    environment: z.enum(["development", "preview", "production"]),
    reasonCodes: z
      .array(z.string().regex(/^[A-Z0-9_:-]{1,120}$/))
      .max(10)
      .default([]),
  })
  .strict();
export type SlackMessage = z.input<typeof messageSchema>;

const labels: Record<string, string> = {
  new_mql: "New MQL",
  new_sql: "New SQL",
  deal_won: "Deal won",
  deal_lost: "Deal lost",
  stale_lead: "Stale lead",
  integration_failure: "Integration failure",
  integration_recovered: "Integration recovered",
  dead_letter: "Dead letter",
  job_failure_streak: "Job failure streak",
  attribution_coverage_low: "Attribution coverage low",
  scheduler_overdue: "Scheduler overdue",
};

export function serializeSlack(value: SlackMessage) {
  const input = messageSchema.parse(value);
  const ids = input.entityIds.slice(0, 10);
  const lines = [
    `[${input.severity.toUpperCase()}] ${labels[input.type] ?? input.type}`,
    `${input.entityType}: ${input.count} item${input.count === 1 ? "" : "s"}`,
    ...(ids.length ? [`IDs: ${ids.join(", ")}`] : []),
    ...(input.count > ids.length
      ? [`Additional items: ${input.count - ids.length}`]
      : []),
    ...(input.reasonCodes.length
      ? [`Reason codes: ${input.reasonCodes.join(", ")}`]
      : []),
    `Environment: ${input.environment}`,
    `Open GrowthCockpit: ${input.url}`,
  ];
  return { text: lines.join("\n") };
}

export async function sendSlack(
  value: SlackMessage,
  transport: typeof fetch = fetch,
  pause: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
) {
  if (!serverEnv.SLACK_WEBHOOK_URL) throw new Error("NOT_CONFIGURED");
  const body = JSON.stringify(serializeSlack(value));
  let finalCode = "UPSTREAM_UNAVAILABLE";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await transport(serverEnv.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        redirect: "error",
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) return;
      if (response.status < 500 && response.status !== 429)
        throw new Error("BUSINESS_RULE_REJECTED");
      finalCode =
        response.status === 429
          ? "UPSTREAM_RATE_LIMITED"
          : "UPSTREAM_UNAVAILABLE";
      if (attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await pause(
          Number.isFinite(retryAfter)
            ? Math.min(Math.max(retryAfter, 0), 2) * 1000
            : 250 * 2 ** attempt,
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message === "BUSINESS_RULE_REJECTED")
        throw error;
      finalCode = error instanceof TypeError ? "NETWORK" : "TIMEOUT";
      if (attempt < 2) await pause(250 * 2 ** attempt);
    }
  }
  throw new Error(finalCode);
}
