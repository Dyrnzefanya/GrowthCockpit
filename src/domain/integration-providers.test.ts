import { describe, expect, it } from "vitest";
import {
  providerRegistry,
  providerState,
  type ProviderDefinition,
} from "./integration-providers";

describe("Integration Center provider registry", () => {
  it("keeps implemented and planned providers honest", () => {
    expect(
      providerRegistry
        .filter((provider) => provider.availability === "available")
        .map((provider) => provider.id),
    ).toEqual(["meta", "hubspot"]);
    for (const provider of providerRegistry.filter(
      (candidate) => candidate.availability === "coming_soon",
    )) {
      expect(provider.fields).toEqual([]);
      expect(provider.capabilities).toEqual([]);
      expect(
        providerState({
          availability: provider.availability,
          configured: true,
          lastVerifiedAt: new Date().toISOString(),
          lastErrorCode: "INTERNAL",
          disconnectedAt: null,
        }),
      ).toBe("COMING_SOON");
    }
  });

  it("derives every available connection state deterministically", () => {
    const base = {
      availability: "available" as const,
      configured: false,
      lastVerifiedAt: null,
      lastErrorCode: null,
      disconnectedAt: null,
    };
    expect(providerState(base)).toBe("AVAILABLE_NOT_CONFIGURED");
    expect(providerState({ ...base, configured: true })).toBe(
      "CONFIGURED_UNVERIFIED",
    );
    expect(
      providerState({
        ...base,
        configured: true,
        lastVerifiedAt: "2026-09-16T00:00:00Z",
      }),
    ).toBe("CONNECTED");
    expect(providerState({ ...base, lastErrorCode: "INTERNAL" })).toBe("ERROR");
    expect(
      providerState({ ...base, disconnectedAt: "2026-09-16T00:00:00Z" }),
    ).toBe("DISCONNECTED");
  });

  it("accepts a future provider definition without changing card contracts", () => {
    const future: ProviderDefinition = {
      id: "ga4",
      name: "Google Analytics 4",
      description: "Future",
      availability: "coming_soon",
      fields: [],
      capabilities: [],
    };
    expect(future).toMatchObject({ id: "ga4", availability: "coming_soon" });
  });
});
