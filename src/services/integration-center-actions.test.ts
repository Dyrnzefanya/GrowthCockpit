// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  record: vi.fn(),
  metaClient: vi.fn(),
  validatePortal: vi.fn(),
  resolveMeta: vi.fn(),
  resolveHubspot: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/services/session", () => ({
  requireUser: vi.fn().mockResolvedValue({ id: "owner-id" }),
}));
vi.mock("@/lib/auth/can", () => ({ can: mocks.can }));
vi.mock("@/repositories/integration-credentials", () => ({
  saveProvider: mocks.save,
  removeProvider: mocks.remove,
  recordVerification: mocks.record,
}));
vi.mock("@/services/provider-credentials", () => ({
  resolveMetaCredentials: mocks.resolveMeta,
  resolveHubspotCredentials: mocks.resolveHubspot,
}));
vi.mock("@/integrations/meta/client", async (original) => ({
  ...(await original<typeof import("@/integrations/meta/client")>()),
  metaClient: mocks.metaClient,
}));
vi.mock("@/integrations/hubspot/client", () => ({
  validatePortal: mocks.validatePortal,
}));
import { integrationCenterAction } from "./integration-center-actions";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.can.mockResolvedValue(true);
  mocks.resolveMeta.mockResolvedValue({
    source: "settings",
    credentials: {
      accessToken: "new-secret-token-value",
      adAccountId: "123",
      apiVersion: "v26.0",
    },
    environmentFallbackAvailable: false,
  });
  mocks.resolveHubspot.mockResolvedValue({
    source: "settings",
    credentials: {
      accessToken: "hubspot-secret-token-value",
      portalId: "456",
      webhookSecret: "webhook-secret-value",
    },
    environmentFallbackAvailable: false,
  });
});

it("denies unauthorized modification and all operations for coming-soon providers", async () => {
  mocks.can.mockResolvedValue(false);
  expect(
    (
      await integrationCenterAction(
        { message: "" },
        form({ provider: "meta", operation: "save" }),
      )
    ).message,
  ).toBe("Access denied.");
  mocks.can.mockResolvedValue(true);
  for (const operation of ["save", "test", "remove"])
    expect(
      (
        await integrationCenterAction(
          { message: "" },
          form({ provider: "ga4", operation }),
        )
      ).message,
    ).toBe("This provider is not implemented.");
  expect(mocks.save).not.toHaveBeenCalled();
});

it("replaces a Meta secret without returning it", async () => {
  const secret = "new-secret-token-value";
  const result = await integrationCenterAction(
    { message: "" },
    form({
      provider: "meta",
      operation: "save",
      ad_account_id: "123",
      api_version: "v26.0",
      access_token: secret,
    }),
  );
  expect(mocks.save).toHaveBeenCalledWith(
    expect.objectContaining({ secrets: { access_token: secret } }),
  );
  expect(JSON.stringify(result)).not.toContain(secret);
});

it("Meta Test Connection is read-only and records safe identity", async () => {
  const account = vi.fn().mockResolvedValue({
    account_id: "123",
    name: "Personal",
    currency: "IDR",
    timezone_name: "Asia/Jakarta",
  });
  const tokenInfo = vi.fn().mockResolvedValue({
    expires_at: null,
    verified_at: "2026-09-16T00:00:00Z",
  });
  mocks.metaClient.mockReturnValue({ account, tokenInfo });
  const result = await integrationCenterAction(
    { message: "" },
    form({ provider: "meta", operation: "test" }),
  );
  expect(account).toHaveBeenCalledOnce();
  expect(tokenInfo).toHaveBeenCalledOnce();
  expect(mocks.record).toHaveBeenCalledWith(
    expect.objectContaining({ provider: "meta", success: true, error: null }),
  );
  expect(result.message).toBe("Connection verified.");
});

it("HubSpot Test Connection calls validation only and never mutates CRM", async () => {
  mocks.validatePortal.mockResolvedValue({
    portal: "456",
    currency: "IDR",
    dealCurrency: true,
  });
  await integrationCenterAction(
    { message: "" },
    form({ provider: "hubspot", operation: "test" }),
  );
  expect(mocks.validatePortal).toHaveBeenCalledWith(
    "456",
    expect.any(Number),
    true,
  );
  expect(mocks.record).toHaveBeenCalledWith(
    expect.objectContaining({ provider: "hubspot", success: true }),
  );
});

it("sanitizes invalid provider errors and never logs credential material", async () => {
  const secret = "new-secret-token-value";
  const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  mocks.metaClient.mockReturnValue({
    account: vi.fn().mockRejectedValue(new Error(`${secret}: rejected`)),
    tokenInfo: vi.fn(),
  });
  const result = await integrationCenterAction(
    { message: "" },
    form({ provider: "meta", operation: "test" }),
  );
  expect(result.message).toContain("INTERNAL");
  expect(JSON.stringify(result)).not.toContain(secret);
  expect(mocks.record).toHaveBeenCalledWith(
    expect.objectContaining({ success: false, error: "INTERNAL" }),
  );
  expect(log).not.toHaveBeenCalled();
  log.mockRestore();
});

it("removes only the Settings-managed credential reference", async () => {
  await integrationCenterAction(
    { message: "" },
    form({ provider: "hubspot", operation: "remove" }),
  );
  expect(mocks.remove).toHaveBeenCalledWith(
    "hubspot",
    "owner-id",
    expect.any(String),
  );
});

it("reports missing credentials as not configured without creating an error state", async () => {
  mocks.resolveMeta.mockResolvedValue({
    source: "none",
    credentials: null,
    environmentFallbackAvailable: false,
  });
  const result = await integrationCenterAction(
    { message: "" },
    form({ provider: "meta", operation: "test" }),
  );
  expect(result.message).toContain("NOT_CONFIGURED");
  expect(mocks.record).not.toHaveBeenCalled();
});
