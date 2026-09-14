import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { after } from "next/server";
import { ingestSchema, idempotencyKeySchema } from "@/config/ingest-schema";
import { boundedBody, verifySignature } from "@/lib/http/hmac";
import { insertOrReturn } from "@/lib/http/idempotency";
import { serverEnv } from "@/lib/env.server";
import { ingestLead } from "@/services/leads";
import * as repository from "@/repositories/integrations";
import { errorCode, retryOutcome } from "@/domain/integrations";
import type { Json } from "@/types/database.generated";

export function safeResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export async function receiveLead(request: Request) {
  const correlation = randomUUID(),
    id = randomUUID(),
    started = Date.now();
  let authenticated = false,
    payload: Json = null,
    key: string | null = null;
  const reject = async (code: string, status: number, fields?: unknown) => {
    await insertOrReturn({
      id,
      source: "landing_page",
      idempotency_key: null,
      signature_valid: authenticated,
      payload,
      status: "rejected",
      last_error: code,
      correlation_id: correlation,
      result: { status: "rejected", code },
    });
    return safeResponse(
      { code, correlation_id: correlation, ...(fields ? { fields } : {}) },
      status,
    );
  };
  try {
    if (!serverEnv.INGEST_HMAC_SECRET)
      return safeResponse({ code: "NOT_CONFIGURED" }, 503);
    let raw: Buffer;
    try {
      raw = await boundedBody(request);
    } catch (e) {
      const code =
        e instanceof Error &&
        ["CONTENT_TYPE", "PAYLOAD_TOO_LARGE"].includes(e.message)
          ? e.message
          : "INTERNAL";
      return await reject(
        code,
        code === "CONTENT_TYPE"
          ? 415
          : code === "PAYLOAD_TOO_LARGE"
            ? 413
            : 503,
      );
    }
    authenticated = verifySignature(
      request.headers.get("x-signature") ?? "",
      request.headers.get("x-timestamp") ?? "",
      request.method,
      new URL(request.url).pathname,
      raw,
      [
        serverEnv.INGEST_HMAC_SECRET,
        serverEnv.INGEST_HMAC_SECRET_PREVIOUS,
      ].filter((v): v is string => Boolean(v)),
    );
    if (!authenticated) return await reject("UNAUTHENTICATED", 401);
    const parsedKey = idempotencyKeySchema.safeParse(
      request.headers.get("idempotency-key"),
    );
    if (!parsedKey.success)
      return await reject("VALIDATION_FAILED", 400, ["Idempotency-Key"]);
    key = parsedKey.data;
    try {
      payload = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(raw),
      ) as Json;
    } catch {
      payload = raw.toString("utf8");
      return await reject("VALIDATION_FAILED", 400, ["body"]);
    }
    const parsed = ingestSchema.safeParse(payload);
    const requestHash = createHash("sha256")
      .update(`${request.headers.get("x-timestamp")}.POST./api/ingest/lead.`)
      .update(raw)
      .digest("hex");
    const accepted = await insertOrReturn({
      id,
      source: "landing_page",
      idempotency_key: key,
      request_hash: requestHash,
      signature_valid: true,
      payload,
      status: parsed.success ? "received" : "rejected",
      last_error: parsed.success ? null : "VALIDATION_FAILED",
      correlation_id: correlation,
      result: parsed.success
        ? { event_id: id, status: "received" }
        : {
            event_id: id,
            status: "rejected",
            code: "VALIDATION_FAILED",
            fields: parsed.error.issues.map((i) => i.path.join(".")),
          },
    });
    if (!accepted.inserted)
      return safeResponse({
        ...(accepted.event.result as object),
        replayed: true,
        correlation_id: accepted.event.correlation_id,
      });
    if (!parsed.success)
      return safeResponse(
        { ...(accepted.event.result as object), correlation_id: correlation },
        400,
      );
    after(async () => {
      try {
        const { values } = await repository.machineSettings();
        await processNext(
          id,
          "webhook",
          Math.min(values["jobs.max_attempts"], 100),
        );
      } catch (e) {
        console.warn(
          JSON.stringify({
            correlation_id: correlation,
            route: "/api/ingest/lead",
            outcome: errorCode(e),
          }),
        );
      }
    });
    return safeResponse(
      { ...(accepted.event.result as object), correlation_id: correlation },
      202,
    );
  } catch (e) {
    return safeResponse(
      { code: errorCode(e), correlation_id: correlation },
      503,
    );
  } finally {
    console.info(
      JSON.stringify({
        correlation_id: correlation,
        route: "/api/ingest/lead",
        duration_ms: Date.now() - started,
        outcome: authenticated ? "authenticated" : "unauthenticated",
      }),
    );
  }
}
export async function processNext(
  id: string | null,
  trigger: "manual" | "webhook" | "schedule",
  max: number,
) {
  const event = await repository.claim(id, trigger, max);
  if (!event) return null;
  if ("exhausted" in event) {
    await (
      await import("@/services/alerts")
    ).safelyRaise({
      type: "dead_letter",
      source: "integration",
      entityType: "webhook_event",
      entityId: event.id,
      keyParts: [event.id],
      evidence: { event_id: event.id, reason_code: "ATTEMPTS_EXHAUSTED" },
    });
    return { id: event.id, written: 0, failed: 1 };
  }
  try {
    if (
      ["hubspot", "hubspot_writeback", "hubspot_range"].includes(event.source)
    ) {
      const sync = await import("@/services/crm-sync");
      let written = 1;
      if (event.source === "hubspot")
        written = Number(
          (await sync.processHubspotEvent(event.payload, {
            id: event.id,
            claim: event.claim_id!,
          })) > 0,
        );
      else if (event.source === "hubspot_range")
        await sync.processHubspotRange(event.payload, {
          id: event.id,
          claim: event.claim_id!,
        });
      else
        await sync.writebackLead(event.payload, {
          id: event.id,
          claim: event.claim_id!,
        });
      return { id: event.id, written, failed: 0 };
    }
    const input = ingestSchema.safeParse(event.payload);
    if (!input.success) throw new Error("VALIDATION_FAILED");
    const outcome = await ingestLead(input.data, {
      id: event.id,
      claim: event.claim_id!,
    });
    return {
      id: event.id,
      written: outcome.status === "created" ? 1 : 0,
      failed: 0,
    };
  } catch (e) {
    const code = errorCode(e),
      next = retryOutcome(code, event.attempts, max, Date.now(), Math.random());
    await repository.finishEvent(event, next.status, code, next.next, {
      event_id: event.id,
      status: next.status,
      code,
    });
    if (next.status === "dead_letter")
      await (
        await import("@/services/alerts")
      ).safelyRaise({
        type: "dead_letter",
        source: event.source,
        entityType: "webhook_event",
        entityId: event.id,
        keyParts: [event.id],
        evidence: {
          event_id: event.id,
          integration: event.source,
          reason_code: code,
        },
      });
    return { id: event.id, written: 0, failed: 1 };
  }
}
