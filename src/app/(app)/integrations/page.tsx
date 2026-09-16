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
import { MetaHealth } from "@/components/meta-health";
import { StatusBadge } from "@/components/status-badge";
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
        <MetaHealth />
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <IntegrationHealthCard
            name="Landing page · Apps Script"
            status={m.ingest.status}
          >
            <div className="space-y-2 p-5 text-sm">
              <p>
                {m.ingestConfigured
                  ? "Endpoint signed ingest dikonfigurasi. Riwayat di bawah menunjukkan penerimaan sebenarnya."
                  : "Sumber belum dikonfigurasi. Daftarkan signing secret pada backend Apps Script dan server PM OS."}
              </p>
              <p>SLA: diproses saat diterima; retry setiap 10 menit.</p>
              <p>
                Last run / success: {date(m.ingest.lastRun)} /{" "}
                {date(m.ingest.lastSuccess)}
              </p>
              <p>
                Consecutive failures / recent error: {m.ingest.failures} /{" "}
                {m.ingest.error ?? "Tidak ada"}
              </p>
              <p>WhatsApp gateway belum terhubung.</p>
              <IntegrationControl
                job="JOB-RETRY-EVENTS"
                label="Process / retry now"
              />
            </div>
          </IntegrationHealthCard>
          <IntegrationHealthCard name="Slack alerts" status={m.slack.status}>
            <div className="space-y-3 p-5 text-sm">
              <p>
                {m.slackConfigured
                  ? "Incoming Webhook server-side tersedia. Delivery aktual tercatat pada alert."
                  : "Webhook Slack belum dikonfigurasi. Alert in-app tetap tersedia."}
              </p>
              <p>SLA: dispatch setiap 5 menit.</p>
              <p>
                Last run / success: {date(m.slack.lastRun)} /{" "}
                {date(m.slack.lastSuccess)}
              </p>
              <p>
                Consecutive failures / recent error: {m.slack.failures} /{" "}
                {m.slack.error ?? "Tidak ada"}
              </p>
              <IntegrationControl
                job="JOB-NOTIFY-DISPATCH"
                label="Dispatch now"
              />
            </div>
          </IntegrationHealthCard>
        </div>
        <SectionCard
          title="Job health"
          description="SLA, eksekusi terakhir, kegagalan beruntun, dan tindakan manual untuk setiap job terdaftar. Jadwal produksi memerlukan scheduler aktif."
        >
          <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
            {m.jobHealth.map((job) => (
              <article className="space-y-3 bg-card p-5 text-sm" key={job.key}>
                <div className="flex items-start justify-between gap-3">
                  <h3>{job.label}</h3>
                  <StatusBadge status={job.health} />
                </div>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-muted-foreground">Job / schedule</dt>
                    <dd className="break-all">
                      {job.key} · {job.schedule}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">SLA</dt>
                    <dd>
                      {job.cadenceMinutes === null
                        ? "Setiap hari kerja setelah 08:00 WIB"
                        : `${job.cadenceMinutes} menit`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      Last run / success
                    </dt>
                    <dd>
                      {date(job.lastRun)} / {date(job.lastSuccess)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      Consecutive failures / recent error
                    </dt>
                    <dd className="break-all">
                      {job.failures} / {job.error ?? "Tidak ada"}
                    </dd>
                  </div>
                </dl>
                <IntegrationControl job={job.key} label="Run now" />
              </article>
            ))}
          </div>
        </SectionCard>
        {m.criticalCandidates > 0 && (
          <p role="status" className="rounded border p-3 text-sm">
            {m.criticalCandidates} kondisi membutuhkan perhatian: dead letter
            atau kegagalan job berulang. Tinjau alert pada halaman Today.
          </p>
        )}
        <SectionCard
          title="Notification volume"
          description="Alert yang disertakan dalam delivery Slack per tanggal bisnis dan tipe; satu digest dapat mewakili beberapa alert."
        >
          {m.volume.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3" scope="col">
                      Tanggal · WIB
                    </th>
                    <th className="px-5 py-3" scope="col">
                      Alert type
                    </th>
                    <th className="px-5 py-3 text-right" scope="col">
                      Delivered alerts
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {m.volume.map((row) => (
                    <tr key={`${row.business_date}-${row.type}`}>
                      <td className="px-5 py-3">{row.business_date}</td>
                      <td className="px-5 py-3">
                        {row.type.replaceAll("_", " ")}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {row.notifications}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Belum ada delivery Slack"
              description="Panel hanya menampilkan delivery yang benar-benar berhasil; konfigurasi tidak dianggap sebagai bukti pengiriman."
            />
          )}
        </SectionCard>
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
