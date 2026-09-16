import "server-only";
import { z } from "zod";
import { serverEnv } from "@/lib/env.server";
import { metaApi } from "@/config/integrations";
import {
  hubspotStoredConfigSchema,
  hubspotStoredSecretsSchema,
  metaStoredConfigSchema,
  metaStoredSecretsSchema,
} from "@/domain/integration-providers";
import { resolvedProvider } from "@/repositories/integration-credentials";

export type CredentialSource = "settings" | "environment" | "none";
export type MetaCredentials = {
  accessToken: string;
  adAccountId: string;
  apiVersion: typeof metaApi.version;
};
export type HubspotCredentials = {
  accessToken: string;
  portalId: string;
  webhookSecret?: string;
};
export type HubspotWebhookCredentials = {
  portalId: string;
  webhookSecret: string;
};

export async function resolveMetaCredentials(): Promise<{
  source: CredentialSource;
  credentials: MetaCredentials | null;
  environmentFallbackAvailable: boolean;
}> {
  const environmentFallbackAvailable = Boolean(
    serverEnv.META_ACCESS_TOKEN && serverEnv.META_AD_ACCOUNT_ID,
  );
  const stored = await resolvedProvider("meta").catch(() => null);
  const config = metaStoredConfigSchema.safeParse(stored?.config);
  const secrets = metaStoredSecretsSchema.safeParse(stored?.secrets);
  if (config.success && secrets.success)
    return {
      source: "settings",
      credentials: {
        accessToken: secrets.data.access_token,
        adAccountId: config.data.ad_account_id,
        apiVersion: config.data.api_version,
      },
      environmentFallbackAvailable,
    };
  if (serverEnv.META_ACCESS_TOKEN && serverEnv.META_AD_ACCOUNT_ID)
    return {
      source: "environment",
      credentials: {
        accessToken: serverEnv.META_ACCESS_TOKEN,
        adAccountId: serverEnv.META_AD_ACCOUNT_ID,
        apiVersion: metaApi.version,
      },
      environmentFallbackAvailable,
    };
  return { source: "none", credentials: null, environmentFallbackAvailable };
}

export async function resolveHubspotCredentials(): Promise<{
  source: CredentialSource;
  credentials: HubspotCredentials | null;
  environmentFallbackAvailable: boolean;
}> {
  const environmentFallbackAvailable = Boolean(
    serverEnv.HUBSPOT_ACCESS_TOKEN && serverEnv.HUBSPOT_PORTAL_ID,
  );
  const stored = await resolvedProvider("hubspot").catch(() => null);
  const config = hubspotStoredConfigSchema.safeParse(stored?.config);
  const secrets = hubspotStoredSecretsSchema.safeParse(stored?.secrets);
  if (config.success && secrets.success)
    return {
      source: "settings",
      credentials: {
        accessToken: secrets.data.access_token,
        portalId: config.data.portal_id,
        webhookSecret: secrets.data.webhook_secret,
      },
      environmentFallbackAvailable,
    };
  const environment = z
    .object({
      accessToken: z.string().min(1),
      portalId: z.string().regex(/^\d{1,30}$/),
      webhookSecret: z.string().min(1).optional(),
    })
    .safeParse({
      accessToken: serverEnv.HUBSPOT_ACCESS_TOKEN,
      portalId: serverEnv.HUBSPOT_PORTAL_ID,
      webhookSecret: serverEnv.HUBSPOT_WEBHOOK_SECRET,
    });
  return environment.success
    ? {
        source: "environment",
        credentials: environment.data,
        environmentFallbackAvailable,
      }
    : { source: "none", credentials: null, environmentFallbackAvailable };
}

export async function resolveHubspotWebhookCredentials(): Promise<{
  source: CredentialSource;
  credentials: HubspotWebhookCredentials | null;
  environmentFallbackAvailable: boolean;
}> {
  const environmentFallbackAvailable = Boolean(
    serverEnv.HUBSPOT_WEBHOOK_SECRET && serverEnv.HUBSPOT_PORTAL_ID,
  );
  const stored = await resolvedProvider("hubspot").catch(() => null);
  const config = hubspotStoredConfigSchema.safeParse(stored?.config);
  const secrets = hubspotStoredSecretsSchema.safeParse(stored?.secrets);
  if (config.success && secrets.success)
    return {
      source: "settings",
      credentials: {
        portalId: config.data.portal_id,
        webhookSecret: secrets.data.webhook_secret,
      },
      environmentFallbackAvailable,
    };
  if (serverEnv.HUBSPOT_WEBHOOK_SECRET && serverEnv.HUBSPOT_PORTAL_ID)
    return {
      source: "environment",
      credentials: {
        portalId: serverEnv.HUBSPOT_PORTAL_ID,
        webhookSecret: serverEnv.HUBSPOT_WEBHOOK_SECRET,
      },
      environmentFallbackAvailable,
    };
  return { source: "none", credentials: null, environmentFallbackAvailable };
}
