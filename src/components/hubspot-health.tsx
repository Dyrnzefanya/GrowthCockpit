import Link from "next/link";
import { IntegrationHealthCard } from "@/components/operational";
import { hubspotModel } from "@/services/hubspot-health";
export async function HubspotHealth() {
  const m = await hubspotModel();
  return (
    <IntegrationHealthCard name="HubSpot CRM" status={m.health}>
      <div className="space-y-2 p-5 text-sm">
        <p>
          {m.configured
            ? "CRM mirror dan kondisi sinkronisasi tersedia."
            : "Belum terhubung; token dan mapping harus dikonfigurasi."}
        </p>
        <Link className="text-primary underline" href="/integrations/hubspot">
          Status, mapping dan re-sync HubSpot
        </Link>
      </div>
    </IntegrationHealthCard>
  );
}
