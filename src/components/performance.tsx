import Link from "next/link";
import { PageHeader, SectionCard, MetricCard } from "@/components/operational";
import { PerformanceTable } from "@/components/performance-table";
import { formatMetric } from "@/domain/metrics/performance";
import { Button } from "@/components/ui/button";
import type { performanceModel } from "@/services/performance";
type Model = Awaited<ReturnType<typeof performanceModel>>;
export function Performance({ m }: { m: Model }) {
  return (
    <>
      <PageHeader
        title="Performance"
        description="Biaya media, kualitas inquiry, dan pipeline dengan rekonsiliasi yang terlihat."
        actions={
          <Button asChild variant="outline">
            <Link href="/integrations">Ingest & health</Link>
          </Button>
        }
      />
      <div className="space-y-5">
        {m.partial && (
          <p
            role="status"
            className="rounded border border-warning p-3 text-sm"
          >
            Ingest parsial atau gagal. Angka yang tersimpan belum mewakili
            seluruh rentang; lanjutkan ingest melalui Integrations.
          </p>
        )}
        {!m.configured && (
          <SectionCard title="Meta Ads belum terhubung" className="max-w-2xl">
            <p className="p-5 text-sm">
              Konfigurasikan akun dan token read-only di server melalui
              Integrations. Data tidak dibuat untuk mengisi dashboard.
            </p>
          </SectionCard>
        )}
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            Cohort inquiry · {m.from} – {m.to} · Asia/Jakarta. Spend mengikuti
            tanggal timezone akun:{" "}
            {m.current.zones.join(", ") || "belum tersedia"}.
          </p>
          <p>
            Periode sebelumnya: {m.previous.from} – {m.previous.to}. Tiga hari
            lookback dapat direstate oleh Meta.
          </p>
          <p title={m.current.freshness.oldest ?? "Belum ada data"}>
            Freshness: {m.current.freshness.status} · sumber tertua{" "}
            {m.current.freshness.ageHours ?? "—"} jam. Sample: {m.current.mql}{" "}
            MQL;{" "}
            {m.insufficientSample
              ? "insufficient sample"
              : "sample minimum terpenuhi; bukan rekomendasi tindakan"}
            .
          </p>
        </div>
        {m.current.mixed && (
          <p
            role="status"
            className="rounded border border-warning p-3 text-sm"
          >
            Currency berbeda: total gabungan dan revenue lintas currency tidak
            tersedia. Tidak ada konversi FX implisit.
          </p>
        )}
        {!m.current.aligned && m.current.zones.length > 0 && (
          <p role="status" className="rounded border p-3 text-sm">
            Timezone akun berbeda dari WIB. CPL/CPQL/CPSQL tidak dihitung lintas
            batas tanggal yang berbeda.
          </p>
        )}
        <section aria-label="Performance metrics">
          <h2 className="sr-only">KPI cohort · Meta</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {m.metrics.map((v) => (
              <MetricCard
                key={v.title}
                {...v}
                compact
                context={`Cohort · Meta · ${m.from} – ${m.to}`}
              />
            ))}
          </div>
        </section>
        <div className="grid items-start gap-5 xl:grid-cols-[2fr_1fr]">
          <SectionCard
            title="Spend trend"
            description="Harian pada timezone sumber; tanggal tanpa row bukan zero-spend."
          >
            <div className="p-5">
              {m.days.length === 0 ? (
                <p>Belum ada data iklan untuk rentang ini.</p>
              ) : (
                <>
                  {m.current.currencies.length === 1 &&
                    m.current.zones.length === 1 && (
                      <>
                        <svg
                          viewBox="0 0 600 150"
                          role="img"
                          aria-label="Tren spend harian; nilai lengkap ada pada tabel di bawah"
                          className="h-40 w-full text-primary"
                        >
                          <line
                            x1="20"
                            y1="130"
                            x2="580"
                            y2="130"
                            stroke="currentColor"
                            opacity="0.2"
                          />
                          {m.days.map((d, i) => {
                            const x =
                              20 +
                              ((Date.parse(d.metric_date) -
                                Date.parse(m.from)) /
                                Math.max(
                                  86400000,
                                  Date.parse(m.to) - Date.parse(m.from),
                                )) *
                                560;
                            const y =
                              130 -
                              (Number(d.spend) /
                                Math.max(
                                  1,
                                  ...m.days.map((v) => Number(v.spend)),
                                )) *
                                110;
                            const previous = m.days[i - 1];
                            const contiguous =
                              previous &&
                              Date.parse(d.metric_date) -
                                Date.parse(previous.metric_date) ===
                                86400000;
                            return (
                              <g key={d.metric_date}>
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="3"
                                  fill="currentColor"
                                />
                                <title>
                                  {`${d.metric_date}: ${formatMetric(d.spend, d.currency)}`}
                                </title>
                                {contiguous && (
                                  <line
                                    x1={
                                      20 +
                                      ((Date.parse(previous.metric_date) -
                                        Date.parse(m.from)) /
                                        Math.max(
                                          86400000,
                                          Date.parse(m.to) - Date.parse(m.from),
                                        )) *
                                        560
                                    }
                                    y1={
                                      130 -
                                      (Number(previous.spend) /
                                        Math.max(
                                          1,
                                          ...m.days.map((v) => Number(v.spend)),
                                        )) *
                                        110
                                    }
                                    x2={x}
                                    y2={y}
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  />
                                )}
                              </g>
                            );
                          })}
                        </svg>
                        <div className="mb-3 flex justify-between gap-3 text-xs text-muted-foreground">
                          <span>{m.from}</span>
                          <span>{m.to}</span>
                        </div>
                      </>
                    )}
                  <details>
                    <summary className="cursor-pointer text-sm">
                      Nilai harian dan timezone
                    </summary>
                    <div className="max-h-64 overflow-auto">
                      <table className="w-full text-left text-sm">
                        <caption className="sr-only">Daily spend data</caption>
                        <thead>
                          <tr>
                            <th scope="col">Tanggal</th>
                            <th scope="col">Spend</th>
                            <th scope="col">Timezone</th>
                          </tr>
                        </thead>
                        <tbody>
                          {m.days.map((d, i) => (
                            <tr key={i}>
                              <td>{d.metric_date}</td>
                              <td className="tabular-nums">
                                {formatMetric(d.spend, d.currency)}
                              </td>
                              <td>{d.source_timezone}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </>
              )}
            </div>
          </SectionCard>
          <SectionCard
            title="Funnel cohort"
            description="Inquiry PM OS, bukan conversions yang dilaporkan Meta."
          >
            <dl className="space-y-3 p-5 text-sm">
              {[
                ["Joined inquiry", m.current.joinedLeads],
                ["MQL termasuk SQL", m.current.mql],
                ["SQL", m.current.sql],
                ["Opportunities", m.current.opportunities],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt>{label}</dt>
                  <dd className="tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="px-5 pb-5 text-xs text-muted-foreground">
              CRM outcome dapat berubah ketika cohort matang.{" "}
              <Link className="underline" href="/funnel">
                Buka cohort / activity funnel
              </Link>
              .
            </p>
          </SectionCard>
        </div>
        <SectionCard
          title="Reconciliation"
          description="Atribusi yang tidak dapat dijoin tetap terlihat."
        >
          <dl className="grid gap-4 p-5 text-sm sm:grid-cols-3">
            <div>
              <dt>Spend tanpa inquiry cocok</dt>
              <dd className="font-semibold tabular-nums">
                {formatMetric(m.current.unjoinedSpend, m.current.currencies[0])}
              </dd>
            </div>
            <div>
              <dt>Inquiry tidak terjoin</dt>
              <dd>
                {m.current.unattributedLeads} dari {m.current.totalLeads}
              </dd>
            </div>
            <div>
              <dt>Won tanpa alokasi teresolusi</dt>
              <dd>{m.current.unallocatedWon}</dd>
            </div>
          </dl>
          <p className="px-5 pb-5 text-xs text-muted-foreground">
            ID campaign diprioritaskan; nama hanya jika unik. Inquiry platform
            unknown tidak dianggap sebagai hasil Meta. CPL bersifat diagnostik;
            CPQL menggunakan MQL inquiry yang terjoin.
          </p>
          {m.current.revenueRows.map((r) => (
            <p className="px-5 pb-3 text-sm" key={r.currency}>
              Won revenue · {r.currency}: {formatMetric(r.amount, r.currency)}
            </p>
          ))}
        </SectionCard>
        <SectionCard
          title="Campaign performance"
          description="Server pagination, perbandingan periode, sort dan pilihan kolom."
        >
          <form className="flex flex-wrap items-end gap-3 p-5">
            <input type="hidden" name="from" value={m.from} />
            <input type="hidden" name="to" value={m.to} />
            <label className="space-y-1 text-sm">
              <span className="block">Cari campaign</span>
              <input
                name="q"
                defaultValue={m.q}
                className="h-10 rounded border bg-background px-3"
              />
            </label>
            <Button variant="outline">Filter</Button>
          </form>
          <PerformanceTable rows={m.rows} total={m.total} page={m.page} />
        </SectionCard>
      </div>
    </>
  );
}
