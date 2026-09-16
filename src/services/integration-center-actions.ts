"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  hubspotStoredConfigSchema,
  hubspotStoredSecretsSchema,
  metaStoredConfigSchema,
  metaStoredSecretsSchema,
  providerDefinition,
  providerIdSchema,
} from "@/domain/integration-providers";
import { MetaError, metaClient } from "@/integrations/meta/client";
import { validatePortal } from "@/integrations/hubspot/client";
import { can } from "@/lib/auth/can";
import {
  recordVerification,
  removeProvider,
  saveProvider,
} from "@/repositories/integration-credentials";
import {
  resolveHubspotCredentials,
  resolveMetaCredentials,
} from "@/services/provider-credentials";
import { requireUser } from "@/services/session";

export type IntegrationActionState = {
  message: string;
  correlationId?: string;
};

const allowedErrors = new Set([
  "META_TOKEN_INVALID",
  "META_TOKEN_SCOPE",
  "META_ACCOUNT_MISMATCH",
  "META_REQUEST_REJECTED",
  "META_TIMEOUT",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "MAPPING_INVALID",
  "NOT_CONFIGURED",
  "UPSTREAM_RATE_LIMITED",
  "UPSTREAM_UNAVAILABLE",
  "TIMEOUT",
  "NETWORK",
  "VALIDATION_FAILED",
]);
const safeError = (error: unknown) => {
  const code =
    error instanceof MetaError
      ? error.code
      : error instanceof Error
        ? error.message
        : "INTERNAL";
  return allowedErrors.has(code) ? code : "INTERNAL";
};

function refresh() {
  revalidatePath("/settings/integrations");
  revalidatePath("/integrations");
  revalidatePath("/performance");
}

export async function integrationCenterAction(
  _previous: IntegrationActionState,
  form: FormData,
): Promise<IntegrationActionState> {
  const user = await requireUser();
  const correlationId = randomUUID();
  if (!(await can("integration:write")))
    return { message: "Access denied.", correlationId };
  const provider = providerIdSchema.safeParse(form.get("provider"));
  const operation = form.get("operation");
  if (
    !provider.success ||
    !["save", "test", "remove"].includes(String(operation))
  )
    return { message: "Invalid integration request.", correlationId };
  const definition = providerDefinition(provider.data);
  if (definition.availability !== "available")
    return { message: "This provider is not implemented.", correlationId };
  if (provider.data !== "meta" && provider.data !== "hubspot")
    return { message: "This provider is not implemented.", correlationId };

  try {
    if (operation === "save") {
      if (provider.data === "meta") {
        const config = metaStoredConfigSchema.parse({
          ad_account_id: form.get("ad_account_id"),
          api_version: form.get("api_version"),
        });
        const value = String(form.get("access_token") ?? "").trim();
        const secrets = value
          ? metaStoredSecretsSchema.parse({ access_token: value })
          : {};
        await saveProvider({
          provider: "meta",
          config,
          secrets,
          actor: user.id,
          correlation: correlationId,
        });
      } else {
        const config = hubspotStoredConfigSchema.parse({
          portal_id: form.get("portal_id"),
        });
        const values = Object.fromEntries(
          ["access_token", "webhook_secret"]
            .map((key) => [key, String(form.get(key) ?? "").trim()] as const)
            .filter((entry) => entry[1]),
        );
        const secrets = hubspotStoredSecretsSchema.partial().parse(values);
        await saveProvider({
          provider: "hubspot",
          config,
          secrets,
          actor: user.id,
          correlation: correlationId,
        });
      }
      refresh();
      return {
        message: "Configuration saved. Test the connection before use.",
        correlationId,
      };
    }

    if (operation === "remove") {
      await removeProvider(provider.data, user.id, correlationId);
      refresh();
      return {
        message:
          "Settings-managed credentials removed. Server environment fallback may remain active.",
        correlationId,
      };
    }

    try {
      if (provider.data === "meta") {
        const resolved = await resolveMetaCredentials();
        if (!resolved.credentials)
          return {
            message: "NOT_CONFIGURED: Configure Meta Ads first.",
            correlationId,
          };
        const client = metaClient(resolved.credentials, Date.now() + 15000);
        const [account, token] = await Promise.all([
          client.account(),
          client.tokenInfo(),
        ]);
        await recordVerification({
          provider: "meta",
          success: true,
          identity: {
            account_name: account.name,
            account_id: account.account_id,
            currency: account.currency,
            timezone: account.timezone_name,
            token_expires_at: token.expires_at,
          },
          error: null,
          actor: user.id,
          correlation: correlationId,
        });
      } else {
        const resolved = await resolveHubspotCredentials();
        if (!resolved.credentials)
          return {
            message: "NOT_CONFIGURED: Configure HubSpot first.",
            correlationId,
          };
        const account = await validatePortal(
          resolved.credentials.portalId,
          Date.now() + 15000,
          true,
        );
        await recordVerification({
          provider: "hubspot",
          success: true,
          identity: {
            portal_id: account.portal,
            currency: account.currency,
          },
          error: null,
          actor: user.id,
          correlation: correlationId,
        });
      }
      refresh();
      return { message: "Connection verified.", correlationId };
    } catch (error) {
      const code = safeError(error);
      await recordVerification({
        provider: provider.data,
        success: false,
        identity: {},
        error: code,
        actor: user.id,
        correlation: correlationId,
      });
      refresh();
      return {
        message: `${code}: The configured credential was rejected or could not be verified.`,
        correlationId,
      };
    }
  } catch {
    return {
      message:
        "The operation failed. No credential value was returned or logged.",
      correlationId,
    };
  }
}
