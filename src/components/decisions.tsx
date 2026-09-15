import Link from "next/link";
import { SectionCard } from "@/components/operational";
import { EmptyState } from "@/components/states";
import { StatusBadge, type Status } from "@/components/status-badge";
import {
  DecisionControls,
  ThresholdForm,
} from "@/components/decision-controls";
import {
  todayDecisions,
  dismissalCandidates,
  evidenceSchema,
} from "@/services/decisions";
import { history } from "@/repositories/decisions";
import { thresholdKeys } from "@/config/decision-schema";
import type { settingsDefaults } from "@/config/settings-schema";
import { z } from "zod";
const labels: Record<string, string> = {
  spend: "Spend · cohort matang",
  recentSpend: "Spend · 7 hari terkini",
  pipelineValue: "Nilai pipeline terkait",
  leads: "Leads",
  mql: "MQL",
  sql: "SQL",
  cpl: "CPL · diagnostik",
  cpql: "CPQL",
  mqlRate: "MQL rate",
  priorCpl: "CPL pembanding",
  priorCpql: "CPQL pembanding",
  priorMqlRate: "MQL rate pembanding",
  sample: "Ukuran sampel MQL",
  completeDays: "Hari lengkap · cohort matang",
  coverage: "Attribution coverage",
  outcomeCompleteness: "Outcome completeness",
  frequency: "Frequency · hari terakhir",
  ctr: "CTR",
  priorCtr: "CTR pembanding",
  noLeadHours: "Jam tanpa lead CRM",
  staleWorkdays: "Hari kerja tanpa update CRM",
  followUpSla: "SLA tindak lanjut",
  currency: "Currency",
  reviewDate: "Tanggal review",
};
const snapshotLabels: Record<string, string> = {
  from: "Periode terkini mulai",
  to: "Periode terkini akhir",
  previousFrom: "Pembanding mulai",
  previousTo: "Pembanding akhir",
  qualityFrom: "Cohort matang mulai",
  qualityTo: "Cohort matang akhir",
  qualityPreviousFrom: "Cohort pembanding mulai",
  qualityPreviousTo: "Cohort pembanding akhir",
  targetCpql: "Target CPQL",
  currency: "Currency",
  frequency: "Frequency threshold",
  minResults: "Minimum hasil",
  minCoverage: "Minimum coverage",
  minOutcome: "Minimum outcome completeness",
  maturityDays: "Kematangan cohort (hari)",
  cplRise: "Kenaikan CPL (fraksi)",
  cpqlFall: "Penurunan CPQL (fraksi)",
  qualityFall: "Penurunan MQL rate (fraksi)",
  ctrFall: "Penurunan CTR (fraksi)",
};
function Snapshot({ value }: { value: unknown }) {
  const parsed = z
    .record(z.string(), z.union([z.string(), z.number(), z.null()]))
    .safeParse(value);
  return parsed.success ? (
    <dl className="grid gap-2 sm:grid-cols-2">
      {Object.entries(parsed.data).map(([key, v]) => (
        <div key={key}>
          <dt className="text-muted-foreground">
            {snapshotLabels[key] ?? key}
          </dt>
          <dd>{v === null ? <span title="No data">—</span> : String(v)}</dd>
        </div>
      ))}
    </dl>
  ) : (
    <p>Snapshot tidak tersedia.</p>
  );
}
function Evidence({ value }: { value: unknown }) {
  const e = evidenceSchema.parse(value);
  const sources = z
    .array(
      z.object({
        name: z.string(),
        at: z.string().nullable(),
        slaHours: z.number(),
      }),
    )
    .safeParse(e.input.sources);
  return (
    <details className="rounded-md border p-3">
      <summary className="cursor-pointer font-medium">
        Bukti, periode dan batasan · {e.rule} / {e.version}
      </summary>
      <div className="mt-3 space-y-3 text-sm">
        <p>{e.condition}</p>
        <p>{e.action}</p>
        <p>
          Basis cohort; 7 hari lengkap dibanding 14 hari sebelumnya. Quality
          memakai cohort matang.
        </p>
        <dl className="grid gap-2 sm:grid-cols-2">
          {Object.entries(e.input)
            .filter(([key]) => labels[key])
            .map(([key, v]) => (
              <div key={key}>
                <dt className="text-muted-foreground">{labels[key]}</dt>
                <dd>
                  {v === null ? <span title="No data">—</span> : String(v)}
                </dd>
              </div>
            ))}
        </dl>
        <h4>Periode · Asia/Jakarta</h4>
        <Snapshot value={e.input.window} />
        <h4>Freshness sumber</h4>
        {sources.success && (
          <ul>
            {sources.data.map((s) => (
              <li key={s.name}>
                {s.name}: {s.at ?? "Tidak tersedia"} · SLA {s.slaHours} jam
              </li>
            ))}
          </ul>
        )}
        <h4>Threshold saat evaluasi</h4>
        <Snapshot value={e.settings} />
        <p>
          Confidence bergantung pada sampel MQL dan hari lengkap di atas. Sampel
          di bawah minimum memblokir SCALE/PAUSE; r1 tidak menghitung
          signifikansi statistik.
        </p>
        {e.precedence && <p>Prioritas aturan: {e.precedence}</p>}
        {e.snoozeOverride && (
          <p>
            Snooze dibuka kembali: severity atau bukti memburuk secara material.
          </p>
        )}
        <p>
          Rekomendasi advisory; tidak menjamin outcome dan tidak mengubah
          kampanye.
        </p>
        {e.limitations.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
    </details>
  );
}
export async function PriorityActions() {
  let model;
  try {
    model = await todayDecisions();
  } catch {
    return (
      <SectionCard title="Priority actions">
        <p role="alert" className="p-5">
          Evaluasi belum dapat dimuat. Muat ulang atau periksa{" "}
          <Link className="text-primary underline" href="/integrations">
            Integrations
          </Link>
          .
        </p>
      </SectionCard>
    );
  }
  return (
    <SectionCard
      title="Priority actions"
      description="Maksimum lima tindakan, diurutkan berdasarkan severity, recency dan impact."
    >
      <div className="space-y-4 p-5">
        {model.unconfigured && (
          <p
            role="status"
            className="rounded-md border bg-attention-soft p-3 text-attention"
          >
            Target CPQL belum dikonfigurasi. Evaluasi berbasis target
            (R-02/R-05) tidak tersedia; aturan lain tetap berjalan.{" "}
            <Link href="/settings" className="underline">
              Konfigurasi benchmark
            </Link>
            .
          </p>
        )}
        {model.suppressed.length > 0 && (
          <div
            role="alert"
            className="rounded-md border bg-attention-soft p-3 text-attention"
          >
            <p className="font-medium">
              Rekomendasi kampanye ditekan — perbaiki pengukuran.
            </p>
            <ul className="list-disc pl-5">
              {[...new Set(model.suppressed)].map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        {!model.items.length ? (
          <EmptyState
            title="Tidak ada tindakan prioritas yang tersedia"
            description="Evaluasi mungkin belum berjalan, kondisi tidak terpenuhi, atau tindakan sedang ditunda. Periksa riwayat evaluasi untuk alasan lengkap."
            action={
              <Link className="text-primary underline" href="/integrations">
                Periksa atau jalankan job evaluasi
              </Link>
            }
          />
        ) : (
          <ol className="space-y-5">
            {model.items.map((item, n) => {
              const e = item.evidence,
                scope = e.input;
              return (
                <li key={item.id} className="space-y-3 rounded-md border p-4">
                  <h3>
                    {n + 1}. {scope.label}
                  </h3>
                  <p className="text-sm font-medium">
                    {e.rule} / {e.version} ·{" "}
                    <StatusBadge
                      status={e.verdict.toLowerCase() as Status}
                      label={e.verdict}
                    />{" "}
                    · <StatusBadge status={item.severity} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Evaluasi:{" "}
                    {new Date(item.evaluatedAt).toLocaleString("id-ID", {
                      timeZone: "Asia/Jakarta",
                    })}{" "}
                    WIB
                  </p>
                  <p>{e.action}</p>
                  <details>
                    <summary
                      className="cursor-pointer text-xs"
                      title={`severity ${item.severityWeight} × recency ${item.recencyWeight.toFixed(3)} × impact ${item.impactWeight.toFixed(3)} × (1 − snooze ${item.snoozePenalty})`}
                    >
                      Score {item.score.toFixed(3)}
                    </summary>
                    <p className="text-xs">
                      Severity {item.severityWeight}; recency{" "}
                      {item.recencyWeight.toFixed(3)}; impact{" "}
                      {item.impactWeight.toFixed(3)}; snooze penalty{" "}
                      {item.snoozePenalty}. Impact yang tidak tersedia = 0;
                      tidak ada konversi currency.
                    </p>
                  </details>
                  <Evidence value={e} />
                  <nav className="flex flex-wrap gap-3 text-sm text-primary">
                    <Link
                      className="underline"
                      href={
                        scope.scope === "lead"
                          ? `/leads/${scope.id}`
                          : scope.scope === "experiment"
                            ? `/experiments/${scope.id}`
                            : scope.scope === "integration"
                              ? "/integrations"
                              : `/performance/meta?scope=${encodeURIComponent(scope.id)}`
                      }
                    >
                      Buka konteks
                    </Link>
                    <Link
                      className="underline"
                      href={`/experiments/new${scope.scope === "campaign" ? `?campaign_id=${encodeURIComponent(scope.id.split(":").slice(1).join(":"))}` : ""}`}
                    >
                      Catat eksperimen
                    </Link>
                    <Link
                      className="underline"
                      href={`/playbook/${["R-00", "R-06"].includes(e.rule) ? "checklist-qa-pelacakan" : e.rule === "R-03" || e.rule === "R-04" ? "diagnosis-cpl-meningkat" : "checklist-review-mingguan"}`}
                    >
                      Prosedur terkait
                    </Link>
                    {scope.experiments.map((x) => (
                      <Link
                        key={x.id}
                        className="underline"
                        href={`/experiments/${x.id}`}
                      >
                        {x.code} · {x.status}
                      </Link>
                    ))}
                  </nav>
                  <DecisionControls id={item.id} revision={item.revision} />
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </SectionCard>
  );
}
const thresholdLabels: Record<string, [string, string]> = {
  "rules.target_cpql": [
    "R-02 / R-05 · Target CPQL",
    "Kosong = belum disetujui bisnis. Angka > 0 hingga 1 triliun; jangan isi target sementara.",
  ],
  "rules.currency": [
    "R-02 / R-05 · Currency benchmark",
    "Kode tiga huruf, misalnya IDR, hanya setelah benchmark disetujui.",
  ],
  "rules.frequency": [
    "R-10 · Frequency threshold",
    "Kosong = belum dikonfigurasi. > 0 hingga 100; dibandingkan nilai platform hari lengkap terakhir.",
  ],
  "rules.lead_gen_campaigns": [
    "R-06 · Campaign ID lead-generation",
    "ID yang sudah diverifikasi, pisahkan dengan koma. Kosong = tujuan kampanye tidak diketahui.",
  ],
  "rules.cpl_rise": [
    "R-03 · Kenaikan CPL",
    "Fraksi relatif 0.01–5; default 0.2 (20%).",
  ],
  "rules.cpql_fall": [
    "R-03 · Penurunan CPQL",
    "Fraksi relatif 0.01–1; default 0.1 (10%).",
  ],
  "rules.quality_fall": [
    "R-04 · Penurunan MQL rate",
    "Fraksi relatif 0.01–1; default 0.25 (25%).",
  ],
  "rules.ctr_fall": [
    "R-10 · Penurunan CTR",
    "Fraksi relatif 0.01–1; default 0.25 (25%).",
  ],
  "health.min_coverage": [
    "R-00 · Minimum attribution coverage",
    "0.01–1; default 0.7.",
  ],
  "health.min_outcome_completeness": [
    "R-09 · Minimum outcome completeness",
    "0.01–1; default 0.6.",
  ],
  "metrics.min_results_for_verdict": [
    "R-01 / R-05 · Minimum hasil",
    "1–10,000 MQL; default 10.",
  ],
  "metrics.cohort_maturity_days": [
    "Quality · Kematangan cohort",
    "1–365 hari; default 14. Berlaku pada evaluasi mendatang.",
  ],
};
export async function DecisionSettings({
  values,
  editable,
}: {
  values: typeof settingsDefaults;
  editable: boolean;
}) {
  const candidates = await dismissalCandidates();
  return (
    <>
      <p className="p-5 text-sm">
        {values["rules.target_cpql"] === null ||
        values["rules.currency"] === null
          ? "A11: target CPQL belum lengkap; menunggu input yang disetujui bisnis."
          : `Target CPQL tersimpan: ${values["rules.target_cpql"]} ${values["rules.currency"]}.`}{" "}
        Reset target mengembalikan status unconfigured. Rule version r1; setiap
        perubahan diaudit.
      </p>
      {editable &&
        thresholdKeys.map((key) => (
          <ThresholdForm
            key={key}
            name={key}
            value={
              Array.isArray(values[key])
                ? (values[key] as string[]).join(", ")
                : String(values[key] ?? "")
            }
            label={thresholdLabels[key][0]}
            help={thresholdLabels[key][1]}
          />
        ))}
      <div className="p-5">
        <h3>Kandidat perubahan aturan · 30 hari</h3>
        {candidates.length ? (
          <ul>
            {candidates.map((c) => (
              <li key={c.key} className="break-words">
                {c.key}: {c.count} dismiss · {c.reason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">
            Belum ada item dengan tiga dismiss dalam 30 hari.
          </p>
        )}
      </div>
    </>
  );
}
export async function DecisionHistory({
  search,
}: {
  search: Record<string, string | string[] | undefined>;
}) {
  const scope = z.string().max(300).catch("").parse(search.scope),
    page = z.coerce
      .number()
      .int()
      .min(0)
      .max(100000)
      .catch(0)
      .parse(search.rule_page),
    model = await history(scope, page);
  return (
    <SectionCard
      title="Riwayat evaluasi aturan"
      description="Termasuk kondisi tidak terpenuhi, MONITOR, SUPPRESSED, dan kesalahan evaluasi."
    >
      <form className="flex flex-wrap gap-3 p-5" method="get">
        <label className="field" htmlFor="rule-scope">
          Scope campaign (account ID:campaign ID)
          <input
            id="rule-scope"
            name="scope"
            className="native-control"
            defaultValue={scope}
          />
        </label>
        <button className="min-h-11 rounded-md border px-4" type="submit">
          Filter riwayat
        </button>
      </form>
      {model.rows.length ? (
        <ol className="divide-y">
          {model.rows.map((row) => (
            <li key={row.id} className="space-y-2 p-5">
              <p className="break-words text-sm">
                {row.evaluated_at} · {row.scope_id} · {row.verdict}
              </p>
              <Evidence value={row.evidence} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="p-5 text-sm">
          Belum ada evaluasi tersimpan pada scope ini.
        </p>
      )}
      <nav
        className="flex gap-4 p-5 text-sm text-primary"
        aria-label="Halaman evaluasi"
      >
        {page > 0 && (
          <Link
            href={`?scope=${encodeURIComponent(scope)}&rule_page=${page - 1}`}
          >
            Sebelumnya
          </Link>
        )}
        {(page + 1) * 20 < model.total && (
          <Link
            href={`?scope=${encodeURIComponent(scope)}&rule_page=${page + 1}`}
          >
            Berikutnya
          </Link>
        )}
      </nav>
    </SectionCard>
  );
}
