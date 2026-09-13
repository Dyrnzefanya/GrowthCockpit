import Link from "next/link";
import { PageHeader, SectionCard } from "@/components/operational";
import { EmptyState } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { ExperimentPagination } from "@/components/experiments";
import { learningLibrary } from "@/services/experiments";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const model = await learningLibrary(await searchParams);
  const params = new URLSearchParams();
  if (model.filters.q) params.set("q", model.filters.q);
  if (model.filters.variable) params.set("variable", model.filters.variable);
  if (model.filters.kpi) params.set("kpi", model.filters.kpi);
  if (model.filters.outcome) params.set("outcome", model.filters.outcome);
  return (
    <>
      <PageHeader
        title="Learning library"
        description="Temukan kembali bukti, keputusan, dan pembelajaran dari eksperimen yang selesai."
        actions={
          <Link className="text-sm text-primary underline" href="/experiments">
            Kembali ke experiments
          </Link>
        }
      />
      <form
        method="get"
        role="search"
        className="mb-5 grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,auto))_auto]"
      >
        <label className="field" htmlFor="learning-search">
          Cari conclusion atau learning
          <input
            id="learning-search"
            className="native-control"
            name="q"
            type="search"
            defaultValue={model.filters.q}
            maxLength={200}
          />
        </label>
        <label className="field" htmlFor="learning-variable">
          Variabel
          <select
            id="learning-variable"
            className="native-control"
            name="variable"
            defaultValue={model.filters.variable}
          >
            <option value="">Semua</option>
            {model.variables.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="learning-kpi">
          KPI
          <select
            id="learning-kpi"
            className="native-control"
            name="kpi"
            defaultValue={model.filters.kpi}
          >
            <option value="">Semua</option>
            {model.kpis.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="learning-outcome">
          Outcome
          <select
            id="learning-outcome"
            className="native-control"
            name="outcome"
            defaultValue={model.filters.outcome}
          >
            <option value="">Semua</option>
            <option value="win">Win</option>
            <option value="lose">Lose</option>
            <option value="inconclusive">Inconclusive</option>
          </select>
        </label>
        <button className="min-h-11 self-end rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Terapkan
        </button>
      </form>
      <SectionCard title="Pembelajaran eksperimen">
        {model.learnings.length ? (
          <>
            <ol className="divide-y">
              {model.learnings.map((item) => (
                <li key={item.id} className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      status={
                        item.evidence &&
                        !Array.isArray(item.evidence) &&
                        typeof item.evidence === "object" &&
                        item.evidence.sample_warning === true
                          ? "unknown"
                          : item.outcome === "win"
                            ? "healthy"
                            : item.outcome === "lose"
                              ? "attention"
                              : "unknown"
                      }
                      label={
                        item.evidence &&
                        !Array.isArray(item.evidence) &&
                        typeof item.evidence === "object" &&
                        item.evidence.sample_warning === true
                          ? "Inconclusive by default"
                          : item.outcome
                      }
                    />
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.experiments.code}
                    </span>
                  </div>
                  <Link
                    className="font-medium text-primary hover:underline"
                    href={`/experiments/${item.experiments.id}`}
                  >
                    {item.experiments.title}
                  </Link>
                  <p className="text-sm">
                    <strong>Learning:</strong> {item.learning}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.experiments.variable} · KPI{" "}
                    {item.experiments.primary_kpi} · {item.conclusion}
                  </p>
                </li>
              ))}
            </ol>
            <ExperimentPagination
              base={`/experiments/learnings?${params.toString()}`}
              page={model.filters.page}
              total={model.total}
            />
          </>
        ) : (
          <EmptyState
            title="Belum ada learning yang cocok"
            description="Selesaikan eksperimen dengan learning, atau ubah pencarian dan filter."
          />
        )}
      </SectionCard>
    </>
  );
}
