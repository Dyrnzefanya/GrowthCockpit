import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  email,
  phone,
  domain,
  identityText,
  allocations,
} from "@/domain/attribution/normalise";
import { toJakartaDate } from "@/domain/dates";
import type { Mapping, CrmRecord, Kind } from "@/integrations/hubspot/mapping";
import type { Json } from "@/types/database.generated";
export type MirrorRow = Record<string, Json | undefined>;
export type MirrorSnapshot = {
  companies: MirrorRow[];
  contacts: MirrorRow[];
  deals: MirrorRow[];
  leads: MirrorRow[];
};
export type Change = {
  table: Kind | "leads";
  id: string;
  revision: string | null;
  value: MirrorRow;
};
export type MirrorPlan = {
  changes: Change[];
  events: MirrorRow[];
  warnings: string[];
};
const text = (v: Json | undefined) => (typeof v === "string" ? v : null);
function resolve(rows: MirrorRow[], kind: Kind, r: CrmRecord) {
  const external = rows.find(
    (row) =>
      row[
        `hubspot_${kind === "companies" ? "company" : kind === "contacts" ? "contact" : "deal"}_id`
      ] === r.id,
  );
  const candidates =
    kind === "contacts"
      ? rows.filter(
          (row) =>
            (email(r.properties.email) &&
              row.email === email(r.properties.email)) ||
            (phone(r.properties.phone) &&
              row.phone_e164 === phone(r.properties.phone)),
        )
      : kind === "companies"
        ? rows.filter(
            (row) =>
              domain(r.properties.domain) &&
              row.domain === domain(r.properties.domain),
          )
        : [];
  const matches = new Map(
    [...candidates, ...(external ? [external] : [])].map((row) => [
      row.id,
      row,
    ]),
  );
  if (matches.size > 1) throw new Error("CONFLICT");
  const found = external ?? candidates[0];
  const other =
    found?.[
      `hubspot_${kind === "companies" ? "company" : kind === "contacts" ? "contact" : "deal"}_id`
    ];
  if (other && other !== r.id) throw new Error("CONFLICT");
  return found;
}
export function mirrorPlan(
  kind: Kind,
  r: CrmRecord,
  s: MirrorSnapshot,
  m: Mapping,
  rule: string,
  now: string,
  transitionAt?: string,
  force = false,
): MirrorPlan {
  const plan: MirrorPlan = { changes: [], events: [], warnings: [] },
    old = resolve(s[kind], kind, r);
  if (
    old?.source_updated_at &&
    (Date.parse(String(old.source_updated_at)) > Date.parse(r.updatedAt) ||
      (((!force &&
        old.source_system === (r.archived ? "hubspot_archived" : "hubspot")) ||
        (old.source_system === "hubspot_archived" && !r.archived)) &&
        Date.parse(String(old.source_updated_at)) === Date.parse(r.updatedAt)))
  )
    return plan;
  const id = text(old?.id) ?? randomUUID(),
    p = r.properties;
  const value: MirrorRow = {
    id,
    source_system: r.archived ? "hubspot_archived" : "hubspot",
    source_updated_at: r.updatedAt,
    synced_at: now,
    [`hubspot_${kind === "companies" ? "company" : kind === "contacts" ? "contact" : "deal"}_id`]:
      r.id,
  };
  const assign = (local: string, remote: string) => {
    if (Object.hasOwn(p, remote)) value[local] = p[remote] || null;
  };
  if (r.archived) {
    plan.warnings.push(`ARCHIVED_${kind}:${r.id}`);
    if (!old) return plan;
  } else if (kind === "companies") {
    if (!old && !p.name) throw new Error("VALIDATION_FAILED");
    assign("name", "name");
    assign("industry", "industry");
    if (Object.hasOwn(p, "name")) value.name_key = identityText(p.name);
    if (Object.hasOwn(p, "domain")) value.domain = domain(p.domain);
  } else if (kind === "contacts") {
    if (Object.hasOwn(p, "email")) value.email = email(p.email);
    if (Object.hasOwn(p, "phone")) value.phone_e164 = phone(p.phone);
    if (Object.hasOwn(p, "firstname") || Object.hasOwn(p, "lastname"))
      value.full_name =
        [p.firstname, p.lastname].filter(Boolean).join(" ") || null;
    assign("lifecycle_stage", "lifecyclestage");
    assign("hubspot_owner_id", "hubspot_owner_id");
    const companies = r.associations?.companies;
    if (companies?.paging) throw new Error("CONFLICT");
    const primary = companies?.results.find(
      (a) => a.type === "contact_to_company",
    );
    const association =
      primary ??
      (companies?.results.length === 1 ? companies.results[0] : undefined);
    if ((companies?.results.length ?? 0) > 1)
      plan.warnings.push(`MULTIPLE_COMPANIES:${r.id}`);
    if (association) {
      const company = s.companies.find(
        (c) => c.hubspot_company_id === association.id,
      );
      if (!company) throw new Error("UPSTREAM_UNAVAILABLE");
      value.company_id = company.id;
    }
    if (p.hubspot_owner_id && !m.owner_map[p.hubspot_owner_id])
      plan.warnings.push(`UNMAPPED_OWNER:${p.hubspot_owner_id}`);
    const lifecycle = p.lifecyclestage;
    const mapped = lifecycle ? m.lifecycle_map[lifecycle] : undefined;
    if (lifecycle && !mapped)
      plan.warnings.push(`UNMAPPED_LIFECYCLE:${lifecycle}`);
    const at = transitionAt;
    if (lifecycle !== undefined && lifecycle !== old?.lifecycle_stage)
      value.lifecycle_stage_at = at ?? null;
    let inquiries = s.leads.filter((l) => l.contact_id === id);
    if (p.pmos_lead_id)
      inquiries = inquiries.filter((l) => l.id === p.pmos_lead_id);
    if (!p.pmos_lead_id && inquiries.length > 1) {
      plan.warnings.push(`AMBIGUOUS_INQUIRY:${r.id}`);
      inquiries = [];
    }
    for (const lead of inquiries) {
      if (!mapped || lead.qualification_status === mapped) continue;
      if (lead.manual_override) {
        plan.warnings.push(`QUALIFICATION_DIVERGENCE:${lead.id}`);
        continue;
      }
      if (!at) {
        plan.warnings.push(`MISSING_TRANSITION_TIME:${r.id}`);
        continue;
      }
      plan.changes.push({
        table: "leads",
        id: String(lead.id),
        revision: String(lead.updated_at),
        value: {
          qualification_status: mapped,
          qualification_reason: "HUBSPOT_LIFECYCLE:" + lifecycle,
          ...(mapped === "sql" && !lead.sql_at ? { sql_at: at } : {}),
          ...(["mql", "sql"].includes(mapped) && !lead.qualified_at
            ? { qualified_at: at }
            : {}),
          ...(mapped === "disqualified" && !lead.disqualified_at
            ? { disqualified_at: at }
            : {}),
        },
      });
      plan.events.push({
        id: randomUUID(),
        lead_id: lead.id,
        from_status: lead.qualification_status,
        to_status: mapped,
        changed_at: at,
        source: "hubspot",
        actor: null,
        note: "CRM lifecycle: " + lifecycle,
      });
    }
  } else {
    if (!old && (!p.dealname || !p.pipeline || !p.dealstage))
      throw new Error("VALIDATION_FAILED");
    assign("name", "dealname");
    assign("pipeline", "pipeline");
    assign("stage_key", "dealstage");
    assign("owner_hubspot_id", "hubspot_owner_id");
    if (p.pipeline && p.pipeline !== m.pipeline_id)
      plan.warnings.push(`UNMAPPED_PIPELINE:${p.pipeline}`);
    const stage = p.dealstage ?? text(old?.stage_key);
    const category =
      stage && (p.pipeline ?? old?.pipeline) === m.pipeline_id
        ? m.deal_stage_map[stage]
        : undefined;
    if (stage && !category) plan.warnings.push(`UNMAPPED_STAGE:${stage}`);
    value.stage_category = category ?? "open";
    value.stage_label = stage ?? "";
    if (Object.hasOwn(p, "amount"))
      value.amount = p.amount
        ? z
            .string()
            .regex(/^\d{1,16}(\.\d{1,2})?$/)
            .parse(p.amount)
        : null;
    if (p.deal_currency_code)
      value.currency = z
        .string()
        .regex(/^[A-Z]{3}$/)
        .parse(p.deal_currency_code);
    else if (!old) throw new Error("VALIDATION_FAILED");
    if (p.closedate) {
      const close = z.iso.datetime({ offset: true }).parse(p.closedate);
      value.expected_close_date = toJakartaDate(close);
      if (category === "won" || category === "lost")
        value.close_date = toJakartaDate(close);
    } else if ((category === "won" || category === "lost") && !old?.close_date)
      throw new Error("VALIDATION_FAILED");
    if (category === "open") value.close_date = null;
    const contactIds = r.associations?.contacts;
    if (contactIds?.paging) throw new Error("CONFLICT");
    const linkedContacts = s.contacts.filter((c) =>
      contactIds?.results.some((a) => a.id === c.hubspot_contact_id),
    );
    let leads = p.pmos_lead_id
      ? s.leads.filter((l) => l.id === p.pmos_lead_id)
      : s.leads.filter((l) =>
          linkedContacts.some((c) => c.id === l.contact_id),
        );
    if (old?.lead_id) leads = s.leads.filter((l) => l.id === old.lead_id);
    const lead = leads.length === 1 ? leads[0] : undefined;
    if (!lead) plan.warnings.push(`UNLINKED_DEAL:${r.id}`);
    value.lead_id = lead?.id ?? old?.lead_id ?? null;
    value.contact_id =
      lead?.contact_id ??
      (linkedContacts.length === 1
        ? linkedContacts[0].id
        : (old?.contact_id ?? null));
    value.company_id = lead?.company_id ?? old?.company_id ?? null;
    if (lead && !lead.deal_id)
      plan.changes.push({
        table: "leads",
        id: String(lead.id),
        revision: String(lead.updated_at),
        value: { deal_id: id },
      });
    if (lead && stage !== old?.stage_key) {
      if (transitionAt)
        plan.events.push({
          id: randomUUID(),
          lead_id: lead.id,
          from_status: lead.qualification_status,
          to_status: lead.qualification_status,
          changed_at: transitionAt,
          source: "hubspot",
          actor: null,
          note: `CRM deal ${r.id}: ${old?.stage_key ?? "created"} → ${stage}`,
        });
      else plan.warnings.push(`MISSING_DEAL_TRANSITION_TIME:${r.id}`);
    }
    if (category === "won" && !old?.attribution_rule_version && lead) {
      const first = text(
          s.contacts.find((c) => c.id === lead.contact_id)?.ft_campaign,
        ),
        last = text(lead.lt_campaign);
      value.attribution_rule_version = "a1:" + rule;
      value.attribution_allocations = allocations(rule, last, first);
      value.attributed_campaign = rule === "contact_first_touch" ? first : last;
    }
  }
  plan.changes.unshift({
    table: kind,
    id,
    revision: text(old?.updated_at),
    value,
  });
  return plan;
}
export function qualificationDivergence(
  lead: MirrorRow,
  contact: MirrorRow | null,
  m: Mapping | null,
) {
  const raw = text(contact?.lifecycle_stage),
    mapped = raw && m?.lifecycle_map[raw];
  return Boolean(mapped && mapped !== lead.qualification_status);
}
