// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/services/session", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/auth/can", () => ({ can: vi.fn().mockResolvedValue(true) }));
vi.mock("@/repositories/integration-credentials", () => ({
  providerSummaries: vi.fn().mockResolvedValue([
    {
      provider: "meta",
      config: { ad_account_id: "123456", api_version: "v26.0" },
      provider_identity: {
        account_name: "Personal trial",
        account_id: "123456",
        access_token: "stored-secret-must-not-render",
      },
      configured_at: "2026-09-16T00:00:00Z",
      credentials_updated_at: "2026-09-16T00:00:00Z",
      last_verified_at: null,
      last_error_code: null,
      disconnected_at: null,
      secretKeys: ["access_token"],
    },
  ]),
}));
vi.mock("@/services/provider-credentials", () => ({
  resolveMetaCredentials: vi.fn().mockResolvedValue({
    source: "settings",
    credentials: {
      accessToken: "stored-secret-must-not-render",
      adAccountId: "123456",
      apiVersion: "v26.0",
    },
    environmentFallbackAvailable: false,
  }),
  resolveHubspotCredentials: vi.fn().mockResolvedValue({
    source: "none",
    credentials: null,
    environmentFallbackAvailable: false,
  }),
  resolveHubspotWebhookCredentials: vi.fn().mockResolvedValue({
    source: "none",
    credentials: null,
    environmentFallbackAvailable: false,
  }),
}));
import { integrationCenterModel } from "./integration-center";

it("returns safe write-only provider summaries without stored secret material", async () => {
  const model = await integrationCenterModel();
  const serialized = JSON.stringify(model);
  expect(serialized).not.toContain("stored-secret-must-not-render");
  expect(
    model.providers.find((provider) => provider.id === "meta"),
  ).toMatchObject({
    source: "settings",
    state: "CONFIGURED_UNVERIFIED",
    settingsManaged: true,
  });
  expect(
    model.providers.filter((provider) => provider.state === "COMING_SOON"),
  ).toHaveLength(3);
});
