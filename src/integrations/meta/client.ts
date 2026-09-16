import "server-only";
import { z } from "zod";
import type { MetaCredentials } from "@/services/provider-credentials";
import { accountSchema, type MetaAccount } from "./transform";

export interface AdMetricsProvider {
  account(): Promise<MetaAccount>;
  insights(
    date: string,
    after: string | null,
    limit: number,
  ): Promise<{ rows: unknown[]; after: string | null }>;
}
export class MetaError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryable: boolean,
    public readonly retryAfterMs = 0,
  ) {
    super(code);
  }
}
const pageSchema = z.object({
  data: z.array(z.unknown()).max(500),
  paging: z
    .object({
      cursors: z.object({ after: z.string().max(4096).optional() }).optional(),
      next: z.string().optional(),
    })
    .optional(),
});
export function metaClient(
  credentials: MetaCredentials,
  deadline: number,
  transport: typeof fetch = fetch,
) {
  const {
    accessToken: token,
    adAccountId: accountId,
    apiVersion,
  } = credentials;
  async function get(path: string, params: Record<string, string>) {
    const url = new URL(`https://graph.facebook.com/${apiVersion}/${path}`);
    for (const [key, value] of Object.entries(params))
      url.searchParams.set(key, value);
    for (let attempt = 0; attempt < 3; attempt++) {
      if (Date.now() + 5000 > deadline)
        throw new MetaError("META_TIMEOUT", true);
      let response: Response;
      try {
        response = await transport(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(4000),
        });
      } catch {
        throw new MetaError("META_TIMEOUT", true);
      }
      const body: unknown = await response.json().catch(() => null);
      const error = z
        .object({
          error: z.object({
            code: z.number(),
            is_transient: z.boolean().optional(),
          }),
        })
        .safeParse(body);
      if (response.ok && !error.success) return body;
      const code = error.success ? error.data.error.code : 0;
      const retryable =
        response.status === 429 ||
        response.status >= 500 ||
        [1, 2, 4, 17, 32, 613].includes(code) ||
        (error.success && error.data.error.is_transient === true);
      const delay = Math.max(
        1000 * 2 ** attempt,
        Number(response.headers.get("retry-after") ?? 0) * 1000,
      );
      if (!retryable || attempt === 2 || Date.now() + delay + 5000 > deadline)
        throw new MetaError(
          code === 190
            ? "META_TOKEN_INVALID"
            : retryable
              ? "META_RETRYABLE"
              : "META_REQUEST_REJECTED",
          retryable,
          delay,
        );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    throw new MetaError("META_RETRYABLE", true);
  }
  return {
    async account() {
      const value = accountSchema.parse(
        await get(`act_${accountId}`, {
          fields: "account_id,name,currency,timezone_name",
        }),
      );
      if (value.account_id !== accountId)
        throw new MetaError("META_ACCOUNT_MISMATCH", false);
      return value;
    },
    async tokenInfo() {
      const value = z
        .object({
          data: z.object({
            is_valid: z.boolean(),
            expires_at: z.number().int().nonnegative(),
            data_access_expires_at: z.number().int().nonnegative().optional(),
            scopes: z.array(z.string()),
          }),
        })
        .parse(await get("debug_token", { input_token: token }));
      if (
        !value.data.is_valid ||
        !value.data.scopes.includes("ads_read") ||
        value.data.scopes.includes("ads_management")
      )
        throw new MetaError("META_TOKEN_SCOPE", false);
      const expiries = [
        value.data.expires_at,
        value.data.data_access_expires_at ?? 0,
      ].filter((v) => v > 0);
      return {
        expires_at: expiries.length
          ? new Date(Math.min(...expiries) * 1000).toISOString()
          : null,
        verified_at: new Date().toISOString(),
      };
    },
    async insights(date: string, after: string | null, limit: number) {
      const page = pageSchema.parse(
        await get(`act_${accountId}/insights`, {
          fields:
            "date_start,date_stop,campaign_id,campaign_name,impressions,clicks,spend,reach,frequency,actions,cost_per_action_type",
          level: "campaign",
          time_increment: "1",
          time_range: JSON.stringify({ since: date, until: date }),
          use_account_attribution_setting: "true",
          limit: String(Math.min(limit, 500)),
          ...(after ? { after } : {}),
        }),
      );
      const cursor = page.paging?.next ? page.paging.cursors?.after : null;
      if (page.paging?.next && (!cursor || cursor === after))
        throw new MetaError("META_INVALID_CURSOR", false);
      // Never follow provider next URLs (they may contain credentials or another origin).
      return { rows: page.data, after: cursor ?? null };
    },
  } satisfies AdMetricsProvider & {
    tokenInfo(): Promise<{ expires_at: string | null; verified_at: string }>;
  };
}
