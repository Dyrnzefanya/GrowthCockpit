import "server-only";
import { z } from "zod";
import { serverEnv } from "@/lib/env.server";
import { retryOutcome } from "@/domain/integrations";
import {
  recordSchema,
  pageSchema,
  requestedProperties,
  providerId,
  type Kind,
} from "./mapping";
let nextSlot = 0;
const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
export async function hubspotRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: {
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
    deadline?: number;
    retrySafe?: boolean;
  } = {},
) {
  if (!serverEnv.HUBSPOT_ACCESS_TOKEN) throw new Error("NOT_CONFIGURED");
  if (
    (!path.startsWith("/crm/") && path !== "/account-info/v3/details") ||
    path.includes("..") ||
    path.includes("\\")
  )
    throw new Error("VALIDATION_FAILED");
  const deadline = options.deadline ?? Date.now() + 12000;
  for (let attempt = 1; attempt <= 5; attempt++) {
    // ponytail: throttle per warm instance; provider 429 and the job lease cover cross-instance contention.
    const slot = Math.max(Date.now(), nextSlot);
    nextSlot = slot + 220;
    if (slot + 1000 >= deadline) throw new Error("TIMEOUT");
    await sleep(Math.max(0, slot - Date.now()));
    let response: Response;
    try {
      response = await fetch("https://api.hubapi.com" + path, {
        method: options.method ?? "GET",
        headers: {
          Authorization: `Bearer ${serverEnv.HUBSPOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(
          Math.max(1, Math.min(4000, deadline - Date.now())),
        ),
      });
    } catch {
      // A lost create response may already have created a CRM record. Park it for resolution.
      if (options.retrySafe === false) throw new Error("CONFLICT");
      if (attempt === 5) throw new Error("NETWORK");
      if (Date.now() + 500 >= deadline) throw new Error("TIMEOUT");
      await sleep(250);
      continue;
    }
    if (response.ok) {
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error("VALIDATION_FAILED");
      }
      const parsed = schema.safeParse(payload);
      if (!parsed.success) throw new Error("VALIDATION_FAILED");
      return parsed.data;
    }
    const code =
      response.status === 429
        ? "UPSTREAM_RATE_LIMITED"
        : response.status >= 500
          ? "UPSTREAM_UNAVAILABLE"
          : response.status === 401
            ? "UNAUTHENTICATED"
            : response.status === 403
              ? "FORBIDDEN"
              : response.status === 404
                ? "NOT_FOUND"
                : "VALIDATION_FAILED";
    await response.body?.cancel();
    if (options.retrySafe === false && response.status >= 500)
      throw new Error("CONFLICT");
    if (
      ![429, 500, 502, 503, 504].includes(response.status) ||
      attempt === 5 ||
      options.retrySafe === false
    )
      throw new Error(code);
    const retryAfter = response.headers.get("retry-after");
    const wait = retryAfter
      ? /^\d+(\.\d+)?$/.test(retryAfter)
        ? Number(retryAfter) * 1000
        : Math.max(0, Date.parse(retryAfter) - Date.now())
      : Date.parse(
          retryOutcome(code, attempt, 6, Date.now(), Math.random()).next!,
        ) - Date.now();
    if (!Number.isFinite(wait) || Date.now() + wait + 1000 >= deadline)
      throw new Error(code);
    await sleep(Math.max(0, wait));
  }
  throw new Error("UPSTREAM_UNAVAILABLE");
}
export async function readRecord(kind: Kind, id: string, deadline?: number) {
  return withCurrency(
    kind,
    await hubspotRequest(
      `/crm/v3/objects/${kind}/${providerId.parse(id)}?properties=${requestedProperties[kind].join(",")}&propertiesWithHistory=lifecyclestage,dealstage&associations=contacts,companies`,
      recordSchema,
      { deadline },
    ),
  );
}
export function searchRecords(
  kind: Kind,
  from: number,
  to: number,
  after: string | undefined,
  deadline: number,
  limit = 100,
) {
  const modified =
    kind === "contacts" ? "lastmodifieddate" : "hs_lastmodifieddate";
  return hubspotRequest(`/crm/v3/objects/${kind}/search`, pageSchema, {
    method: "POST",
    deadline,
    body: {
      filterGroups: [
        {
          filters: [
            { propertyName: modified, operator: "GTE", value: String(from) },
            { propertyName: modified, operator: "LTE", value: String(to) },
          ],
        },
      ],
      sorts: [modified],
      properties: requestedProperties[kind],
      limit,
      ...(after ? { after } : {}),
    },
  });
}
export async function readBatch(kind: Kind, ids: string[], deadline: number) {
  const batch = await hubspotRequest(
    `/crm/v3/objects/${kind}/batch/read`,
    z.object({
      results: z.array(recordSchema),
      errors: z.array(z.unknown()).optional(),
    }),
    {
      method: "POST",
      deadline,
      body: {
        inputs: ids.map((id) => ({ id: providerId.parse(id) })),
        properties: requestedProperties[kind],
        propertiesWithHistory:
          kind === "contacts"
            ? ["lifecyclestage"]
            : kind === "deals"
              ? ["dealstage"]
              : [],
      },
    },
  );
  if (batch.errors?.length || batch.results.length !== ids.length)
    throw new Error("UPSTREAM_UNAVAILABLE");
  if (kind !== "companies")
    for (const target of kind === "contacts"
      ? ["companies"]
      : ["contacts", "companies"]) {
      const associations = await hubspotRequest(
        `/crm/v4/associations/${kind}/${target}/batch/read`,
        z.object({
          errors: z.array(z.unknown()).optional(),
          results: z.array(
            z.object({
              from: z.object({ id: providerId }),
              to: z.array(
                z.object({
                  toObjectId: z.union([z.number(), z.string()]),
                  associationTypes: z.array(
                    z.object({ label: z.string().nullable() }),
                  ),
                }),
              ),
              paging: z.unknown().optional(),
            }),
          ),
        }),
        {
          method: "POST",
          deadline,
          body: { inputs: ids.map((id) => ({ id })) },
        },
      );
      if (associations.errors?.length) throw new Error("UPSTREAM_UNAVAILABLE");
      for (const r of batch.results) {
        const linked = associations.results.find((v) => v.from.id === r.id);
        r.associations ??= {};
        r.associations[target] = {
          results:
            linked?.to.map((v) => ({
              id: String(v.toObjectId),
              type: v.associationTypes.some((t) => t.label === "Primary")
                ? "contact_to_company"
                : "associated",
            })) ?? [],
          ...(linked?.paging ? { paging: linked.paging } : {}),
        };
      }
    }
  return batch.results.map((r) => withCurrency(kind, r));
}
export function findRecord(
  kind: Kind,
  propertyName: string,
  value: string,
  deadline?: number,
) {
  return hubspotRequest(`/crm/v3/objects/${kind}/search`, pageSchema, {
    method: "POST",
    deadline,
    body: {
      filterGroups: [{ filters: [{ propertyName, operator: "EQ", value }] }],
      properties: requestedProperties[kind],
      limit: 2,
    },
  });
}
export function writeRecord(
  kind: "contacts" | "companies",
  id: string | null,
  properties: Record<string, string>,
  deadline?: number,
) {
  const allowed =
    kind === "companies"
      ? ["name", "domain"]
      : [
          "email",
          "phone",
          "firstname",
          "lastname",
          "lead_product_interest",
          "estimated_quantity",
          "lead_quality_reason",
          "pmos_qualified_at",
          "pmos_lead_id",
          "lifecyclestage",
          ...requestedProperties.contacts.filter((p) =>
            p.startsWith("original_"),
          ),
        ];
  if (Object.keys(properties).some((p) => !allowed.includes(p)))
    throw new Error("FORBIDDEN");
  return hubspotRequest(
    `/crm/v3/objects/${kind}${id ? "/" + providerId.parse(id) : ""}`,
    recordSchema,
    {
      method: id ? "PATCH" : "POST",
      body: { properties },
      retrySafe: Boolean(id),
      deadline,
    },
  );
}
export async function associateCompany(
  contactId: string,
  companyId: string,
  deadline?: number,
) {
  // Default association batch API is idempotent and needs no portal-specific type id.
  return hubspotRequest(
    "/crm/v4/associations/contacts/companies/batch/associate/default",
    z.unknown(),
    {
      method: "POST",
      deadline,
      body: {
        inputs: [
          {
            from: { id: providerId.parse(contactId) },
            to: { id: providerId.parse(companyId) },
          },
        ],
      },
    },
  );
}

let validated: {
  portal: string;
  until: number;
  currency: string;
  dealCurrency: boolean;
} | null = null;
export async function validatePortal(
  portal: string,
  deadline = Date.now() + 12000,
) {
  if (validated?.portal === portal && validated.until > Date.now())
    return validated;
  const account = await hubspotRequest(
    "/account-info/v3/details",
    z.object({
      portalId: z.number().int().positive(),
      companyCurrency: z.string().regex(/^[A-Z]{3}$/),
    }),
    { deadline },
  );
  if (String(account.portalId) !== portal) throw new Error("FORBIDDEN");
  const schema = z.object({ results: z.array(z.object({ name: z.string() })) });
  const contacts = await hubspotRequest("/crm/v3/properties/contacts", schema, {
    deadline,
  });
  const deals = await hubspotRequest("/crm/v3/properties/deals", schema, {
    deadline,
  });
  const names = new Set(contacts.results.map((p) => p.name)),
    dealNames = new Set(deals.results.map((p) => p.name));
  for (const name of [
    "original_utm_source",
    "original_utm_medium",
    "original_utm_campaign",
    "original_utm_content",
    "original_utm_term",
    "original_landing_page",
    "original_click_id",
    "original_click_id_type",
    "lead_product_interest",
    "estimated_quantity",
    "lead_quality_reason",
    "pmos_lead_id",
    "pmos_qualified_at",
  ])
    if (!names.has(name)) throw new Error("MAPPING_INVALID");
  for (const name of ["pmos_lead_id", "estimated_quantity", "required_by_date"])
    if (!dealNames.has(name)) throw new Error("MAPPING_INVALID");
  validated = {
    portal,
    until: Date.now() + 60000,
    currency: account.companyCurrency,
    dealCurrency: dealNames.has("deal_currency_code"),
  };
  return validated;
}
function withCurrency(kind: Kind, record: z.infer<typeof recordSchema>) {
  if (kind === "deals" && validated && !validated.dealCurrency)
    record.properties.deal_currency_code = validated.currency;
  return record;
}
