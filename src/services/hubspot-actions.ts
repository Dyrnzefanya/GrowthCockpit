"use server";
import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/services/session";
import { can } from "@/lib/auth/can";
import { saveMapping, configuration } from "@/repositories/hubspot";
import { accept } from "@/repositories/integrations";
import { kindSchema, providerId } from "@/integrations/hubspot/mapping";
import { serverEnv } from "@/lib/env.server";
import { runJob } from "@/services/jobs/runner";
export async function hubspotAction(
  _previous: { message: string },
  form: FormData,
) {
  await requireUser();
  if (!(await can("integration:write"))) return { message: "Akses ditolak." };
  try {
    if (form.get("operation") === "mapping") {
      if (!(await can("settings:update"))) return { message: "Akses ditolak." };
      const json = z.string().max(30000).parse(form.get("mapping"));
      await saveMapping(JSON.parse(json));
      revalidatePath("/settings");
      revalidatePath("/integrations/hubspot");
      return { message: "Mapping tersimpan dengan audit operator." };
    }
    const config = await configuration();
    if (!config.mapping || !serverEnv.HUBSPOT_ACCESS_TOKEN)
      return {
        message:
          "HubSpot belum dikonfigurasi. Tidak ada sinkronisasi dijalankan.",
      };
    if (form.get("operation") === "run") {
      const run = await runJob("JOB-HUBSPOT-RECONCILE", "manual");
      revalidatePath("/integrations/hubspot");
      return { message: `Reconcile: ${run.status}.` };
    }
    const kind = kindSchema.parse(form.get("kind"));
    const recordId = form.get("recordId");
    if (typeof recordId === "string" && recordId.trim()) {
      const id = providerId.parse(recordId.trim());
      await accept({
        id: randomUUID(),
        source: "hubspot",
        signature_valid: true,
        payload: { kind, id, force: true },
        status: "received",
        correlation_id: randomUUID(),
        result: { status: "received" },
      });
    } else {
      const from = z.iso.date().parse(form.get("from")),
        to = z.iso.date().parse(form.get("to"));
      if (from > to) throw new Error("VALIDATION_FAILED");
      const payload = {
        kind,
        from: Date.parse(from + "T00:00:00+07:00"),
        to: Date.parse(to + "T23:59:59.999+07:00"),
      };
      await accept({
        id: randomUUID(),
        source: "hubspot_range",
        signature_valid: true,
        idempotency_key:
          "hs-range:" +
          createHash("sha256")
            .update(JSON.stringify(payload) + randomUUID())
            .digest("hex"),
        payload,
        status: "received",
        correlation_id: randomUUID(),
        result: { status: "received" },
      });
    }
    revalidatePath("/integrations/hubspot");
    return {
      message:
        "Re-sync masuk antrean. Jalankan retry job atau tunggu scheduler.",
    };
  } catch {
    return {
      message:
        "Permintaan gagal atau mapping tidak valid. Periksa format dan konfigurasi; tidak ada nilai tebakan yang diterapkan.",
    };
  }
}
