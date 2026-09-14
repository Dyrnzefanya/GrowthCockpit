import {
  PageHeader,
  SectionCard,
  IntegrationHealthCard,
} from "@/components/operational";
import { HubspotForm } from "@/components/hubspot-forms";
import { RunTable } from "@/components/integration-controls";
import { hubspotModel } from "@/services/hubspot-health";
import { jakartaDateTime } from "@/domain/dates";
export default async function Page() {
  const m = await hubspotModel();
  return (
    <>
      <PageHeader
        title="HubSpot CRM"
        description="CRM lifecycle dan outcome dimirror; qualification inquiry dan attribution tetap milik PM OS."
      />
      <div className="space-y-5">
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <IntegrationHealthCard name="HubSpot" status={m.health}>
            <div className="space-y-3 p-5 text-sm">
              <p>
                {m.configured
                  ? "Mapping tersedia. Riwayat sync menunjukkan koneksi sebenarnya."
                  : "HubSpot belum dikonfigurasi atau mapping invalid. Sync tidak dijalankan dengan tebakan."}
              </p>
              <p>
                Lifecycle write-back:{" "}
                {m.writeLifecycle ? "Enabled" : "Disabled"}
              </p>
              <p>
                Target reconcile: 30 menit. Jadwal terpasang harus diverifikasi.
              </p>
              {!m.mapping && (
                <p role="alert">
                  CRITICAL candidate: mapping belum tersedia atau invalid.
                </p>
              )}
            </div>
          </IntegrationHealthCard>
          <SectionCard title="Re-sync terbatas">
            <HubspotForm />
          </SectionCard>
        </div>
        <SectionCard title="Cursor dan kondisi mapping">
          <ul className="divide-y">
            {m.states.length ? (
              m.states.map((s) => (
                <li key={s.id} className="space-y-2 break-all p-5 text-sm">
                  <p>
                    {s.resource} · Last success:{" "}
                    {s.last_success_at
                      ? jakartaDateTime(new Date(s.last_success_at))
                      : "Belum ada"}
                  </p>
                  <p>Cursor: {s.cursor ?? "Belum ada"}</p>
                  <p role={s.last_error ? "alert" : undefined}>
                    {s.last_error
                      ? `${s.consecutive_failures >= 3 || s.resource === "configuration" ? "CRITICAL" : "WARNING"}: ${s.last_error}`
                      : "Tidak ada masalah tercatat"}
                  </p>
                </li>
              ))
            ) : (
              <li className="p-5 text-sm">
                Belum ada riwayat sinkronisasi. Ini bukan bukti koneksi
                berhasil.
              </li>
            )}
          </ul>
        </SectionCard>
        <SectionCard title="20 eksekusi terbaru">
          <RunTable rows={m.runs} total={m.runs.length} page={0} />
        </SectionCard>
      </div>
    </>
  );
}
