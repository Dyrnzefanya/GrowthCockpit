import type { Database } from "@/types/database.generated";
import type { LeadInput } from "@/config/lead-schema";
import {
  email,
  phone,
  domain,
  identityText,
  platform,
} from "@/domain/attribution/normalise";
import { qualify, type QualificationSettings } from "@/domain/qualification";
import {
  previousMatch,
  duplicateWindowMs,
  resolveContact,
  resolveCompany,
} from "./rules";
import { toJakartaDate } from "@/domain/dates";
type Tables = Database["public"]["Tables"];
export type Contact = Tables["contacts"]["Row"];
export type Company = Tables["companies"]["Row"];
export type Lead = Tables["leads"]["Row"];
export type StageEvent = Tables["lead_stage_events"]["Row"];
export type Snapshot = {
  contacts: Contact[];
  companies: Company[];
  leads: Lead[];
  revision: string;
};
export type Submission = { input: LeadInput; key: string; row: number };
export type ReportRow = {
  row: number;
  status: "created" | "updated" | "skipped" | "error";
  leadId?: string;
  reason: string;
};
export type LeadPlan = {
  contacts: Contact[];
  companies: Company[];
  leads: Lead[];
  duplicates: Lead[];
  events: StageEvent[];
  report: ReportRow[];
};
const nullable = (s: string) => s || null;
export function scopeFor(submissions: Submission[]) {
  return {
    emails: [
      ...new Set(
        submissions
          .map((s) => email(s.input.email))
          .filter((s): s is string => s !== null),
      ),
    ],
    phones: [
      ...new Set(
        submissions
          .map((s) => phone(s.input.phone))
          .filter((s): s is string => s !== null),
      ),
    ],
    domains: [
      ...new Set(
        submissions
          .map((s) => domain(s.input.company_domain))
          .filter((s): s is string => s !== null),
      ),
    ],
    names: [
      ...new Set(
        submissions
          .map((s) => identityText(s.input.company_name))
          .filter(Boolean),
      ),
    ],
    keys: submissions.map((s) => s.key),
  };
}
export function planLeads(
  snapshot: Snapshot,
  submissions: Submission[],
  settings: QualificationSettings,
  actor: string | null,
  now: string,
  id: () => string,
): LeadPlan {
  const state = structuredClone(snapshot);
  const plan: LeadPlan = {
    contacts: [],
    companies: [],
    leads: [],
    duplicates: [],
    events: [],
    report: [],
  };
  const contactChanges = new Map<string, Contact>(),
    companyChanges = new Map<string, Company>(),
    duplicateChanges = new Map<string, Lead>();
  const replay = new Map(
    state.leads.flatMap((l) => l.submission_keys.map((k) => [k, l] as const)),
  );
  const byContact = new Map<string, Lead[]>();
  for (const lead of state.leads)
    if (lead.contact_id)
      byContact.set(lead.contact_id, [
        ...(byContact.get(lead.contact_id) ?? []),
        lead,
      ]);
  const base = (source: string) => ({
    id: id(),
    created_at: now,
    updated_at: now,
    external_id: null,
    source_system: source,
    source_updated_at: null,
    synced_at: null,
  });
  for (const s of [...submissions].sort(
    (a, b) =>
      a.input.occurred_at.localeCompare(b.input.occurred_at) || a.row - b.row,
  )) {
    const i = s.input;
    if (replay.has(s.key)) {
      plan.report.push({
        row: s.row,
        status: "skipped",
        leadId: replay.get(s.key)!.id,
        reason: "Submission sudah tersimpan",
      });
      continue;
    }
    try {
      const mail = email(i.email),
        tel = phone(i.phone);
      let contact = resolveContact(state.contacts, mail, tel);
      const companyDomain = domain(i.company_domain),
        companyName = identityText(i.company_name);
      let company = resolveCompany(state.companies, companyDomain, companyName);
      // Resolve every possible conflict before mutating this in-memory plan.
      if (
        contact &&
        ((mail && contact.email && contact.email !== mail) ||
          (tel && contact.phone_e164 && contact.phone_e164 !== tel))
      )
        throw new Error("CONFLICT");
      const product = identityText(i.product_interest);
      const candidates = contact
        ? (byContact.get(contact.id) ?? []).filter(
            (l) => l.product_key === product,
          )
        : [];
      const matches = candidates.filter((l) =>
        previousMatch(l.inquiry_observations, i.occurred_at),
      );
      if (
        matches.length > 1 ||
        candidates.some((l) =>
          l.inquiry_observations.some(
            (t) =>
              Date.parse(t) > Date.parse(i.occurred_at) &&
              Date.parse(t) - Date.parse(i.occurred_at) <= duplicateWindowMs,
          ),
        )
      )
        throw new Error("CONFLICT");
      if (matches.length) {
        const lead = matches[0];
        lead.submission_keys.push(s.key);
        if (!lead.inquiry_observations.includes(i.occurred_at))
          lead.inquiry_observations.push(i.occurred_at);
        if (!plan.leads.some((l) => l.id === lead.id))
          duplicateChanges.set(lead.id, lead);
        replay.set(s.key, lead);
        plan.report.push({
          row: s.row,
          status: "skipped",
          leadId: lead.id,
          reason: "Inquiry sama dalam jendela rolling 24 jam",
        });
        continue;
      }
      if (!company && (companyName || companyDomain)) {
        company = {
          ...base(i.channel),
          name: i.company_name || companyDomain!,
          name_key: companyName || companyDomain!,
          domain: companyDomain,
          hubspot_company_id: null,
          segment: null,
          industry: null,
        };
        state.companies.push(company);
        companyChanges.set(company.id, company);
      }
      if (!contact && (mail || tel)) {
        contact = {
          ...base(i.channel),
          email: mail,
          phone_e164: tel,
          full_name: nullable(i.full_name),
          company_id: company?.id ?? null,
          hubspot_contact_id: null,
          lifecycle_stage: null,
          lifecycle_stage_at: null,
          hubspot_owner_id: null,
          ft_source: nullable(i.utm_source),
          ft_medium: nullable(i.utm_medium),
          ft_campaign: nullable(i.utm_campaign),
          ft_content: nullable(i.utm_content),
          ft_term: nullable(i.utm_term),
          ft_landing_page: nullable(i.landing_page),
          ft_referrer: nullable(i.referrer),
          ft_at: i.occurred_at,
        };
        state.contacts.push(contact);
        contactChanges.set(contact.id, contact);
      } else if (contact) {
        const before = JSON.stringify(contact);
        contact.email ??= mail;
        contact.phone_e164 ??= tel;
        contact.full_name ??= nullable(i.full_name);
        contact.company_id ??= company?.id ?? null;
        // A later inquiry never supplies a different first-touch block.
        if (JSON.stringify(contact) !== before)
          contactChanges.set(contact.id, contact);
      }
      const verdict = qualify(i, settings),
        leadId = id();
      const lead: Lead = {
        ...base(i.channel),
        id: leadId,
        contact_id: contact?.id ?? null,
        company_id: company?.id ?? contact?.company_id ?? null,
        inquiry_at: i.occurred_at,
        inquiry_date: toJakartaDate(i.occurred_at),
        channel: i.channel,
        platform: platform(nullable(i.utm_source), i.platform, i.click_id_type),
        lt_source: nullable(i.utm_source),
        lt_medium: nullable(i.utm_medium),
        lt_campaign: nullable(i.utm_campaign),
        lt_content: nullable(i.utm_content),
        lt_term: nullable(i.utm_term),
        landing_page: nullable(i.landing_page),
        referrer: nullable(i.referrer),
        click_id_type: i.click_id_type,
        click_id: nullable(i.click_id),
        campaign_id: nullable(i.campaign_id),
        adset_id: nullable(i.adset_id),
        ad_id: nullable(i.ad_id),
        product_interest: nullable(i.product_interest),
        product_key: product,
        estimated_quantity: i.estimated_quantity,
        required_by_date: i.required_by_date,
        message: nullable(i.message),
        out_of_scope: i.out_of_scope,
        qualification_status: verdict.status,
        qualification_reason: verdict.reasons.join(","),
        qualification_rule_version: verdict.version,
        qualification_settings: { ...settings },
        qualified_at: verdict.status === "mql" ? i.occurred_at : null,
        sql_at: null,
        disqualified_at:
          verdict.status === "disqualified" ? i.occurred_at : null,
        manual_override: false,
        attribution_missing: !i.campaign_id && !i.utm_campaign,
        duplicate_suspect: false,
        owner_id: i.owner_id ?? actor,
        deal_id: null,
        source_event_id: null,
        // The timestamp anchors the rolling window; observation matching is never a calendar bucket.
        dedupe_key: JSON.stringify([
          contact?.id ?? s.key,
          product,
          i.occurred_at,
        ]),
        submission_keys: [s.key],
        inquiry_observations: [i.occurred_at],
      };
      state.leads.push(lead);
      plan.leads.push(lead);
      replay.set(s.key, lead);
      if (contact)
        byContact.set(contact.id, [...(byContact.get(contact.id) ?? []), lead]);
      plan.events.push({
        id: id(),
        lead_id: leadId,
        from_status: null,
        to_status: verdict.status,
        changed_at: i.occurred_at,
        source: i.channel === "import" ? "import" : "pmos",
        actor,
        note: verdict.reasons.join(","),
        created_at: now,
        updated_at: now,
      });
      plan.report.push({
        row: s.row,
        status: "created",
        leadId,
        reason:
          contact && candidates.length
            ? "Inquiry baru; Contact yang sama"
            : verdict.reasons.join(","),
      });
    } catch {
      plan.report.push({
        row: s.row,
        status: "error",
        reason:
          "CONFLICT: identitas atau inquiry ambigu; periksa email, telepon, produk, dan waktu. Tidak ada penggabungan otomatis.",
      });
    }
  }
  plan.contacts = [...contactChanges.values()];
  plan.companies = [...companyChanges.values()];
  plan.duplicates = [...duplicateChanges.values()];
  return plan;
}
