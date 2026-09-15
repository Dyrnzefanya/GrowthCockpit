// @vitest-environment node
import { expect, it, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env.server", () => ({
  serverEnv: {
    META_ACCESS_TOKEN: "synthetic-meta-token",
    META_AD_ACCOUNT_ID: "123",
  },
}));
import { metaClient } from "./client";
import { normalizeInsight, accountSchema } from "./transform";
const account = {
  account_id: "123",
  name: "Fixture",
  currency: "IDR",
  timezone_name: "Asia/Jakarta",
};
const insight = {
  date_start: "2026-09-01",
  date_stop: "2026-09-01",
  campaign_id: "111",
  campaign_name: "Gift - Fase1 - Sep",
  spend: "0.00",
  impressions: "0",
  clicks: "0",
};
beforeEach(() => vi.useRealTimers());
it("TEST-10.1/4 zero is a fact; missing result/reach remains null; timezone preserved", () => {
  expect(
    normalizeInsight(insight, account, "2026-09-01", "lead"),
  ).toMatchObject({
    spend: "0.00",
    platform_results: null,
    reach: null,
    frequency: null,
    adset_id: "",
    ad_id: "",
    source_timezone: "Asia/Jakarta",
  });
  expect(
    normalizeInsight(
      { ...insight, actions: [{ action_type: "lead", value: "0" }] },
      { ...account, timezone_name: "America/Los_Angeles" },
      "2026-09-01",
      "lead",
    ).platform_results,
  ).toBe(0);
  expect(() =>
    normalizeInsight({ ...insight, spend: "-1" }, account, "2026-09-01", null),
  ).toThrow();
  expect(() => normalizeInsight(insight, account, "2026-09-02", null)).toThrow(
    "META_DATE_MISMATCH",
  );
  expect(() =>
    accountSchema.parse({ ...account, timezone_name: "nonsense" }),
  ).toThrow();
});
it("pins version, read-only calls, cursor-only pagination and authentication headers", async () => {
  const transport = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({
        data: [insight],
        paging: {
          next: "https://evil.example/?access_token=private",
          cursors: { after: "page2" },
        },
      }),
    )
    .mockResolvedValueOnce(Response.json({ data: [] }));
  const client = metaClient(Date.now() + 60000, transport);
  expect((await client.insights("2026-09-01", null, 20)).after).toBe("page2");
  expect((await client.insights("2026-09-01", "page2", 20)).after).toBeNull();
  for (const [url, options] of transport.mock.calls) {
    expect(String(url)).toMatch(
      /^https:\/\/graph.facebook.com\/v26.0\/act_123\/insights/,
    );
    expect(String(url)).not.toContain("synthetic-meta-token");
    expect(options).toMatchObject({
      method: "GET",
      redirect: "error",
      cache: "no-store",
      headers: { Authorization: ["Bearer", "synthetic-meta-token"].join(" ") },
    });
  }
});
it("handles rate limits and sanitizes permanent, transient, timeout and malformed failures", async () => {
  const permanent = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json(
        { error: { code: 190, message: "private@example.test" } },
        { status: 401 },
      ),
    );
  await expect(
    metaClient(Date.now() + 60000, permanent).account(),
  ).rejects.toMatchObject({ code: "META_TOKEN_INVALID", retryable: false });
  expect(permanent).toHaveBeenCalledOnce();
  const limited = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json(
        { error: { code: 4 } },
        { status: 429, headers: { "retry-after": "60" } },
      ),
    );
  await expect(
    metaClient(Date.now() + 10000, limited).account(),
  ).rejects.toMatchObject({ retryable: true, retryAfterMs: 60000 });
  const timeout = vi
    .fn<typeof fetch>()
    .mockRejectedValue(new Error("secret-body"));
  await expect(
    metaClient(Date.now() + 10000, timeout).account(),
  ).rejects.toThrow("META_TIMEOUT");
  const malformed = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ unexpected: 1 }));
  await expect(
    metaClient(Date.now() + 10000, malformed).account(),
  ).rejects.toThrow();
});
it("checks account identity, scope, expiry and rejects stalled pagination", async () => {
  const client = (body: unknown) =>
    metaClient(
      Date.now() + 60000,
      vi.fn<typeof fetch>().mockResolvedValue(Response.json(body)),
    );
  await expect(
    client({ ...account, account_id: "999" }).account(),
  ).rejects.toThrow("META_ACCOUNT_MISMATCH");
  await expect(
    client({
      data: {
        is_valid: true,
        expires_at: 0,
        scopes: ["ads_read", "ads_management"],
      },
    }).tokenInfo(),
  ).rejects.toThrow("META_TOKEN_SCOPE");
  expect(
    (
      await client({
        data: { is_valid: true, expires_at: 0, scopes: ["ads_read"] },
      }).tokenInfo()
    ).expires_at,
  ).toBeNull();
  await expect(
    client({
      data: [],
      paging: { next: "next", cursors: { after: "same" } },
    }).insights("2026-09-01", "same", 50),
  ).rejects.toThrow("META_INVALID_CURSOR");
});
