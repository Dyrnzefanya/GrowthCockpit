import { describe, it, expect } from "vitest";
import {
  leadInputSchema,
  dealSchema,
  overrideSchema,
} from "@/config/lead-schema";
import {
  email,
  phone,
  domain,
  identityText,
  platform,
  allocations,
} from "@/domain/attribution/normalise";
import { qualify, type QualificationSettings } from "@/domain/qualification";
import { planLeads, scopeFor, type Snapshot, type Submission } from "./plan";
import {
  resolveContact,
  resolveCompany,
  previousMatch,
  followUp,
  workdaysSince,
} from "./rules";
import { overrideLead } from "./override";
import { readCsv, mapCsv } from "./csv";
import { jakartaDateTime } from "@/domain/dates";
const rules: QualificationSettings = {
  minQuantity: 50,
  freeDomains: ["gmail.com"],
  internalDomains: ["internal.test"],
  competitorDomains: ["competitor.test"],
};
it("parses native minute-precision datetime-local in WIB", () => {
  expect(
    leadInputSchema.parse({ occurred_at: "2026-09-01T10:00" }).occurred_at,
  ).toBe("2026-09-01T03:00:00.000Z");
});
const input = (change: Record<string, unknown> = {}) =>
  leadInputSchema.parse({
    occurred_at: "2026-09-01T03:00:00Z",
    email: "buyer@company.test",
    product_interest: "Gift",
    estimated_quantity: 50,
    ...change,
  });
const snapshot = (): Snapshot => ({
  contacts: [],
  companies: [],
  leads: [],
  revision: "empty",
});
let seq = 0;
const id = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const actor = "77777777-7777-4777-8777-777777777777";
const sub = (
  key: string,
  change: Record<string, unknown> = {},
): Submission => ({ key, input: input(change), row: Number(key) || 1 });
const plan = (rows: Submission[], state = snapshot()) =>
  planLeads(state, rows, rules, actor, "2026-09-13T00:00:00Z", id);
