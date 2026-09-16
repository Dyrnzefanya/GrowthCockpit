import "server-only";
import { z } from "zod";
import { metaHealthData } from "@/repositories/ad-metrics";
import { serverEnv } from "@/lib/env.server";
import { parseCampaignName } from "@/domain/attribution/naming";
import { ratio } from "@/domain/metrics/formulas";
import { readSettings } from "@/repositories/settings";
import { machineSettings } from "@/repositories/integrations";
import { raiseAlerts } from "@/services/alerts";
import { resolveMissing } from "@/repositories/alerts";
import { alertKey } from "@/domain/alerts/keys";
import type { AlertCandidate } from "@/services/alerts";
import { integrationHealth } from "@/domain/integrations";
const healthFacts = z.object({
  names: z.array(z.object({ campaign_name: z.string() })),
  currencies: z.array(z.object({ currency: z.string() })),
});
export async function metaHealthModel(machine = false) {
  const [data, { values }] = await Promise.all([
    metaHealthData(machine),
    machine ? machineSettings() : readSettings(),
  ]);
  const facts = healthFacts.parse(data.facts);
  const metadata = z
    .object({ expires_at: z.string().nullable(), verified_at: z.string() })
    .safeParse(data.token);
  let progress: {
    from: string;
    to: string;
    date: string;
    completedDays: number;
  } | null = null;
  if (data.state?.cursor) {
    const parsed = z
      .object({
        from: z.string(),
        to: z.string(),
        date: z.string(),
        completedDays: z.number(),
      })
      .safeParse(JSON.parse(data.state.cursor));
    if (parsed.success) progress = parsed.data;
  }
  const configured = Boolean(
    serverEnv.META_ACCESS_TOKEN && serverEnv.META_AD_ACCOUNT_ID,
  );
  const slaHours = values["meta.freshness_hours"];
  return {
    accounts: data.accounts.map((account) => ({
      ...account,
      offset:
        new Intl.DateTimeFormat("en", {
          timeZone: account.timezone,
          timeZoneName: "longOffset",
        })
          .formatToParts(new Date())
          .find((p) => p.type === "timeZoneName")?.value ?? "",
    })),
    configured,
    health: integrationHealth(
      configured,
      data.state?.last_success_at ?? null,
      data.state?.consecutive_failures ?? 0,
      Boolean(progress),
      slaHours * 3600000,
      Date.now(),
    ),
    lastRun: data.state?.last_run_at ?? null,
    lastSuccess: data.state?.last_success_at ?? null,
    failures: data.state?.consecutive_failures ?? 0,
    error: data.state?.last_error ?? null,
    progress,
    expiry: metadata.success ? metadata.data.expires_at : null,
    tokenVerified: metadata.success,
    namingCompliance: ratio(
      facts.names.filter((n) => parseCampaignName(n.campaign_name)).length,
      facts.names.length,
    ),
    mixed: facts.currencies.length > 1,
    resultType: values["meta.primary_result_type"],
    slaHours,
  };
}
export async function evaluateMetaHealth(now = new Date()) {
  const m = await metaHealthModel(true),
    candidates: AlertCandidate[] = [];
  const common = {
    source: "meta",
    entityType: "integration",
    entityId: null,
    keyParts: ["meta"],
    detectedAt: now.toISOString(),
  } as const;
  if (m.mixed)
    candidates.push({
      ...common,
      keyParts: ["meta"],
      type: "meta_currency_mismatch",
      evidence: { reason_code: "MIXED_CURRENCY" },
    });
  if (
    m.configured &&
    (!m.lastSuccess ||
      now.getTime() - Date.parse(m.lastSuccess) > m.slaHours * 2 * 3600000)
  )
    candidates.push({
      ...common,
      keyParts: ["meta"],
      type: "meta_stale",
      evidence: { last_success: m.lastSuccess },
    });
  if (m.expiry && Date.parse(m.expiry) <= now.getTime() + 14 * 86400000)
    candidates.push({
      ...common,
      keyParts: ["meta"],
      type: "meta_token_expiring",
      evidence: { expires_at: m.expiry },
    });
  await raiseAlerts(candidates);
  await resolveMissing(
    ["meta_currency_mismatch", "meta_stale", "meta_token_expiring"],
    candidates.map((c) => alertKey(c.type, ...c.keyParts)),
    now.toISOString(),
  );
  return candidates.length;
}
