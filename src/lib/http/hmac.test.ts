// @vitest-environment node
import { expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import {
  sign,
  verifySignature,
  equalSecret,
  boundedBody,
  payloadLimit,
} from "./hmac";
import { ingestSchema } from "@/config/ingest-schema";
import {
  retryOutcome,
  integrationHealth,
  errorCode,
} from "@/domain/integrations";
const key = randomBytes(32).toString("hex"),
  old = randomBytes(32).toString("hex"),
  timestamp = "1790000000",
  now = Number(timestamp) * 1000,
  body = Buffer.from('{"a":"anyaman"}');
it("TEST-7.1/2/3/13 verifies exact bytes, method, path, inclusive clock boundary and rotation", () => {
  const signature = sign(key, timestamp, "POST", "/api/ingest/lead", body);
  const verify = (
    s = signature,
    t = timestamp,
    b = body,
    keys = [key, old],
    time = now,
    method = "POST",
    path = "/api/ingest/lead",
  ) => verifySignature(s, t, method, path, b, keys, time);
  expect(verify()).toBe(true);
  expect(verify(undefined, undefined, Buffer.from('{"a":"tamper"}'))).toBe(
    false,
  );
  expect(verify("00")).toBe(false);
  expect(verify("g".repeat(64))).toBe(false);
  expect(verify(undefined, "bad")).toBe(false);
  expect(verify(undefined, undefined, undefined, undefined, now + 300000)).toBe(
    true,
  );
  expect(verify(undefined, undefined, undefined, undefined, now - 300000)).toBe(
    true,
  );
  expect(verify(undefined, undefined, undefined, undefined, now + 300001)).toBe(
    false,
  );
  expect(verify(undefined, undefined, undefined, undefined, now - 300001)).toBe(
    false,
  );
  expect(
    verify(undefined, undefined, undefined, undefined, undefined, "GET"),
  ).toBe(false);
  expect(
    verify(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "/other",
    ),
  ).toBe(false);
  const previous = sign(old, timestamp, "POST", "/api/ingest/lead", body);
  expect(verify(previous)).toBe(true);
  expect(verify(previous, undefined, undefined, [key])).toBe(false);
  expect(equalSecret(key, key)).toBe(true);
  expect(equalSecret("short", key)).toBe(false);
});
it("TEST-7.6 rejects byte limits before parse including streams without content-length", async () => {
  const req = (text: string, headers: Record<string, string> = {}) =>
    new Request("http://localhost/api/ingest/lead", {
      method: "POST",
      body: text,
      headers: { "content-type": "application/json", ...headers },
    });
  expect((await boundedBody(req(" ".repeat(payloadLimit)))).length).toBe(
    payloadLimit,
  );
  await expect(boundedBody(req(" ".repeat(payloadLimit + 1)))).rejects.toThrow(
    "PAYLOAD_TOO_LARGE",
  );
  await expect(
    boundedBody(req("{}", { "content-length": String(payloadLimit + 1) })),
  ).rejects.toThrow("PAYLOAD_TOO_LARGE");
  await expect(
    boundedBody(req("{}", { "content-type": "text/plain" })),
  ).rejects.toThrow("CONTENT_TYPE");
  await expect(
    boundedBody(
      req("{}", { "content-type": "application/json; charset=utf-8" }),
    ),
  ).resolves.toEqual(Buffer.from("{}"));
});
it("validates every optional inbound group without inventing identity or attribution", () => {
  const base = {
    source_channel: "web_form",
    occurred_at: "2026-09-13T18:00:00Z",
  };
  expect(ingestSchema.parse(base)).toMatchObject({
    email: "",
    phone: "",
    platform: "unknown",
  });
  for (const bad of [
    { ...base, source_channel: "browser" },
    { ...base, occurred_at: "yesterday" },
    { ...base, extra: true },
    { ...base, inquiry: { estimated_quantity: "50" } },
    { ...base, attribution: { click_id_type: "ctwa_clid" } },
    { ...base, contact: { email: { secret: true } } },
  ])
    expect(ingestSchema.safeParse(bad).success).toBe(false);
  expect(
    ingestSchema.parse({
      ...base,
      contact: { full_name: "Buyer", phone: "081111111111" },
      inquiry: { estimated_quantity: 50 },
      attribution: {
        click_id_type: "ctwa_clid",
        click_id: "test-click",
        ad_id: "test-ad",
      },
    }).channel,
  ).toBe("web_form");
});
it("TEST-7.9/10 classifies terminal vs retryable and caps full jitter/attempts", () => {
  for (const code of [
    "INTERNAL",
    "UPSTREAM_UNAVAILABLE",
    "UPSTREAM_RATE_LIMITED",
    "NETWORK",
    "TIMEOUT",
  ]) {
    expect(retryOutcome(code, 1, 5, now, 0)).toEqual({
      status: "failed",
      next: new Date(now).toISOString(),
    });
    expect(retryOutcome(code, 5, 5, now, 0.5)).toEqual({
      status: "dead_letter",
      next: null,
    });
  }
  [60, 300, 1500, 7200, 21600, 21600].forEach((seconds, index) =>
    expect(
      Date.parse(retryOutcome("INTERNAL", index + 1, 10, now, 1).next!) - now,
    ).toBe(seconds * 1000),
  );
  for (const code of [
    "VALIDATION_FAILED",
    "FORBIDDEN",
    "CONFLICT",
    "BUSINESS_RULE_REJECTED",
  ])
    expect(retryOutcome(code, 1, 5, now, 0.5).status).toBe("rejected");
  expect(errorCode(new Error("buyer@example.test"))).toBe("INTERNAL");
  expect(errorCode(new TypeError("fetch failed"))).toBe("NETWORK");
});
it("health distinguishes configuration, stale, partial and consecutive failure states", () => {
  const recent = new Date(now - 1000).toISOString();
  expect(integrationHealth(false, null, 0, false, 600000, now)).toBe(
    "not_configured",
  );
  expect(integrationHealth(true, recent, 0, false, 600000, now)).toBe(
    "healthy",
  );
  expect(integrationHealth(true, recent, 1, false, 600000, now)).toBe(
    "degraded",
  );
  expect(integrationHealth(true, recent, 0, true, 600000, now)).toBe(
    "degraded",
  );
  expect(integrationHealth(true, recent, 3, false, 600000, now)).toBe(
    "failing",
  );
  expect(integrationHealth(true, null, 0, false, 600000, now)).toBe("failing");
  expect(
    integrationHealth(
      true,
      new Date(now - 700000).toISOString(),
      0,
      false,
      600000,
      now,
    ),
  ).toBe("degraded");
});
