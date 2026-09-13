import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/operational";
import { EmptyState } from "@/components/states";
import { StatusBadge, type Status } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ExperimentPagination } from "@/components/experiments";
import { experimentLibrary } from "@/services/experiments";

const tabs = [
  ["draft", "Backlog"],
  ["running", "Running"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
] as const;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const model = await experimentLibrary(await searchParams);
  return (
    <>
      <PageHeader
        title="Experiments"
        description="Kelola perubahan dari hipotesis hingga learning yang dapat ditemukan kembali."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/experiments/learnings">Learning library</Link>
            </Button>
            <Button asChild>
              <Link href="/experiments/new">
                <Plus /> Eksperimen baru
              </Link>
            </Button>
          </div>
        }
      />
      <nav
        aria-label="Status eksperimen"
        className="mb-5 grid max-w-full grid-cols-4 gap-1 border-b sm:flex"
      >
        {tabs.map(([status, label]) => (
          <Link
            key={status}
            href={`/experiments?status=${status}`}
            aria-current={model.filters.status === status ? "page" : undefined}
            className={`min-h-11 whitespace-nowrap border-b-2 px-2 py-3 text-center text-sm font-medium sm:px-4 ${
              model.filters.status === status
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <SectionCard
        title={
          tabs.find(([value]) => value === model.filters.status)?.[1] ??
          "Experiments"
        }
        description={
          model.filters.status === "draft"
            ? "Urutan backlog: (priority × confidence) / effort. Nilai tertinggi dikerjakan lebih dahulu."
            : "Setiap status menyimpan konteks, tanggal, dan bukti operasional."
        }
      >
        {model.experiments.length ? (
          <>
            <ol className="divide-y">
              {model.experiments.map((experiment) => (
                <li
                  key={experiment.id}
                  className="grid gap-3 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {experiment.code}
                      </span>
                      <StatusBadge status={experiment.status as Status} />
                    </div>
                    <Link
                      href={`/experiments/${experiment.id}`}
                      className="block font-medium text-primary hover:underline"
                    >
                      {experiment.title}
                    </Link>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {experiment.hypothesis}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {experiment.variable} · KPI {experiment.primary_kpi} ·
                      review {experiment.review_date}
                    </p>
                  </div>
                  <div className="text-sm lg:text-right">
                    {model.filters.status === "draft" && (
                      <>
                        <p className="font-semibold tabular-nums">
                          Score {experiment.score.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {experiment.priority} × {experiment.confidence} ÷{" "}
                          {experiment.effort}
                        </p>
                      </>
                    )}
                    {experiment.timing && (
                      <>
                        <p>{experiment.timing.elapsedDays} hari berjalan</p>
                        <p
                          className={
                            experiment.timing.daysUntilReview <= 0
                              ? "text-attention"
                              : "text-muted-foreground"
                          }
                        >
                          {experiment.timing.daysUntilReview < 0
                            ? `${Math.abs(experiment.timing.daysUntilReview)} hari lewat review`
                            : experiment.timing.daysUntilReview === 0
                              ? "Review hari ini"
                              : `${experiment.timing.daysUntilReview} hari menuju review`}
                        </p>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <ExperimentPagination
              base={`/experiments?status=${model.filters.status}`}
              page={model.filters.page}
              total={model.total}
            />
          </>
        ) : (
          <EmptyState
            title="Belum ada eksperimen pada status ini"
            description="Catat hipotesis baru atau pilih status lain. Tidak ada hasil yang dibuat-buat."
            action={
              model.filters.status === "draft" ? (
                <Link
                  className="text-primary underline"
                  href="/experiments/new"
                >
                  Catat eksperimen
                </Link>
              ) : undefined
            }
          />
        )}
      </SectionCard>
    </>
  );
}
