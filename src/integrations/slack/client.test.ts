// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const env = vi.hoisted(() => ({
  SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/test/path/value",
}));
vi.mock("@/lib/env.server", () => ({ serverEnv: env }));
import { sendSlack, serializeSlack } from "./client";

const input = {
  type: "new_mql",
  severity: "info" as const,
  entityType: "lead",
  entityIds: ["11111111-1111-4111-8111-111111111111"],
  count: 1,
  url: "https://app.example.test/today#alerts",
  environment: "preview" as const,
  reasonCodes: ["Q_BUSINESS"],
};

describe("Phase 9 Slack transport", () => {
  it("TEST-9.7 rejects fields outside the PII-safe allowlist", () => {
    expect(() =>
      serializeSlack({
        ...input,
        email: "pii@example.test",
      } as unknown as Parameters<typeof serializeSlack>[0]),
    ).toThrow();
    const payload = JSON.stringify(serializeSlack(input));
    expect(payload).not.toContain("email");
    expect(payload).toContain(input.entityIds[0]);
  });

  it("FR-12.9 includes only bounded report headline metrics", () => {
    const payload = serializeSlack({
      ...input,
      type: "report_ready",
      entityType: "report",
      headline: ["Spend: Rp100.000", "MQL: 12", "CPQL: Rp8.333"],
    });
    expect(payload.text).toContain("Weekly report ready");
    expect(payload.text).toContain("CPQL: Rp8.333");
  });

  it("retries rate limits within bounds and never reads provider bodies", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("provider detail", {
          status: 429,
          headers: { "retry-after": "0" },
        }),
      )
      .mockResolvedValueOnce(new Response("ok"));
    await sendSlack(input, transport, vi.fn());
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("classifies permanent, exhausted, and missing configuration failures", async () => {
    await expect(
      sendSlack(
        input,
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response("bad", { status: 400 })),
        vi.fn(),
      ),
    ).rejects.toThrow("BUSINESS_RULE_REJECTED");
    await expect(
      sendSlack(
        input,
        vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")),
        vi.fn(),
      ),
    ).rejects.toThrow("NETWORK");
    env.SLACK_WEBHOOK_URL = "";
    await expect(sendSlack(input)).rejects.toThrow("NOT_CONFIGURED");
  });
});
