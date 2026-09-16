import "server-only";
import { z } from "zod";
import {
  providerRegistry,
  providerState,
  type ProviderId,
  type ProviderState,
} from "@/domain/integration-providers";
import { requireUser } from "@/services/session";
import { can } from "@/lib/auth/can";
import {
  providerSummaries,
  type StoredProviderSummary,
} from "@/repositories/integration-credentials";
import {
  resolveHubspotCredentials,
  resolveHubspotWebhookCredentials,
  resolveMetaCredentials,
  type CredentialSource,
} from "@/services/provider-credentials";

export type IntegrationCenterProvider = {
  id: ProviderId;
  name: string;
  description: string;
  state: ProviderState;
  source: CredentialSource;
  editable: boolean;
  fields: readonly {
    key: string;
    label: string;
    kind: "secret" | "config";
    inputMode?: "numeric" | "text";
    defaultValue: string;
    configured: boolean;
  }[];
  capabilities: readonly string[];
  environmentFallbackAvailable: boolean;
  settingsManaged: boolean;
  configuredAt: string | null;
  credentialsUpdatedAt: string | null;
  lastVerifiedAt: string | null;
  lastErrorCode: string | null;
  identity: { label: string; value: string }[];
};

const safeMetaIdentity = z.object({
  account_name: z.string().max(300).optional(),
  account_id: z
    .string()
    .regex(/^\d{1,30}$/)
    .optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  timezone: z.string().max(100).optional(),
  token_expires_at: z.string().nullable().optional(),
});
const safeHubspotIdentity = z.object({
  portal_id: z
    .string()
    .regex(/^\d{1,30}$/)
    .optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
});
const maskId = (value: string) =>
  value.length <= 4
    ? value
    : `${"•".repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;

function identity(provider: ProviderId, row?: StoredProviderSummary) {
  if (provider === "meta") {
    const value = safeMetaIdentity.safeParse(row?.provider_identity);
    if (!value.success) return [];
    return [
      value.data.account_name && {
        label: "Account name",
        value: value.data.account_name,
      },
      value.data.account_id && {
        label: "Ad Account ID",
        value: maskId(value.data.account_id),
      },
      value.data.currency && { label: "Currency", value: value.data.currency },
      value.data.timezone && { label: "Timezone", value: value.data.timezone },
      value.data.token_expires_at && {
        label:
          Date.parse(value.data.token_expires_at) <= Date.now() + 14 * 86400000
            ? "Token expiry warning"
            : "Token expiry",
        value: value.data.token_expires_at,
      },
    ].filter((item): item is { label: string; value: string } => Boolean(item));
  }
  if (provider === "hubspot") {
    const value = safeHubspotIdentity.safeParse(row?.provider_identity);
    if (!value.success) return [];
    return [
      value.data.portal_id && {
        label: "Portal ID",
        value: maskId(value.data.portal_id),
      },
      value.data.currency && { label: "Currency", value: value.data.currency },
    ].filter((item): item is { label: string; value: string } => Boolean(item));
  }
  return [];
}

export async function integrationCenterModel(): Promise<{
  editable: boolean;
  providers: IntegrationCenterProvider[];
}> {
  await requireUser();
  const [editable, stored, meta, hubspot, hubspotWebhook] = await Promise.all([
    can("integration:write"),
    providerSummaries(),
    resolveMetaCredentials(),
    resolveHubspotCredentials(),
    resolveHubspotWebhookCredentials(),
  ]);
  return {
    editable,
    providers: providerRegistry.map((definition) => {
      const row = stored.find(
        (candidate) => candidate.provider === definition.id,
      );
      const resolution =
        definition.id === "meta"
          ? meta
          : definition.id === "hubspot"
            ? hubspot
            : {
                source: "none" as const,
                credentials: null,
                environmentFallbackAvailable: false,
              };
      const settingsManaged = Boolean(
        row && row.secretKeys.length > 0 && !row.disconnected_at,
      );
      const config = row?.config ?? {};
      const resolvedConfig = (key: string) =>
        definition.id === "meta" && key === "ad_account_id"
          ? meta.credentials?.adAccountId
          : definition.id === "meta" && key === "api_version"
            ? meta.credentials?.apiVersion
            : definition.id === "hubspot" && key === "portal_id"
              ? (hubspot.credentials?.portalId ??
                hubspotWebhook.credentials?.portalId)
              : undefined;
      return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        state: providerState({
          availability: definition.availability,
          configured: Boolean(resolution.credentials),
          lastVerifiedAt: row?.last_verified_at ?? null,
          lastErrorCode: row?.last_error_code ?? null,
          disconnectedAt: row?.disconnected_at ?? null,
        }),
        source: resolution.source,
        editable,
        fields: definition.fields.map((field) => ({
          ...field,
          defaultValue:
            field.kind === "config"
              ? String(
                  config[field.key] ??
                    resolvedConfig(field.key) ??
                    field.defaultValue ??
                    "",
                )
              : "",
          configured:
            field.kind === "secret"
              ? Boolean(row?.secretKeys.includes(field.key)) ||
                (definition.id === "meta" &&
                  field.key === "access_token" &&
                  meta.source === "environment") ||
                (definition.id === "hubspot" &&
                  field.key === "access_token" &&
                  hubspot.source === "environment") ||
                (definition.id === "hubspot" &&
                  field.key === "webhook_secret" &&
                  hubspotWebhook.source === "environment")
              : Boolean(resolution.credentials),
        })),
        capabilities: definition.capabilities,
        environmentFallbackAvailable:
          resolution.environmentFallbackAvailable ||
          (definition.id === "hubspot" &&
            hubspotWebhook.environmentFallbackAvailable),
        settingsManaged,
        configuredAt: row?.configured_at ?? null,
        credentialsUpdatedAt: row?.credentials_updated_at ?? null,
        lastVerifiedAt: row?.last_verified_at ?? null,
        lastErrorCode: row?.last_error_code ?? null,
        identity: identity(definition.id, row),
      };
    }),
  };
}
