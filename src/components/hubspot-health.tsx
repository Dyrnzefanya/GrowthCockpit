import Link from "next/link";
import { IntegrationHealthCard } from "@/components/operational";
import { hubspotModel } from "@/services/hubspot-health";
import { jakartaDateTime } from "@/domain/dates";
export async function HubspotHealth() {
  const m = await hubspotModel();
  const date = (value: string | null) =>
    value ? jakartaDateTime(new Date(value)) : "Belum ada";
  return (
    <IntegrationHealthCard name="HubSpot CRM" status={m.health}>
      <div className="space-y-2 p-5 text-sm">
        <p>
          {m.configured
            ? "CRM mirror dan kondisi sinkronisasi tersedia."
            : "Belum terhubung; token dan mapping harus dikonfigurasi."}
        </p>
        <p>SLA: 30 menit.</p>
        <p>
          Last run / success: {date(m.lastRun)} / {date(m.lastSuccess)}
        </p>
        <p>
          Consecutive failures / recent error: {m.failures} /{" "}
          {m.error ?? "Tidak ada"}
        </p>
        <Link className="text-primary underline" href="/integrations/hubspot">
          Status, mapping dan re-sync HubSpot
        </Link>
      </div>
    </IntegrationHealthCard>
  );
}
