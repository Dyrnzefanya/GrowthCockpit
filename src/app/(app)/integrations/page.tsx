import Link from "next/link";
import {
  PageHeader,
  SectionCard,
  IntegrationHealthCard,
} from "@/components/operational";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { EmptyState } from "@/components/states";
import {
  IntegrationControl,
  RunTable,
} from "@/components/integration-controls";
import { integrationModel } from "@/services/integration-health";
import { jakartaDateTime } from "@/domain/dates";
import { HubspotHealth } from "@/components/hubspot-health";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const m = await integrationModel(await searchParams);
  const date = (v: string | null) =>
    v ? jakartaDateTime(new Date(v)) : "Belum ada";
  const href = (page: number) =>
    "/integrations?" +
    new URLSearchParams({
      page: String(page),
      ...(m.filters.status ? { status: m.filters.status } : {}),
      ...(m.filters.trigger ? { trigger: m.filters.trigger } : {}),
    });
  return (
    <>
      <Toaster />
      <PageHeader
        title="Integrations"
        description="Penerimaan inquiry, eksekusi job, dan pemulihan yang dapat ditelusuri."
      />
      <div className="space-y-5">
        <HubspotHealth />
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <IntegrationHealthCard
            name="Landing page · Apps Script"
            status={m.ingestConfigured ? "info" : "not_configured"}
          >
            <div className="space-y-2 p-5 text-sm">
              <p>
                {m.ingestConfigured
                  ? "Endpoint signed ingest dikonfigurasi. Riwayat di bawah menunjukkan penerimaan sebenarnya."
                  : "Sumber belum dikonfigurasi. Daftarkan signing secret pada backend Apps Script dan server PM OS."}
              </p>
              <p>WhatsApp gateway, Meta, dan Slack belum terhubung.</p>
            </div>
          </IntegrationHealthCard>
          <IntegrationHealthCard name="JOB-RETRY-EVENTS" status={m.health}>
            <div className="space-y-2 p-5 text-sm">
              <p>
                Target cadence: setiap 10 menit.{" "}
                {m.configured
                  ? "Verifikasi scheduler melalui waktu eksekusi."
                  : "Scheduler belum aktif; tidak ada asumsi paket Vercel Pro."}
              </p>
              <p>Last run: {date(m.last?.started_at ?? null)}</p>
              <p>Last success: {date(m.lastSuccess)}</p>
              <IntegrationControl />
            </div>
          </IntegrationHealthCard>
        </div>
        {m.criticalCandidates > 0 && (
          <p role="status" className="rounded border p-3 text-sm">
            {m.criticalCandidates} kondisi membutuhkan perhatian: dead letter
            atau kegagalan job berulang. Pengiriman alert tersedia mulai Phase
            9.
          </p>
        )}
        <SectionCard
          title="Riwayat eksekusi"
          description="Payload dan identitas kontak tidak ditampilkan di log."
        >
          <form className="flex flex-wrap items-end gap-3 border-b p-5">
            <label className="field">
              Status
              <select
                name="status"
                className="native-control"
                defaultValue={m.filters.status ?? ""}
              >
                <option value="">Semua</option>
                {["running", "success", "partial", "failed"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Trigger
              <select
                name="trigger"
                className="native-control"
                defaultValue={m.filters.trigger ?? ""}
              >
                <option value="">Semua</option>
                {["manual", "schedule", "webhook"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <Button type="submit" variant="outline">
              Filter runs
            </Button>
          </form>
          <RunTable rows={m.runs} total={m.total} page={m.filters.page} />
        </SectionCard>
        <SectionCard
          title="Dead letters"
          description="Retry manual hanya untuk event terautentikasi yang telah kehabisan percobaan."
        >
          {m.dead.length ? (
            <ul className="divide-y">
              {m.dead.map((e) => (
                <li key={e.id} className="space-y-2 break-all p-5 text-sm">
                  <p>
                    {e.source} · {e.attempts} attempts · {e.last_error}
                  </p>
                  <p>Correlation: {e.correlation_id}</p>
                  <IntegrationControl id={e.id} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Tidak ada dead letter"
              description="Event yang kehabisan percobaan akan muncul di sini; ini bukan bukti bahwa sumber sudah terhubung."
            />
          )}
        </SectionCard>
        <SectionCard
          title="Permintaan ditolak"
          description="Alasan dan correlation ID disimpan; payload/PII tidak ditampilkan."
        >
          {m.rejected.length ? (
            <ul className="divide-y">
              {m.rejected.map((e) => (
                <li className="space-y-1 break-all p-5 text-sm" key={e.id}>
                  <p>
                    {date(e.received_at)} · {e.last_error}
                  </p>
                  <p>Correlation: {e.correlation_id}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Tidak ada permintaan ditolak"
              description="Request tidak valid akan tercatat di sini tanpa mengungkap identitas kontak."
            />
          )}
        </SectionCard>
        <nav
          aria-label="Halaman integration logs"
          className="flex gap-4 text-sm text-primary"
        >
          {m.filters.page > 0 && (
            <Link href={href(m.filters.page - 1)}>Sebelumnya</Link>
          )}
          {(m.filters.page + 1) * 20 <
            Math.max(m.total, m.deadTotal, m.rejectedTotal) && (
            <Link href={href(m.filters.page + 1)}>Berikutnya</Link>
          )}
        </nav>
      </div>
    </>
  );
}
