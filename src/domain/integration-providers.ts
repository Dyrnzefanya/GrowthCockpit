import { z } from "zod";

export const providerIds = [
  "meta",
  "hubspot",
  "ga4",
  "search_console",
  "google_ads",
] as const;

export type ProviderId = (typeof providerIds)[number];
export type ProviderState =
  | "AVAILABLE_NOT_CONFIGURED"
  | "CONFIGURED_UNVERIFIED"
  | "CONNECTED"
  | "ERROR"
  | "DISCONNECTED"
  | "COMING_SOON";

export type ProviderField = {
  key: string;
  label: string;
  kind: "secret" | "config";
  inputMode?: "numeric" | "text";
  defaultValue?: string;
};

export type ProviderDefinition = {
  id: ProviderId;
  name: string;
  description: string;
  availability: "available" | "coming_soon";
  fields: readonly ProviderField[];
  capabilities: readonly string[];
};

export const providerRegistry: readonly ProviderDefinition[] = [
  {
    id: "meta",
    name: "Meta Ads",
    description: "Read-only campaign delivery and performance ingestion.",
    availability: "available",
    fields: [
      {
        key: "ad_account_id",
        label: "Ad Account ID",
        kind: "config",
        inputMode: "numeric",
      },
      {
        key: "api_version",
        label: "Graph API Version",
        kind: "config",
        defaultValue: "v26.0",
      },
      { key: "access_token", label: "Access Token", kind: "secret" },
    ],
    capabilities: ["test_connection", "campaign_read", "manual_ingest"],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "CRM mirror, reconciliation, and signed webhook ingestion.",
    availability: "available",
    fields: [
      {
        key: "portal_id",
        label: "Portal ID",
        kind: "config",
        inputMode: "numeric",
      },
      {
        key: "access_token",
        label: "Private App Access Token",
        kind: "secret",
      },
      {
        key: "webhook_secret",
        label: "Webhook Signing Secret",
        kind: "secret",
      },
    ],
    capabilities: ["test_connection", "crm_sync", "signed_webhook"],
  },
  {
    id: "ga4",
    name: "Google Analytics 4",
    description: "Web analytics integration is planned and not implemented.",
    availability: "coming_soon",
    fields: [],
    capabilities: [],
  },
  {
    id: "search_console",
    name: "Google Search Console",
    description: "Organic search integration is planned and not implemented.",
    availability: "coming_soon",
    fields: [],
    capabilities: [],
  },
  {
    id: "google_ads",
    name: "Google Ads",
    description: "Paid search integration is planned and not implemented.",
    availability: "coming_soon",
    fields: [],
    capabilities: [],
  },
] as const;

export const providerIdSchema = z.enum(providerIds);

export function providerDefinition(id: ProviderId) {
  return providerRegistry.find((provider) => provider.id === id)!;
}

export function providerState(input: {
  availability: ProviderDefinition["availability"];
  configured: boolean;
  lastVerifiedAt: string | null;
  lastErrorCode: string | null;
  disconnectedAt: string | null;
}): ProviderState {
  if (input.availability === "coming_soon") return "COMING_SOON";
  if (input.lastErrorCode) return "ERROR";
  if (input.configured)
    return input.lastVerifiedAt ? "CONNECTED" : "CONFIGURED_UNVERIFIED";
  return input.disconnectedAt ? "DISCONNECTED" : "AVAILABLE_NOT_CONFIGURED";
}

export const metaStoredConfigSchema = z.object({
  ad_account_id: z.string().regex(/^\d{1,30}$/),
  api_version: z.literal("v26.0"),
});
export const metaStoredSecretsSchema = z.object({
  access_token: z.string().trim().min(20).max(8192),
});
export const hubspotStoredConfigSchema = z.object({
  portal_id: z.string().regex(/^\d{1,30}$/),
});
export const hubspotStoredSecretsSchema = z.object({
  access_token: z.string().trim().min(20).max(8192),
  webhook_secret: z.string().trim().min(16).max(8192),
});
