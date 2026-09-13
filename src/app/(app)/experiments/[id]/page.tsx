import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, SectionCard, Timeline } from "@/components/operational";
import { StatusBadge, type Status } from "@/components/status-badge";
import {
  ExperimentActions,
  ExperimentEditor,
  ExperimentJourney,
} from "@/components/experiments";
import { experimentDetail } from "@/services/experiments";

function evidenceValue(value: unknown, key: string) {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const result = (value as Record<string, unknown>)[key];
  return typeof result === "string" ||
    typeof result === "number" ||
    typeof result === "boolean"
    ? String(result)
    : null;
}

export default async function Page({ params }: PageProps<"/experiments/[id]">) {
  const { id } = await params;
  const model = await experimentDetail(id);
  if (!model) notFound();
  const { experiment, defaults } = model;
  const result = experiment.experiment_results;
  const sampleWarning =
    result && evidenceValue(result.evidence, "sample_warning") === "true";
  const refs =
    experiment.external_refs &&
    !Array.isArray(experiment.external_refs) &&
    typeof experiment.external_refs === "object"
      ? Object.entries(experiment.external_refs).filter(
          ([, value]) => typeof value === "string",
        )
      : [];
  return (
    <>
      <PageHeader
        title={experiment.title}
        description={experiment.hypothesis}
        actions={
          <Link className="text-sm text-primary underline" href="/experiments">
            Kembali ke daftar
          </Link>
        }
      />
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {experiment.code}
          </span>
          <StatusBadge status={experiment.status as Status} />
        </div>
        <ExperimentJourney status={experiment.status} />
        <div className="grid items-start gap-5 xl:grid-cols-3">
          <SectionCard title="Rancangan uji" className="xl:col-span-2">
            <dl className="grid gap-4 p-5 sm:grid-cols-2">
              {[
                ["Variabel", experiment.variable],
                ["KPI utama", experiment.primary_kpi],
                ["Control", experiment.control_description || "Belum dicatat"],
                ["Variant", experiment.variant_description || "Belum dicatat"],
                ["Mulai", experiment.start_date],
                ["Review", experiment.review_date],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 break-words text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>
          <SectionCard
            title="Keputusan"
            description="Transisi mengikuti lifecycle yang diperbolehkan."
          >
            <div className="p-5">
              <ExperimentActions
                experiment={experiment}
                minimumResults={defaults.minimumResults}
              />
            </div>
          </SectionCard>
        </div>
        {result && (
          <SectionCard
            title="Evidence, decision, dan learning"
            action={
              <StatusBadge
                status={
                  sampleWarning
                    ? "unknown"
                    : result.outcome === "win"
                      ? "healthy"
                      : result.outcome === "lose"
                        ? "attention"
                        : "unknown"
                }
                label={
                  sampleWarning ? "Inconclusive by default" : result.outcome
                }
              />
            }
          >
            <dl className="grid gap-5 p-5 md:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">
                  Hasil KPI utama
                </dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {result.primary_kpi_result}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Sample</dt>
                <dd className="mt-1 text-sm">
                  {evidenceValue(result.evidence, "observed_results") ?? "—"}{" "}
                  hasil ·{" "}
                  {evidenceValue(result.evidence, "verdict_label") ??
                    "operator_outcome"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Kesimpulan</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm">
                  {result.conclusion}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Learning</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm">
                  {result.learning}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-xs text-muted-foreground">
                  Tindakan berikutnya
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm">
                  {result.next_action}
                </dd>
              </div>
            </dl>
          </SectionCard>
        )}
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <SectionCard title="Timeline">
            <div className="p-5">
              <Timeline
                events={[
                  {
                    id: "created",
                    title: "Hipotesis dicatat",
                    time: experiment.created_at,
                    description: "Eksperimen masuk backlog.",
                  },
                  {
                    id: "start",
                    title: "Tanggal mulai",
                    time: experiment.start_date,
                    description:
                      experiment.status === "draft"
                        ? "Rencana tanggal mulai."
                        : "Eksperimen dijalankan.",
                  },
                  {
                    id: "review",
                    title: "Tanggal review",
                    time: experiment.review_date,
                    description: "Saat bukti perlu ditinjau.",
                  },
                  ...(experiment.end_date
                    ? [
                        {
                          id: "end",
                          title:
                            experiment.status === "cancelled"
                              ? "Dibatalkan"
                              : "Selesai",
                          time: experiment.end_date,
                          description: `Status akhir: ${experiment.status}.`,
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          </SectionCard>
          <SectionCard title="Referensi eksternal">
            {refs.length ? (
              <dl className="space-y-3 p-5">
                {refs.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs text-muted-foreground">
                      {key.replaceAll("_", " ")}
                    </dt>
                    <dd className="break-all text-sm">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="p-5 text-sm text-muted-foreground">
                Belum ada campaign, ad set, ad, atau landing page yang
                ditautkan.
              </p>
            )}
          </SectionCard>
        </div>
        {experiment.status === "draft" && (
          <div className="space-y-3 border-t pt-5">
            <h2>Edit backlog</h2>
            <ExperimentEditor experiment={experiment} defaults={defaults} />
          </div>
        )}
      </div>
    </>
  );
}
