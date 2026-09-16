// @vitest-environment node
import { it, expect, vi, afterEach } from "vitest";
import { z } from "zod";
vi.mock("server-only", () => ({}));
vi.mock("@/services/provider-credentials", () => ({
  resolveHubspotCredentials: vi.fn().mockResolvedValue({
    source: "environment",
    credentials: {
      accessToken: "synthetic-test-token",
      portalId: "123",
      webhookSecret: "synthetic-webhook-secret",
    },
    environmentFallbackAvailable: true,
  }),
}));
import {
  hubspotRequest,
  writeRecord,
  readBatch,
  validatePortal,
} from "./client";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("429 respects Retry-After and retries; only fixed provider origin and bearer are sent", async () => {
  vi.useFakeTimers();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response("ignored private body", {
        status: 429,
        headers: { "Retry-After": "1" },
      }),
    )
    .mockResolvedValueOnce(Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetch);
  const promise = hubspotRequest(
    "/crm/v3/objects/contacts",
    z.object({ ok: z.boolean() }),
  );
  await vi.runAllTimersAsync();
  expect(await promise).toEqual({ ok: true });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[0][0]).toBe(
    "https://api.hubapi.com/crm/v3/objects/contacts",
  );
  expect(fetch.mock.calls[0][1].redirect).toBe("error");
});
it("401/403/404 and malformed success are sanitized and never retried", async () => {
  vi.useFakeTimers();
  for (const [status, code] of [
    [401, "UNAUTHENTICATED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
  ] as const) {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response("private-token-body", { status }));
    vi.stubGlobal("fetch", fetch);
    const promise = expect(
      hubspotRequest("/crm/test", z.unknown()),
    ).rejects.toThrow(code);
    await vi.runAllTimersAsync();
    await promise;
    expect(fetch).toHaveBeenCalledTimes(1);
  }
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ wrong: true })),
  );
  const p = expect(
    hubspotRequest("/crm/test", z.object({ required: z.string() })),
  ).rejects.toThrow("VALIDATION_FAILED");
  await vi.runAllTimersAsync();
  await p;
});
it("large retry delay yields to durable retry; unsafe creates are not blindly retried", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("", { status: 429, headers: { "Retry-After": "3600" } }),
      ),
  );
  let p = expect(hubspotRequest("/crm/test", z.unknown())).rejects.toThrow(
    "UPSTREAM_RATE_LIMITED",
  );
  await vi.runAllTimersAsync();
  await p;
  const fetch = vi.fn().mockRejectedValue(new Error("contains-token"));
  vi.stubGlobal("fetch", fetch);
  p = expect(
    writeRecord("contacts", null, { email: "synthetic@example.test" }),
  ).rejects.toThrow("CONFLICT");
  await vi.runAllTimersAsync();
  await p;
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("rejects forbidden outbound fields and paths before sending", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect(() => writeRecord("contacts", "1", { amount: "100" })).toThrow(
    "FORBIDDEN",
  );
  await expect(
    hubspotRequest("https://evil.test", z.unknown()),
  ).rejects.toThrow("VALIDATION_FAILED");
  expect(fetch).not.toHaveBeenCalled();
});
it("partial association batch errors yield to retry instead of pretending records have no links", async () => {
  vi.useFakeTimers();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        results: [
          { id: "1", properties: {}, updatedAt: "2026-09-14T00:00:00Z" },
        ],
      }),
    )
    .mockResolvedValueOnce(
      Response.json({ results: [], errors: [{ status: "503" }] }),
    );
  vi.stubGlobal("fetch", fetch);
  const result = expect(
    readBatch("contacts", ["1"], Date.now() + 12000),
  ).rejects.toThrow("UPSTREAM_UNAVAILABLE");
  await vi.runAllTimersAsync();
  await result;
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("connection validation reads account and property metadata without mutating CRM", async () => {
  const contactProperties = [
    "original_utm_source",
    "original_utm_medium",
    "original_utm_campaign",
    "original_utm_content",
    "original_utm_term",
    "original_landing_page",
    "original_click_id",
    "original_click_id_type",
    "lead_product_interest",
    "estimated_quantity",
    "lead_quality_reason",
    "pmos_lead_id",
    "pmos_qualified_at",
  ];
  const fetch = vi.fn(
    async (input: string | URL | Request, options?: RequestInit) => {
      expect(options?.method).toBe("GET");
      const path = new URL(String(input)).pathname;
      if (path === "/account-info/v3/details")
        return Response.json({ portalId: 123, companyCurrency: "IDR" });
      if (path === "/crm/v3/properties/contacts")
        return Response.json({
          results: contactProperties.map((name) => ({ name })),
        });
      return Response.json({
        results: ["pmos_lead_id", "estimated_quantity", "required_by_date"].map(
          (name) => ({ name }),
        ),
      });
    },
  );
  vi.stubGlobal("fetch", fetch);
  await expect(
    validatePortal("123", Date.now() + 12000, true),
  ).resolves.toMatchObject({ portal: "123", currency: "IDR" });
  expect(fetch).toHaveBeenCalledTimes(3);
  for (const [, options] of fetch.mock.calls)
    expect(options).toMatchObject({ method: "GET" });
});
