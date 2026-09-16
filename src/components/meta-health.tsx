import { IntegrationHealthCard } from "@/components/operational";
import { metaHealthModel } from "@/services/meta-health";

import { metaApi } from "@/config/integrations";

import { IntegrationControl } from "@/components/integration-controls";
import { MetaControls } from "@/components/meta-controls";
import { jakartaDateTime } from "@/domain/dates";
export async function MetaHealth() {
  const data = await metaHealthModel();
  const configured = data.configured;
  return (
    <IntegrationHealthCard name="Meta Ads · read-only" status={data.health}>
      <div className="space-y-3 p-5 text-sm">
        <p>
          {configured
            ? "Konfigurasi server tersedia; riwayat ingest adalah bukti koneksi."
            : "Meta Ads belum terhubung. Konfigurasikan System User ads_read dan akun di server."}
        </p>
        <p>
          Graph {metaApi.version} · verified {metaApi.verifiedOn}. Target 06:00
          WIB.
        </p>
        {data.accounts.map((a, i) => (
          <p key={i}>
            {a.name} · {a.currency} · {a.timezone} ({a.offset})
            {a.timezone !== "Asia/Jakarta"
              ? " — berbeda dari WIB; tanggal tidak digeser"
              : ""}
          </p>
        ))}
        <p>SLA: {data.slaHours} jam.</p>
        <p>
          Last run / success:{" "}
          {data.lastRun ? jakartaDateTime(new Date(data.lastRun)) : "Belum ada"}
          {" / "}
          {data.lastSuccess
            ? jakartaDateTime(new Date(data.lastSuccess))
            : "Belum ada"}
        </p>
        <p>
          Consecutive failures / recent error: {data.failures} /{" "}
          {data.error ?? "Tidak ada"}
        </p>
        <p>
          Naming compliance:{" "}
          {data.namingCompliance === null
            ? "—"
            : `${(data.namingCompliance * 100).toFixed(1)}%`}{" "}
          · campaign yang diobservasi, bukan asumsi ad-level.
        </p>
        <p>
          Expiry token:{" "}
          {data.tokenVerified
            ? (data.expiry ?? "Provider melaporkan tanpa expiry")
            : "Belum diverifikasi"}
          .
        </p>
        {data.progress && (
          <p>
            Backfill {data.progress.from} ? {data.progress.to}:{" "}
            {data.progress.completedDays} hari selesai; lanjut dari{" "}
            {data.progress.date}. Rentang aktif tidak ditimpa.
          </p>
        )}
        <IntegrationControl
          job="JOB-META-INGEST"
          label="Lanjutkan / run ingest"
        />
        <MetaControls
          resultType={data.resultType}
          hasProgress={Boolean(data.progress)}
        />
      </div>
    </IntegrationHealthCard>
  );
}