describe("TEST-6.1 ordered q1 branches", () => {
  it("covers all disqualification branches and precedence", () => {
    for (const [changes, reason] of [
      [{ email: "", phone: "" }, "DQ_NO_CONTACT"],
      [{ full_name: "test" }, "DQ_TEST"],
      [{ full_name: "asdf" }, "DQ_TEST"],
      [{ email: "operator@internal.test" }, "DQ_TEST"],
      [{ message: "permintaan skripsi" }, "DQ_NONCOMMERCIAL"],
      [{ message: "tugas kantor" }, "DQ_NONCOMMERCIAL"],
      [{ company_domain: "competitor.test" }, "DQ_COMPETITOR"],
      [{ out_of_scope: true }, "DQ_OUT_OF_SCOPE"],
      [
        {
          email: "",
          full_name: "test",
          message: "skripsi",
          out_of_scope: true,
        },
        "DQ_NO_CONTACT",
      ],
      [
        { full_name: "test", message: "skripsi", out_of_scope: true },
        "DQ_TEST",
      ],
      [
        {
          message: "skripsi",
          company_domain: "competitor.test",
          out_of_scope: true,
        },
        "DQ_NONCOMMERCIAL",
      ],
      [
        { company_domain: "competitor.test", out_of_scope: true },
        "DQ_COMPETITOR",
      ],
    ] as const)
      expect(qualify(input(changes), rules)).toEqual({
        status: "disqualified",
        reasons: [reason],
        version: "q1",
      });
  });
  it("all four MQL predicates, exact boundaries, zero versus unknown", () => {
    expect(qualify(input(), rules).status).toBe("mql");
    expect(
      qualify(
        input({ email: "", phone: "081234567890", company_name: "Corporate" }),
        rules,
      ).status,
    ).toBe("mql");
    expect(
      qualify(
        input({
          email: "buyer@gmail.com",
          company_name: "",
          estimated_quantity: null,
        }),
        rules,
      ),
    ).toMatchObject({ status: "new", reasons: ["Q_CONTACTABLE", "Q_INTENT"] });
    expect(
      qualify(
        input({ email: "", phone: "+6281234567890", company_name: "" }),
        rules,
      ).status,
    ).toBe("new");
    expect(
      qualify(
        input({
          company_name: "Corporate",
          email: "buyer@gmail.com",
          estimated_quantity: null,
        }),
        rules,
      ).status,
    ).toBe("mql");
    expect(
      qualify(input({ product_interest: "", message: "x".repeat(19) }), rules)
        .status,
    ).toBe("new");
    expect(
      qualify(input({ product_interest: "", message: "x".repeat(20) }), rules)
        .status,
    ).toBe("mql");
    expect(qualify(input({ estimated_quantity: 49 }), rules).status).toBe(
      "new",
    );
    expect(qualify(input({ estimated_quantity: 0 }), rules).status).toBe("new");
    expect(qualify(input({ estimated_quantity: null }), rules).status).toBe(
      "mql",
    );
    expect(
      qualify(
        input({ estimated_quantity: 0, required_by_date: "2026-12-01" }),
        rules,
      ).status,
    ).toBe("mql");
    expect(qualify(input(), { ...rules, minQuantity: 51 }).status).toBe("new");
    expect(
      qualify(
        input({
          email: "buyer@gmail.com",
          company_name: "Corporate",
          estimated_quantity: 50,
        }),
        rules,
      ).status,
    ).toBe("mql");
  });
});
describe("TEST-6.2 normalisation and attribution", () => {
  it("normalises without inventing contactability or a platform", () => {
    expect(email(" BUYER@Example.Test ")).toBe("buyer@example.test");
    expect(email("broken")).toBeNull();
    expect(email(null)).toBeNull();
    expect(phone(null)).toBeNull();
    for (const value of [
      "0812-3456-7890",
      "+62 812 3456 7890",
      "6281234567890",
    ])
      expect(phone(value)).toBe("+6281234567890");
    for (const value of ["", "123", "abc", "08foo"])
      expect(phone(value)).toBeNull();
    expect(domain("https://WWW.Company.TEST/path")).toBe("company.test");
    expect(domain("")).toBeNull();
    expect(domain("x")).toBeNull();
    expect(domain("https://a@company.test")).toBeNull();
    expect(domain("ftp://company.test")).toBeNull();
    expect(domain("http://[")).toBeNull();
    expect(identityText("  Corporate   Gift ")).toBe("corporate gift");
    expect(platform(null, "unknown", "none")).toBe("unknown");
    expect(platform("Facebook", "unknown", "none")).toBe("meta");
    expect(platform(null, "unknown", "ctwa_clid")).toBe("meta");
    expect(platform(null, "unknown", "gclid")).toBe("google");
    expect(platform(null, "unknown", "li_fat_id")).toBe("linkedin");
    expect(platform(null, "organic", "none")).toBe("organic");
    expect(allocations("lead_last_touch", "last", "first")).toEqual([
      { campaign: "last", weight: 1 },
    ]);
    expect(allocations("contact_first_touch", "last", "first")).toEqual([
      { campaign: "first", weight: 1 },
    ]);
    expect(allocations("split_50_50", "last", "first")).toEqual([
      { campaign: "first", weight: 0.5 },
      { campaign: "last", weight: 0.5 },
    ]);
    expect(allocations("split_50_50", null, null)).toEqual([
      { campaign: null, weight: 1 },
    ]);
    expect(jakartaDateTime(new Date("2026-08-31T17:01:00Z"))).toBe(
      "2026-09-01T00:01",
    );
  });
});
describe("TEST-6.3/6.4/6.5 identity and rolling dedupe", () => {
  it("exact boundary, rolling extension, products and repeat inquiry", () => {
    const p = plan([
      sub("1"),
      sub("2", { occurred_at: "2026-09-02T03:00:00Z" }),
      sub("3", { occurred_at: "2026-09-03T03:00:00Z" }),
      sub("4", { occurred_at: "2026-09-04T03:00:01Z" }),
      sub("5", { product_interest: "Basket" }),
    ]);
    expect(p.contacts).toHaveLength(1);
    expect(p.leads).toHaveLength(3);
    expect(p.report.filter((r) => r.status === "skipped")).toHaveLength(2);
    expect(
      p.leads.find((l) => l.submission_keys.includes("1"))!
        .inquiry_observations,
    ).toHaveLength(3);
    expect(new Set(p.leads.map((l) => l.contact_id)).size).toBe(1);
    for (const lead of p.leads)
      expect(JSON.parse(lead.dedupe_key)).toEqual([
        lead.contact_id,
        lead.product_key,
        lead.inquiry_at,
      ]);
    expect(
      previousMatch(["2026-09-01T00:00:00Z"], "2026-09-02T00:00:00Z"),
    ).toBe(true);
    expect(
      previousMatch(["2026-09-01T00:00:00Z"], "2026-09-02T00:00:00.001Z"),
    ).toBe(false);
    expect(
      previousMatch(["2026-09-01T00:00:00Z"], "2026-08-31T23:00:00Z"),
    ).toBe(false);
  });
  it("retains separate anonymous inquiries, deterministic replay, unknown attribution", () => {
    const p = plan([
      sub("1", { email: "", phone: "" }),
      sub("2", { email: "", phone: "" }),
    ]);
    expect(p.contacts).toHaveLength(0);
    expect(p.leads).toHaveLength(2);
    expect(
      p.leads.every(
        (l) =>
          l.contact_id === null &&
          l.qualification_reason === "DQ_NO_CONTACT" &&
          l.platform === "unknown" &&
          l.attribution_missing,
      ),
    ).toBe(true);
    const again = plan([sub("1", { email: "" }), sub("2", { email: "" })], {
      ...snapshot(),
      leads: p.leads,
    });
    expect(again.leads).toHaveLength(0);
    expect(again.report.every((r) => r.status === "skipped")).toBe(true);
  });
  it("preserves first/last touch and historical verdicts", () => {
    const a = plan([
      sub("1", {
        utm_campaign: "first",
        company_name: "Acme",
        company_domain: "acme.test",
      }),
    ]);
    const b = plan(
      [sub("2", { occurred_at: "2026-09-03T03:00:01Z", utm_campaign: "last" })],
      {
        contacts: a.contacts,
        companies: a.companies,
        leads: a.leads,
        revision: "one",
      },
    );
    expect(b.leads[0].contact_id).toBe(a.contacts[0].id);
    expect(a.contacts[0].ft_campaign).toBe("first");
    expect(b.leads[0].lt_campaign).toBe("last");
    expect(a.leads[0].qualification_rule_version).toBe("q1");
    const o = overrideLead(
      a.leads[0],
      "sql",
      "Sales confirmed",
      actor,
      "2026-09-04T00:00:00Z",
      id(),
    );
    expect(o.event).toMatchObject({
      from_status: "mql",
      to_status: "sql",
      source: "manual",
      actor,
    });
    expect(o.patch.manual_override).toBe(true);
    expect(() =>
      overrideLead(a.leads[0], "mql", "same", actor, "2026-09-04", id()),
    ).toThrow();
  });
  it("conflicting candidates refuse, never auto-merge", () => {
    const rows = [
      { id: "a", email: "a@x.test", phone_e164: "+6281234567890" },
      { id: "b", email: "b@x.test", phone_e164: "+6281234567891" },
    ];
    expect(resolveContact(rows, "a@x.test", null)?.id).toBe("a");
    expect(resolveContact(rows, null, "+6281234567891")?.id).toBe("b");
    expect(resolveContact(rows, null, null)).toBeNull();
    expect(() => resolveContact(rows, "a@x.test", "+6281234567891")).toThrow(
      "CONFLICT",
    );
    const companies = [
      { id: "a", domain: "a.test", name_key: "acme" },
      { id: "b", domain: "b.test", name_key: "acme" },
    ];
    expect(resolveCompany(companies, "b.test", "acme")?.id).toBe("b");
    expect(resolveCompany([companies[0]], null, "acme")?.id).toBe("a");
    expect(() => resolveCompany(companies, null, "acme")).toThrow("CONFLICT");
    expect(() => resolveCompany([companies[0]], "other.test", "acme")).toThrow(
      "CONFLICT",
    );
    const a = plan([sub("1")]);
    const b = plan([sub("2", { occurred_at: "2026-09-01T02:00:00Z" })], {
      contacts: a.contacts,
      companies: [],
      leads: a.leads,
      revision: "a",
    });
    expect(b.report[0].status).toBe("error");
    expect(scopeFor([sub("1")]).emails).toEqual(["buyer@company.test"]);
  });
});
describe("TEST-6.9 CSV and validation", () => {
  it("supports HubSpot-style mapping, quoting/newlines and rejects structure errors", () => {
    const text =
      'Email,Inquiry time,Request\n"buyer@company.test",2026-09-01T03:00:00Z,"Gift, basket\nand bags"';
    const mapped = mapCsv(text, {
      email: "Email",
      occurred_at: "Inquiry time",
      product_interest: "Request",
    });
    expect(mapped.errors).toHaveLength(0);
    expect(mapped.valid[0].input.product_interest).toContain("\n");
    expect(() => readCsv("a,a\nx,y")).toThrow();
    expect(() => readCsv('a,b\n"broken')).toThrow();
    expect(() => readCsv("a\n\uFFFD")).toThrow();
    expect(() => mapCsv(text, {})).toThrow();
    expect(
      mapCsv("occurred_at\nbad", { occurred_at: "occurred_at" }).errors,
    ).toHaveLength(1);
    expect(leadInputSchema.safeParse({ occurred_at: "bad" }).success).toBe(
      false,
    );
    expect(
      leadInputSchema.safeParse({ ...input(), estimated_quantity: -1 }).success,
    ).toBe(false);
    expect(
      overrideSchema.safeParse({
        id: actor,
        revision: "2026-09-01T00:00:00Z",
        status: "mql",
        reason: " ",
      }).success,
    ).toBe(false);
    expect(
      dealSchema.safeParse({
        lead_id: actor,
        revision: null,
        name: "Deal",
        pipeline: "Local",
        stage_key: "won",
        stage_label: "Won",
        stage_category: "won",
        amount: "2.10",
        currency: "IDR",
        close_date: null,
      }).success,
    ).toBe(false);
  });
  it("follow-up counts workdays, includes new/gaps and exceeds rather than equals SLA", () => {
    expect(workdaysSince("2026-09-11T00:00:00Z", "2026-09-15")).toBe(2);
    expect(
      followUp(
        {
          status: "mql",
          attributionMissing: false,
          lastEvent: "2026-09-11T00:00:00Z",
        },
        "2026-09-15",
        2,
        3,
      ),
    ).toEqual([]);
    expect(
      followUp(
        {
          status: "mql",
          attributionMissing: false,
          lastEvent: "2026-09-11T00:00:00Z",
        },
        "2026-09-16",
        2,
        3,
      ),
    ).toHaveLength(1);
    expect(
      followUp(
        {
          status: "new",
          attributionMissing: true,
          lastEvent: "2026-09-11T00:00:00Z",
        },
        "2026-09-16",
        2,
        3,
      ),
    ).toHaveLength(2);
    expect(
      followUp(
        {
          status: "sql",
          attributionMissing: false,
          lastEvent: "2026-09-11T00:00:00Z",
        },
        "2026-09-16",
        2,
        3,
      ),
    ).toEqual([]);
  });
});
