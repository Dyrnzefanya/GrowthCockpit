import Link from "next/link";
import { PageHeader, SectionCard } from "@/components/operational";
import { EmptyState } from "@/components/states";
import { funnelModel } from "@/services/funnel";
import { percent } from "@/domain/metrics/funnel";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const m = await funnelModel(await searchParams),
    t = m.totals;
  const href = (basis: string) =>
    "/funnel?" + new URLSearchParams({ from: m.from, to: m.to, basis });
  return (
    <>
      <PageHeader
        title="Funnel"
        description="Dari inquiry ke kualitas dan outcome. Perhitungan cohort dan aktivitas ditampilkan terpisah."
      />
      <nav className="mb-4 flex gap-4 text-sm" aria-label="Basis funnel">
        <Link
          className="text-primary underline"
          href={href("cohort")}
          aria-current={m.basis === "cohort" ? "page" : undefined}
        >
          Cohort
        </Link>
        <Link
          className="text-primary underline"
          href={href("activity")}
          aria-current={m.basis === "activity" ? "page" : undefined}
        >
          Activity
        </Link>
      </nav>
      <p className="mb-4 text-sm text-muted-foreground">
        {m.from} – {m.to} · Asia/Jakarta · scope: semua platform/campaign ·
        sumber: manual/import, tanpa sinkronisasi eksternal.
      </p>
      {m.basis === "activity" ? (
        <SectionCard
          title="Activity — peristiwa pada tanggal perubahan"
          description="Hitungan transisi stage, termasuk status awal. Bukan conversion rate cohort."
        >
          <div
            className="table-scroll"
            role="region"
            tabIndex={0}
            aria-label="Aktivitas stage"
          >
            <table>
              <caption className="sr-only">Transisi per tanggal WIB</caption>
              <thead>
                <tr>
                  <th>Tanggal WIB</th>
                  <th>Ke status</th>
                  <th>Sumber</th>
                  <th>Transisi</th>
                </tr>
              </thead>
              <tbody>
                {m.activity.map((r, index) => (
                  <tr key={index}>
                    <td>{r.event_date}</td>
                    <td>{r.to_status}</td>
                    <td>{r.source}</td>
                    <td>{r.transitions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!m.activity.length && (
              <EmptyState
                title="Belum ada aktivitas"
                description="Perubahan stage dalam periode ini akan muncul di sini."
              />
            )}
          </div>
        </SectionCard>
      ) : (
        <div className="space-y-5">
          <SectionCard
            title="Cohort — tanggal inquiry diperoleh"
            description={
              "Outcome saat ini dihitung kembali pada tanggal akuisisi. Maturity window: " +
              m.maturity +
              " hari."
            }
          >
            <div className="p-5">
              <p className="mb-4 text-sm text-muted-foreground">
                {t.immature
                  ? "Cohort mencakup inquiry yang belum matang; jangan menyimpulkan performa dari cohort ini."
                  : "Semua cohort dalam hasil telah melewati jendela maturity."}{" "}
                {m.smallSample
                  ? "Sampel kecil; angka bukan rekomendasi optimasi."
                  : ""}
              </p>
              {!t.leads ? (
                <EmptyState
                  title="Belum ada inquiry dalam periode ini"
                  description="Tambahkan inquiry manual atau import CSV untuk melihat funnel."
                />
              ) : (
                <table className="w-full text-sm">
                  <caption className="sr-only">Jumlah tahap cohort</caption>
                  <thead>
                    <tr>
                      <th className="text-left">Tahap</th>
                      <th className="text-right">Jumlah</th>
                      <th className="sr-only">Proporsi terhadap inquiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.stages.map((s) => (
                      <tr key={s.label}>
                        <th scope="row" className="py-3 text-left font-medium">
                          {s.label}
                        </th>
                        <td className="px-3 text-right tabular-nums">
                          {s.count}
                        </td>
                        <td className="w-1/3">
                          <div className="h-2 bg-muted" aria-hidden="true">
                            <div
                              className="h-full bg-primary"
                              style={{ width: Math.min(s.width, 100) + "%" }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                {m.rates.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-medium tabular-nums">{value}</dd>
                  </div>
                ))}
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Revenue won (cohort)
                  </dt>
                  <dd>
                    {t.revenue
                      ? t.revenue.currency + " " + t.revenue.amount
                      : "— · mata uang campuran atau nilai belum lengkap"}
                  </dd>
                </div>
              </dl>
            </div>
          </SectionCard>
          <SectionCard
            title="Kualitas lead per campaign"
            description="Cohort yang sama; campaign kosong tetap disertakan agar gap atribusi terlihat."
          >
            <div
              className="table-scroll"
              role="region"
              tabIndex={0}
              aria-label="Kualitas per campaign"
            >
              <table>
                <caption className="sr-only">
                  Kualitas campaign berdasarkan cohort
                </caption>
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Campaign</th>
                    <th>Inquiry</th>
                    <th>MQL</th>
                    <th>SQL</th>
                    <th>MQL rate</th>
                    <th>Deal</th>
                    <th>Won</th>
                  </tr>
                </thead>
                <tbody>
                  {m.campaigns.map((c) => (
                    <tr key={c.key}>
                      <td>{c.platform}</td>
                      <td className="max-w-64 break-words">
                        {c.campaign ?? "Belum teratribusi"}
                      </td>
                      <td>{c.leads}</td>
                      <td>{c.mql}</td>
                      <td>{c.sql}</td>
                      <td>{percent(c.mqlRate)}</td>
                      <td>{c.deals}</td>
                      <td>{c.won}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}
      <nav
        aria-label="Halaman tabel funnel"
        className="flex items-center gap-4 py-4 text-sm"
      >
        <span>
          {m.totalRows} baris · Halaman {m.page + 1}
        </span>
        {m.page > 0 && (
          <Link
            className="text-primary underline"
            href={href(m.basis) + "&page=" + (m.page - 1)}
          >
            Sebelumnya
          </Link>
        )}
        {(m.page + 1) * 20 < m.totalRows && (
          <Link
            className="text-primary underline"
            href={href(m.basis) + "&page=" + (m.page + 1)}
          >
            Berikutnya
          </Link>
        )}
      </nav>
      <SectionCard
        className="mt-5"
        title="Metrik biaya belum tersedia"
        description="Data spend belum terhubung (Phase 10). Nilai kosong bukan nol."
      >
        <dl className="grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-5">
          {["CPL", "CPQL", "CPSQL", "CAC", "ROAS"].map((label) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd title="Tidak tersedia: belum ada data spend">—</dd>
            </div>
          ))}
        </dl>
      </SectionCard>
    </>
  );
}
