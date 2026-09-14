// @vitest-environment node
import { it, expect, vi, afterEach } from "vitest";
import { z } from "zod";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env.server", () => ({
  serverEnv: { HUBSPOT_ACCESS_TOKEN: "synthetic-test-token" },
}));
import { hubspotRequest, writeRecord, readBatch } from "./client";
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
