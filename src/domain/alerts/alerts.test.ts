import { describe, expect, it } from "vitest";
import { alertKey } from "./keys";
import {
  deliveryFailure,
  planDispatch,
  scheduledJobOverdue,
  weekdayJobOverdue,
  type DispatchAlert,
} from "./policy";

const row = (id: string, type: DispatchAlert["type"] = "new_mql") => ({
  id,
  alertKey: alertKey(type, id),
  type,
  severity: type === "new_mql" ? ("info" as const) : ("warning" as const),
  entityType: "lead",
  entityId: id,
  firstSeenAt: "2026-09-14T01:00:00Z",
  attempts: 0,
  evidence: {},
});

describe("Phase 9 alert policy", () => {
  it("TEST-9.1 produces deterministic, normalized keys", () => {
    expect(alertKey("new_mql", " ABC ")).toBe(alertKey("new_mql", "abc"));
    expect(() => alertKey("new_mql", "")).toThrow("INVALID_ALERT_KEY");
  });

  it("TEST-9.4 enforces the per-key WIB daily cap", () => {
    const candidate = row("11111111-1111-4111-8111-111111111111");
    const plan = planDispatch(
      [candidate],
      new Set([candidate.alertKey]),
      new Date("2026-09-14T06:00:00Z"),
    );
    expect(plan.deliveries).toHaveLength(0);
    expect(plan.deferred[0]).toMatchObject({ reason: "daily_cap" });
  });

  it("TEST-9.5 collapses more than five alerts and always digests stale leads", () => {
    const many = Array.from({ length: 6 }, (_, index) =>
      row(`11111111-1111-4111-8111-11111111111${index}`),
    );
    expect(
      planDispatch(many, new Set(), new Date("2026-09-14T06:00:00Z"))
        .deliveries,
    ).toEqual([{ alerts: many, digest: true }]);
    const stale = row("22222222-2222-4222-8222-222222222222", "stale_lead");
    expect(
      planDispatch([stale], new Set(), new Date("2026-09-14T06:00:00Z"))
        .deliveries[0].digest,
    ).toBe(true);
  });

  it("TEST-9.6 defers INFO outside 07:00–20:00 WIB", () => {
    const candidate = row("33333333-3333-4333-8333-333333333333");
    const before = planDispatch(
      [candidate],
      new Set(),
      new Date("2026-09-13T23:59:00Z"),
    );
    const atOpen = planDispatch(
      [candidate],
      new Set(),
      new Date("2026-09-14T00:00:00Z"),
    );
    const atClose = planDispatch(
      [candidate],
      new Set(),
      new Date("2026-09-14T13:00:00Z"),
    );
    expect(before.deferred[0].reason).toBe("quiet_hours");
    expect(atOpen.deliveries).toHaveLength(1);
    expect(atClose.deferred[0].reason).toBe("quiet_hours");
  });

  it("TEST-9.8 classifies bounded application retries and terminal failure", () => {
    expect(deliveryFailure("TIMEOUT", 0, 5, 0, 1)).toEqual({
      terminal: false,
      next: "1970-01-01T00:01:00.000Z",
    });
    expect(deliveryFailure("TIMEOUT", 4, 5, 0, 1)).toEqual({
      terminal: true,
      next: null,
    });
    expect(deliveryFailure("NOT_CONFIGURED", 0, 5, 0, 1).terminal).toBe(true);
  });

  it("TEST-9.9 flags interval and weekday jobs only beyond two cadences", () => {
    const now = new Date("2026-09-14T05:00:00Z"); // Monday noon WIB
    expect(scheduledJobOverdue("2026-09-14T04:39:59Z", now, 10)).toBe(true);
    expect(scheduledJobOverdue("2026-09-14T04:40:00Z", now, 10)).toBe(false);
    expect(weekdayJobOverdue("2026-09-11T01:00:00Z", now)).toBe(false);
    expect(weekdayJobOverdue("2026-09-10T01:00:00Z", now)).toBe(true);
  });
});
