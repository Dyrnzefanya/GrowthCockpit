import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { after } from "next/server";
import { serverEnv } from "@/lib/env.server";
import * as hubspot from "@/integrations/hubspot/client";
import {
  kinds,
  kindSchema,
  providerId,
  webhookSchema,
  type Kind,
  type CrmRecord,
} from "@/integrations/hubspot/mapping";
import { verifyHubspot } from "@/integrations/hubspot/signature";
import { boundedBody } from "@/lib/http/hmac";
import { mirrorPlan } from "@/domain/hubspot";
import { errorCode } from "@/domain/integrations";
import * as repo from "@/repositories/hubspot";
import * as queue from "@/repositories/integrations";
import { readLead } from "@/repositories/leads";
import type { Json } from "@/types/database.generated";
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function syncRecord(
  kind: Kind,
  record: CrmRecord,
  event?: { id: string; claim: string },
  deadline = Date.now() + 18000,
  force = false,
) {
  const config = await repo.configuration(true);
  if (
    !config.mapping ||
    config.mapping.portal_id !== serverEnv.HUBSPOT_PORTAL_ID
  )
    throw new Error("MAPPING_INVALID");
  await hubspot.validatePortal(config.mapping.portal_id, deadline);
  // Resolve dependencies through the same adapter and planner, never fabricate local identities.
  let snapshot = await repo.snapshot(kind, record);
  if (Date.now() + 2000 >= deadline) throw new Error("TIMEOUT");
  for (const assoc of kind === "companies"
    ? []
    : (record.associations?.companies?.results ?? [])) {
    if (!snapshot.companies.some((c) => c.hubspot_company_id === assoc.id))
      await syncRecord(
        "companies",
        await hubspot.readRecord("companies", assoc.id, deadline),
        undefined,
        deadline,
      );
  }
  if (kind === "deals")
    for (const assoc of record.associations?.contacts?.results ?? []) {
      if (!snapshot.contacts.some((c) => c.hubspot_contact_id === assoc.id))
        await syncRecord(
          "contacts",
          await hubspot.readRecord("contacts", assoc.id, deadline),
          undefined,
          deadline,
        );
    }
  const historyKey = kind === "deals" ? "dealstage" : "lifecyclestage";
  const history = record.propertiesWithHistory?.[historyKey]
    ?.filter((h) => h.value === record.properties[historyKey])
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  for (let attempt = 0; attempt < 3; attempt++) {
    if (Date.now() + 2000 >= deadline) throw new Error("TIMEOUT");
    if (kind !== "companies" || attempt > 0)
      snapshot = await repo.snapshot(kind, record);
    const plan = mirrorPlan(
      kind,
      record,
      snapshot,
      config.mapping,
      config.rule,
      new Date().toISOString(),
      history?.[0]?.timestamp,
      force,
    );
    try {
      await repo.commit(plan, event);
    } catch (e) {
      if (e instanceof Error && e.message === "CONFLICT") {
        if (attempt < 2) continue;
        throw new Error("UPSTREAM_UNAVAILABLE");
      }
      throw e;
    }
    if (plan.warnings.length)
      await repo.saveState(kind + ":issues", null, plan.warnings, undefined);
    return plan.changes.length;
  }
  throw new Error("UPSTREAM_UNAVAILABLE");
}
export async function processHubspotEvent(
  payload: Json,
  event: { id: string; claim: string },
) {
  const task = z
    .object({
      kind: kindSchema,
      id: providerId,
      deleted: z.boolean().optional(),
      occurredAt: z.number().optional(),
      merge: z.boolean().optional(),
      force: z.boolean().optional(),
    })
    .safeParse(payload);
  if (!task.success) throw new Error("VALIDATION_FAILED");
  await hubspot.validatePortal(serverEnv.HUBSPOT_PORTAL_ID!);
  const record = task.data.deleted
    ? {
        id: task.data.id,
        properties: {},
        updatedAt: new Date(task.data.occurredAt!).toISOString(),
        archived: true,
      }
    : await hubspot.readRecord(task.data.kind, task.data.id);
  if (task.data.merge) throw new Error("CONFLICT");
  return syncRecord(task.data.kind, record, event, undefined, task.data.force);
}
export async function receiveHubspot(request: Request) {
  const correlation = randomUUID();
  const reject = async (code: string, status: number, payload: Json = null) => {
    await queue.accept({
      id: randomUUID(),
      source: "hubspot",
      signature_valid: status === 400,
      payload,
      status: "rejected",
      last_error: code,
      correlation_id: correlation,
      result: { status: "rejected", code },
    });
    return Response.json({ code, correlation_id: correlation }, { status });
  };
  try {
    if (!serverEnv.HUBSPOT_WEBHOOK_SECRET || !serverEnv.HUBSPOT_PORTAL_ID)
      return Response.json({ code: "NOT_CONFIGURED" }, { status: 503 });
    let raw: Buffer;
    try {
      raw = await boundedBody(request);
    } catch (e) {
      return await reject(
        e instanceof Error && e.message === "PAYLOAD_TOO_LARGE"
          ? "PAYLOAD_TOO_LARGE"
          : "CONTENT_TYPE",
        e instanceof Error && e.message === "PAYLOAD_TOO_LARGE" ? 413 : 415,
      );
    }
    const url = new URL(request.url);
    const canonical = new URL(url.pathname + url.search, serverEnv.APP_BASE_URL)
      .href;
    if (
      !verifyHubspot(
        request.headers,
        raw,
        canonical,
        serverEnv.HUBSPOT_WEBHOOK_SECRET,
      )
    )
      return await reject("UNAUTHENTICATED", 401);
    let payload: unknown;
    try {
      payload = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(raw),
      );
    } catch {
      return await reject("VALIDATION_FAILED", 400);
    }
    const parsed = webhookSchema.safeParse(payload);
    if (!parsed.success)
      return await reject("VALIDATION_FAILED", 400, payload as Json);
    if (
      parsed.data.some(
        (e) => String(e.portalId) !== serverEnv.HUBSPOT_PORTAL_ID,
      )
    )
      return await reject("FORBIDDEN", 403);
    const ids: string[] = [];
    for (const [index, e] of parsed.data.entries()) {
      const key =
        "hubspot:" +
        digest(
          JSON.stringify([
            e.portalId,
            e.subscriptionId,
            e.eventId,
            e.objectId,
            e.occurredAt,
            e.subscriptionType,
            e.propertyName ?? "",
            e.propertyValue ?? "",
          ]),
        );
      const result = await queue.accept({
        id: randomUUID(),
        source: "hubspot",
        signature_valid: true,
        idempotency_key: key,
        payload: {
          kind: e.subscriptionType.startsWith("contact.")
            ? "contacts"
            : "deals",
          id: String(e.objectId),
          deleted: e.subscriptionType.endsWith(".deletion"),
          merge: e.subscriptionType.endsWith(".merge"),
          occurredAt: e.occurredAt,
          raw: (payload as Json[])[index],
        },
        status: "received",
        correlation_id: correlation,
        result: { status: "received" },
      });
      if (result.inserted) ids.push(result.event.id);
    }
    after(async () => {
      const { processNext } = await import("@/services/integration-runs");
      const deadline = Date.now() + 35000;
      for (const id of ids) {
        if (Date.now() + 18000 > deadline) break;
        try {
          await processNext(id, "webhook", 5);
        } catch {
          break;
        }
      }
    });
    return Response.json(
      {
        status: "received",
        accepted: ids.length,
        replayed: ids.length === 0,
        correlation_id: correlation,
      },
      { status: 200 },
    );
  } catch {
    return Response.json(
      { code: "INTERNAL", correlation_id: correlation },
      { status: 503 },
    );
  }
}
const cursorSchema = z.object({
  from: z.number(),
  to: z.number(),
  after: z.string().optional(),
  pending: z.array(providerId).default([]),
  next: z.string().nullable().optional(),
  complete: z.boolean().default(false),
});
export async function reconcileHubspot(deadline: number, max: number) {
  const config = await repo.configuration(true);
  if (
    !config.mapping ||
    config.mapping.portal_id !== serverEnv.HUBSPOT_PORTAL_ID
  ) {
    await repo.saveState(
      "configuration",
      null,
      ["CRITICAL:MAPPING_INVALID"],
      false,
    );
    throw new Error("MAPPING_INVALID");
  }
  await hubspot.validatePortal(config.mapping.portal_id, deadline);
  await repo.saveState("configuration", null, [], true);
  let read = 0,
    written = 0,
    failed = 0,
    hasMore = false;
  for (const kind of kinds) {
    const previous = await repo.state(kind);
    let cursor: z.infer<typeof cursorSchema>;
    try {
      cursor = cursorSchema.parse(JSON.parse(previous?.cursor ?? "null"));
    } catch {
      cursor = { from: 0, to: Date.now(), pending: [], complete: false };
    }
    if (cursor.complete)
      cursor = {
        from: Math.max(0, cursor.to - 300000),
        to: Date.now(),
        pending: [],
        complete: false,
      };
    while (read < max && Date.now() + 12000 < deadline) {
      try {
        if (!cursor.pending.length) {
          const page = await hubspot.searchRecords(
            kind,
            cursor.from,
            cursor.to,
            cursor.after,
            deadline,
          );
          cursor.pending = page.results.map((r) => r.id);
          cursor.next = page.paging?.next
            ? String(page.paging.next.after)
            : null;
          await repo.saveState(kind, JSON.stringify(cursor), null, undefined);
        }
        const ids = cursor.pending.slice(0, Math.min(100, max - read));
        const records = ids.length
          ? await hubspot.readBatch(kind, ids, deadline)
          : [];
        for (const id of ids) {
          if (Date.now() + 8000 >= deadline) {
            hasMore = true;
            break;
          }
          read++;
          written += await syncRecord(
            kind,
            records.find((r) => r.id === id)!,
            undefined,
            deadline,
          );
          cursor.pending.shift();
          await repo.saveState(kind, JSON.stringify(cursor), null, undefined);
        }
        if (cursor.pending.length) {
          hasMore = true;
          break;
        }
        if (cursor.next) {
          cursor.after = cursor.next;
          cursor.next = undefined;
          await repo.saveState(kind, JSON.stringify(cursor), null, undefined);
        } else {
          cursor.complete = true;
          await repo.saveState(kind, JSON.stringify(cursor), null, true);
          break;
        }
      } catch (e) {
        failed++;
        await repo.saveState(
          kind,
          JSON.stringify(cursor),
          [errorCode(e)],
          false,
        );
        hasMore = true;
        break;
      }
    }
    if (!cursor.complete) hasMore = true;
  }
  // Recover outbound work including CSV imports and a queue write interrupted after local commit.
  if (Date.now() + 8000 < deadline) {
    const previous = await repo.state("writeback");
    const rows = await repo.pendingWritebacks(25, previous?.cursor ?? null);
    for (const row of rows) {
      if (Date.now() + 4000 >= deadline) {
        hasMore = true;
        break;
      }
      await queueWriteback(row.id, row.updated_at);
      await repo.saveState(
        "writeback",
        JSON.stringify({ at: row.updated_at, id: row.id }),
        null,
        true,
      );
    }
  }
  return { read, written, failed, hasMore };
}
export async function processHubspotRange(
  payload: Json,
  event: { id: string; claim: string },
) {
  const range = z
    .object({
      kind: kindSchema,
      from: z.number().nonnegative(),
      to: z.number().nonnegative(),
      after: z.string().optional(),
    })
    .parse(payload);
  const page = await hubspot.searchRecords(
    range.kind,
    range.from,
    range.to,
    range.after,
    Date.now() + 12000,
    5,
  );
  for (const record of page.results)
    await queue.accept({
      id: randomUUID(),
      source: "hubspot",
      signature_valid: true,
      idempotency_key: "hs-manual:" + digest(event.id + record.id),
      payload: { kind: range.kind, id: record.id, force: true },
      status: "received",
      correlation_id: randomUUID(),
      result: { status: "received" },
    });
  if (page.paging?.next)
    await queue.accept({
      id: randomUUID(),
      source: "hubspot_range",
      signature_valid: true,
      idempotency_key: "hs-range-next:" + digest(event.id),
      payload: { ...range, after: String(page.paging.next.after) },
      status: "received",
      correlation_id: randomUUID(),
      result: { status: "received" },
    });
  await repo.commit({ changes: [], events: [], warnings: [] }, event);
}
export async function queueWriteback(leadId: string, revision: string) {
  if (!serverEnv.HUBSPOT_ACCESS_TOKEN) return;
  await queue.accept({
    id: randomUUID(),
    source: "hubspot_writeback",
    signature_valid: true,
    idempotency_key: "hubspot-write:" + digest(leadId + revision),
    payload: { leadId },
    status: "received",
    correlation_id: randomUUID(),
    result: { status: "received" },
  });
}
export async function writebackLead(
  payload: Json,
  event: { id: string; claim: string },
) {
  // ponytail: one outbound writer per workspace; partition only if measured throughput requires it.
  const run = await queue.startJob("HUBSPOT-WRITEBACK", "manual", randomUUID());
  if (!run) throw new Error("UPSTREAM_UNAVAILABLE");
  try {
    await performWriteback(payload, event, Date.now() + 18000);
    await queue.finishRun(run, "success", 1, 1, 0, null, null);
  } catch (e) {
    await queue.finishRun(run, "failed", 1, 0, 1, errorCode(e), null);
    throw e;
  }
}
async function performWriteback(
  payload: Json,
  event: { id: string; claim: string },
  deadline: number,
) {
  const { leadId } = z.object({ leadId: z.uuid() }).parse(payload);
  const detail = await readLead(leadId, 0, true),
    config = await repo.configuration(true);
  if (!detail?.contact) throw new Error("NOT_FOUND");
  if (
    !config.mapping ||
    config.mapping.portal_id !== serverEnv.HUBSPOT_PORTAL_ID
  )
    throw new Error("MAPPING_INVALID");
  await hubspot.validatePortal(config.mapping.portal_id, deadline);
  const c = detail.contact;
  let record: CrmRecord | undefined;
  if (c.hubspot_contact_id)
    record = await hubspot.readRecord(
      "contacts",
      c.hubspot_contact_id,
      deadline,
    );
  else {
    const matches = [];
    if (c.email)
      matches.push(
        ...(await hubspot.findRecord("contacts", "email", c.email, deadline))
          .results,
      );
    if (c.phone_e164)
      matches.push(
        ...(
          await hubspot.findRecord("contacts", "phone", c.phone_e164, deadline)
        ).results,
      );
    const unique = [...new Map(matches.map((r) => [r.id, r])).values()];
    if (unique.length > 1) throw new Error("CONFLICT");
    record = unique[0];
  }
  const properties: Record<string, string> = {};
  if (detail.lead.product_interest)
    properties.lead_product_interest = detail.lead.product_interest;
  if (detail.lead.estimated_quantity !== null)
    properties.estimated_quantity = String(detail.lead.estimated_quantity);
  if (!record) {
    if (c.email) properties.email = c.email;
    if (c.phone_e164) properties.phone = c.phone_e164;
    if (c.full_name) properties.firstname = c.full_name;
  }
  const first: Record<string, string | null> = {
    original_utm_source: c.ft_source,
    original_utm_medium: c.ft_medium,
    original_utm_campaign: c.ft_campaign,
    original_utm_content: c.ft_content,
    original_utm_term: c.ft_term,
    original_landing_page: c.ft_landing_page,
  };
  if (c.ft_at && Date.parse(c.ft_at) === Date.parse(detail.lead.inquiry_at)) {
    first.original_click_id = detail.lead.click_id;
    first.original_click_id_type =
      detail.lead.click_id_type === "none" ? null : detail.lead.click_id_type;
  }
  for (const [key, value] of Object.entries(first))
    if (value && !record?.properties[key]) properties[key] = value;
  if (detail.lead.qualification_status === "mql") {
    properties.lead_quality_reason = detail.lead.qualification_reason;
    if (detail.lead.qualified_at)
      properties.pmos_qualified_at = String(
        Date.parse(detail.lead.qualified_at),
      );
    properties.pmos_lead_id = leadId;
    if (config.writeLifecycle) {
      const stages = Object.entries(config.mapping.lifecycle_map).filter(
        ([, value]) => value === "mql",
      );
      if (stages.length !== 1) throw new Error("MAPPING_INVALID");
      properties.lifecyclestage = stages[0][0];
    }
  }
  for (const key of Object.keys(properties))
    if (record?.properties[key] === properties[key]) delete properties[key];
  if (!record || Object.keys(properties).length)
    record = await hubspot.writeRecord(
      "contacts",
      record?.id ?? null,
      properties,
      deadline,
    );
  if (detail.company) {
    let company = detail.company.hubspot_company_id
      ? await hubspot.readRecord(
          "companies",
          detail.company.hubspot_company_id,
          deadline,
        )
      : undefined;
    if (!company) {
      const found = await hubspot.findRecord(
        "companies",
        detail.company.domain ? "domain" : "name",
        detail.company.domain ?? detail.company.name,
        deadline,
      );
      if (found.results.length > 1) throw new Error("CONFLICT");
      company = found.results[0];
    }
    if (!company)
      company = await hubspot.writeRecord(
        "companies",
        null,
        {
          name: detail.company.name,
          ...(detail.company.domain ? { domain: detail.company.domain } : {}),
        },
        deadline,
      );
    await repo.commit({
      changes: [
        {
          table: "companies",
          id: detail.company.id,
          revision: detail.company.updated_at,
          value: { hubspot_company_id: company.id },
        },
      ],
      events: [],
      warnings: [],
    });
    await hubspot.associateCompany(record.id, company.id, deadline);
  }
  // Outbound success binds the existing local person without reinterpreting its qualification.
  await repo.commit(
    {
      changes: [
        {
          table: "contacts",
          id: c.id,
          revision: c.updated_at,
          value: { hubspot_contact_id: record.id },
        },
      ],
      events: [],
      warnings: [],
    },
    event,
  );
}
