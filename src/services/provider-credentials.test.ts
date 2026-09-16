// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ resolved: vi.fn() }));
const environment = vi.hoisted(() => ({
  META_ACCESS_TOKEN: undefined as string | undefined,
  META_AD_ACCOUNT_ID: undefined as string | undefined,
  HUBSPOT_ACCESS_TOKEN: undefined as string | undefined,
  HUBSPOT_PORTAL_ID: undefined as string | undefined,
  HUBSPOT_WEBHOOK_SECRET: undefined as string | undefined,
}));
vi.mock("@/repositories/integration-credentials", () => ({
  resolvedProvider: mocks.resolved,
}));
vi.mock("@/lib/env.server", () => ({ serverEnv: environment }));
import {
  resolveHubspotCredentials,
  resolveHubspotWebhookCredentials,
  resolveMetaCredentials,
} from "./provider-credentials";

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(environment, {
    META_ACCESS_TOKEN: undefined,
    META_AD_ACCOUNT_ID: undefined,
    HUBSPOT_ACCESS_TOKEN: undefined,
    HUBSPOT_PORTAL_ID: undefined,
    HUBSPOT_WEBHOOK_SECRET: undefined,
  });
  mocks.resolved.mockResolvedValue(null);
});

it("uses a complete Settings-managed Meta credential before environment fallback", async () => {
  environment.META_ACCESS_TOKEN = "environment-token-value";
  environment.META_AD_ACCOUNT_ID = "111";
  mocks.resolved.mockResolvedValue({
    config: { ad_account_id: "222", api_version: "v26.0" },
    secrets: { access_token: "settings-token-value-long" },
  });
  expect(await resolveMetaCredentials()).toEqual({
    source: "settings",
    credentials: {
      accessToken: "settings-token-value-long",
      adAccountId: "222",
      apiVersion: "v26.0",
    },
    environmentFallbackAvailable: true,
  });
});

it("falls back to environment and reports an honest missing state", async () => {
  environment.META_ACCESS_TOKEN = "environment-token-value";
  environment.META_AD_ACCOUNT_ID = "111";
  expect((await resolveMetaCredentials()).source).toBe("environment");
  environment.META_ACCESS_TOKEN = undefined;
  environment.META_AD_ACCOUNT_ID = undefined;
  expect(await resolveMetaCredentials()).toEqual({
    source: "none",
    credentials: null,
    environmentFallbackAvailable: false,
  });
});

it("preserves HubSpot environment sync while representing its optional webhook secret", async () => {
  environment.HUBSPOT_ACCESS_TOKEN = "environment-token-value";
  environment.HUBSPOT_PORTAL_ID = "123";
  const result = await resolveHubspotCredentials();
  expect(result.source).toBe("environment");
  expect(result.credentials).toEqual({
    accessToken: "environment-token-value",
    portalId: "123",
    webhookSecret: undefined,
  });
});

it("resolves HubSpot webhook verification independently from the API token", async () => {
  environment.HUBSPOT_PORTAL_ID = "123";
  environment.HUBSPOT_WEBHOOK_SECRET = "environment-webhook-secret";
  expect(await resolveHubspotWebhookCredentials()).toEqual({
    source: "environment",
    credentials: {
      portalId: "123",
      webhookSecret: "environment-webhook-secret",
    },
    environmentFallbackAvailable: true,
  });
});
