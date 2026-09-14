import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const repo = vi.hoisted(() => ({
  snapshot: vi.fn(),
  commit: vi.fn(),
  readLead: vi.fn(),
  writeOverride: vi.fn(),
  writeDeal: vi.fn(),
  funnelFacts: vi.fn(),
}));
const alerts = vi.hoisted(() => ({
  emitLeadAlert: vi.fn(),
  emitLeadAlerts: vi.fn(),
  emitDealAlert: vi.fn(),
}));
vi.mock("@/repositories/leads", () => repo);
vi.mock("@/services/alerts", () => alerts);
vi.mock("@/repositories/integrations", () => ({
  machineSettings: vi.fn(async () => ({ values: settingsDefaults })),
}));
vi.mock("@/services/session", () => ({
  requireUser: vi.fn(async () => ({
    id: "11111111-1111-4111-8111-111111111111",
  })),
}));
vi.mock("@/lib/auth/can", () => ({ can: vi.fn(async () => true) }));
vi.mock("@/repositories/settings", () => ({
  readSettings: vi.fn(async () => ({ values: settingsDefaults })),
}));
import { settingsDefaults } from "@/config/settings-schema";
import { can } from "@/lib/auth/can";
import { requireUser } from "@/services/session";
import { funnelModel } from "./funnel";
import {
  createLead,
  importLeads,
  override,
  saveDeal,
  leadDetail,
} from "./leads";
const input = {
  occurred_at: "2026-09-01T10:00",
  email: "buyer@example.com",
  product_interest: "Gifts",
  estimated_quantity: 100,
};
const request = "22222222-2222-4222-8222-222222222222";
const empty = { contacts: [], companies: [], leads: [], revision: "first" };
beforeEach(() => {
  vi.clearAllMocks();
  repo.snapshot.mockResolvedValue(empty);
  repo.commit.mockResolvedValue(undefined);
});
it("server pagination preserves whole-cohort totals and exposes later activity/history", async () => {
  const cohort = Array.from({ length: 25 }, (_, n) => ({
    inquiry_date: "2026-09-01",
    platform: "meta",
    lt_campaign: String(n),
    currency: null,
    leads: 1,
    mql: 1,
    sql: 0,
    deals: 0,
    won: 0,
    lost: 0,
    attributed: 1,
  }));
  const activity = Array.from({ length: 25 }, (_, n) => ({
    event_date: "2026-09-" + String(n + 1).padStart(2, "0"),
    to_status: "mql",
    source: "pmos",
    transitions: 1,
  }));
  repo.funnelFacts.mockResolvedValue({ cohort, activity });
  const first = await funnelModel({ from: "2026-09-01", to: "2026-09-30" });
  const second = await funnelModel({
    from: "2026-09-01",
    to: "2026-09-30",
    page: "1",
  });
  expect(first.campaigns).toHaveLength(20);
  expect(second.campaigns).toHaveLength(5);
  expect(first.totals.leads).toBe(25);
  expect(second.totals).toEqual(first.totals);
  expect(second.activity).toHaveLength(5);
  await leadDetail(request, "1");
  expect(repo.readLead).toHaveBeenCalledWith(request, 1);
});
it("replans a concurrent manual inquiry using a fresh snapshot, with a stable replay key", async () => {
  repo.commit.mockRejectedValueOnce(new Error("CONFLICT"));
  await createLead(input, request);
  expect(repo.snapshot).toHaveBeenCalledTimes(2);
  expect(repo.commit).toHaveBeenCalledTimes(2);
  expect(repo.commit.mock.calls[0][0].keys).toEqual(
    repo.commit.mock.calls[1][0].keys,
  );
});
it("CSV dry-run is read-only; stale and invalid-row commits write nothing", async () => {
  const csv = {
    text: "occurred_at,email\n2026-09-01T00:00:00Z,buyer@example.com",
    mapping: { occurred_at: "occurred_at", email: "email" },
  };
  const preview = await importLeads(csv, false);
  expect(preview.counts.created).toBe(1);
  expect(repo.commit).not.toHaveBeenCalled();
  await expect(
    importLeads({ ...csv, fingerprint: "stale" }, true),
  ).rejects.toThrow("PREVIEW_STALE");
  const invalid = {
    ...csv,
    text: csv.text + "\nnot-a-date,buyer2@example.com",
  };
  const invalidPreview = await importLeads(invalid, false);
  expect(invalidPreview.counts.errors).toBe(1);
  await expect(
    importLeads({ ...invalid, fingerprint: invalidPreview.fingerprint }, true),
  ).rejects.toThrow("CSV_ROWS");
  expect(repo.commit).not.toHaveBeenCalled();
  await importLeads({ ...csv, fingerprint: preview.fingerprint }, true);
  expect(repo.commit).toHaveBeenCalledTimes(1);
});
it("authorization precedes every privileged write path", async () => {
  vi.mocked(can).mockResolvedValue(false);
  for (const action of [
    () => createLead(input, request),
    () => importLeads({}, true),
    () => override({}),
    () => saveDeal({}),
  ])
    await expect(action()).rejects.toThrow("FORBIDDEN");
  expect(repo.snapshot).not.toHaveBeenCalled();
  expect(repo.commit).not.toHaveBeenCalled();
  expect(repo.writeOverride).not.toHaveBeenCalled();
  expect(repo.writeDeal).not.toHaveBeenCalled();
  vi.mocked(can).mockResolvedValue(true);
  vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));
  await expect(createLead(input, request)).rejects.toThrow("UNAUTHENTICATED");
});
it("malformed detail IDs are not found without querying the database", async () => {
  expect(await leadDetail("example")).toBeNull();
  expect(repo.readLead).not.toHaveBeenCalled();
});
vi.mock("@/services/crm-sync", () => ({
  queueWriteback: vi.fn(async () => undefined),
}));
