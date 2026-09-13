import { describe, expect, it, vi } from "vitest";
import { safeNext } from "@/lib/auth/redirect";
import {
  parseSettings,
  preferenceInput,
  profileInput,
  settingsDefaults,
} from "@/config/settings-schema";
vi.mock("server-only", () => ({}));
vi.mock("@/services/session", () => ({
  requireUser: async () => ({ id: "test-user" }),
}));
const profile = vi.hoisted(() => ({ role: "owner" as string }));
vi.mock("@/repositories/settings", () => ({
  readProfile: async () => profile,
}));
import { can } from "@/lib/auth/can";
describe("Phase 2 security contracts", () => {
  it("TEST-2.2 only accepts internal application destinations", () => {
    for (const value of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "/login",
      "/auth/confirm",
      "/today/../../auth/confirm",
      "/today?x=%0d%0aLocation:evil",
      "/leads/%255cevil",
      null,
    ])
      expect(safeNext(value)).toBe("/today");
    expect(safeNext("/leads/abc?from=2026-09-01")).toBe(
      "/leads/abc?from=2026-09-01",
    );
    expect(safeNext("/settings")).toBe("/settings");
    expect(safeNext("/workflows/templates")).toBe("/workflows/templates");
    expect(safeNext("/playbook/new")).toBe("/playbook/new");
    expect(safeNext("/experiments/new")).toBe("/experiments/new");
    expect(safeNext("/experiments/learnings?q=creative")).toBe(
      "/experiments/learnings?q=creative",
    );
    expect(safeNext("/experiments/55555555-5555-4555-8555-555555555555")).toBe(
      "/experiments/55555555-5555-4555-8555-555555555555",
    );
    expect(safeNext("/experiments/not-a-uuid")).toBe("/today");
    expect(safeNext("/playbook/sop-peluncuran/edit?from=search")).toBe(
      "/playbook/sop-peluncuran/edit?from=search",
    );
    expect(safeNext("/playbook/../../auth/confirm")).toBe("/today");
    expect(safeNext("/workflows/templates/../../auth/confirm")).toBe("/today");
  });
  it("TEST-2.4 validates writes and safely defaults malformed, missing, and unknown settings", () => {
    expect(preferenceInput.safeParse({ timezone: "UTC" }).success).toBe(false);
    expect(profileInput.safeParse({ full_name: "   " }).success).toBe(false);
    const rows = Object.entries(settingsDefaults).map(([key, value]) => ({
      key,
      value,
    }));
    expect(parseSettings(rows)).toEqual({
      values: settingsDefaults,
      warnings: [],
    });
    const invalid = parseSettings([
      { key: "workspace.timezone", value: { unexpected: true } },
      { key: "unknown", value: "anything" },
    ]);
    expect(invalid.values).toEqual(settingsDefaults);
    expect(invalid.warnings.length).toBeGreaterThan(0);
  });
  it("FR-2.9 centralizes owner authorization and fails closed for other roles", async () => {
    expect(await can("settings:update")).toBe(true);
    profile.role = "viewer";
    expect(await can("profile:update")).toBe(false);
    profile.role = "owner";
  });
});
