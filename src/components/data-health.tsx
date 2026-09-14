import Link from "next/link";
import { IntegrationHealthCard } from "@/components/operational";
import { integrationModel } from "@/services/integration-health";
import { jakartaDateTime } from "@/domain/dates";
import { HubspotHealth } from "@/components/hubspot-health";
export async function DataHealth() {
  let model;
  try {
    model = await integrationModel();
  } catch {
    return (
      <p role="status">
        Data health belum dapat dimuat.{" "}
        <Link href="/integrations" className="text-primary underline">
          Periksa integrasi
        </Link>
      </p>
    );
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <HubspotHealth />
      <IntegrationHealthCard
        name="Data health · retry queue"
        status={model.health}
      >
        <div className="space-y-2 p-5 text-sm">
          <p>
            Terakhir berhasil:{" "}
            {model.lastSuccess
              ? jakartaDateTime(new Date(model.lastSuccess))
              : "Belum ada eksekusi berhasil"}
          </p>
          <p>
            {model.configured
              ? "Cadence target 10 menit; lihat usia run untuk bukti scheduler."
              : "Scheduler belum dikonfigurasi. Eksekusi manual tersedia."}
          </p>
          <Link className="text-primary underline" href="/integrations">
            Lihat runs dan pemulihan event
          </Link>
        </div>
      </IntegrationHealthCard>
    </div>
  );
}
