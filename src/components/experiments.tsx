"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Play, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/overlays";
import { SectionCard } from "@/components/operational";
import {
  durationWarning,
  priorityScore,
  sampleEvidence,
  type ExperimentStatus,
} from "@/domain/experiments/state";
import type { Experiment } from "@/repositories/experiments";
import {
  completeExperimentAction,
  saveExperimentAction,
  transitionExperimentAction,
} from "@/services/experiment-actions";

type Defaults = {
  today: string;
  reviewDate: string;
  minimumDays: number;
  minimumResults: number;
};

function refValue(value: Experiment["external_refs"], key: string) {
  if (!value || Array.isArray(value) || typeof value !== "object") return "";
  const result = value[key];
  return typeof result === "string" ? result : "";
}

export function ExperimentEditor({
  experiment,
  defaults,
  initialCampaignId = "",
}: {
  experiment?: Experiment;
  defaults: Defaults;
  initialCampaignId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState(experiment?.title ?? "");
  const [hypothesis, setHypothesis] = useState(experiment?.hypothesis ?? "");
  const [variable, setVariable] = useState(experiment?.variable ?? "");
  const [primaryKpi, setPrimaryKpi] = useState(experiment?.primary_kpi ?? "");
  const [startDate, setStartDate] = useState(
    experiment?.start_date ?? defaults.today,
  );
  const [reviewDate, setReviewDate] = useState(
    experiment?.review_date ?? defaults.reviewDate,
  );
  const [controlDescription, setControlDescription] = useState(
    experiment?.control_description ?? "",
  );
  const [variantDescription, setVariantDescription] = useState(
    experiment?.variant_description ?? "",
  );
  const [secondaryKpi, setSecondaryKpi] = useState(
    experiment?.secondary_kpi ?? "",
  );
  const [baselineValue, setBaselineValue] = useState(
    experiment?.baseline_value?.toString() ?? "",
  );
  const [targetValue, setTargetValue] = useState(
    experiment?.target_value?.toString() ?? "",
  );
  const [priority, setPriority] = useState(experiment?.priority ?? 3);
  const [confidence, setConfidence] = useState(experiment?.confidence ?? 3);
  const [effort, setEffort] = useState(experiment?.effort ?? 3);
  const [platform, setPlatform] = useState(experiment?.platform ?? "");
  const [campaignId, setCampaignId] = useState(
    refValue(experiment?.external_refs ?? {}, "campaign_id") ||
      initialCampaignId,
  );
  const [adsetId, setAdsetId] = useState(
    refValue(experiment?.external_refs ?? {}, "adset_id"),
  );
  const [adId, setAdId] = useState(
    refValue(experiment?.external_refs ?? {}, "ad_id"),
  );
  const [landingPageUrl, setLandingPageUrl] = useState(
    refValue(experiment?.external_refs ?? {}, "landing_page_url"),
  );
  const warning = durationWarning(startDate, reviewDate, defaults.minimumDays);

  function submit() {
    startTransition(async () => {
      try {
        const result = await saveExperimentAction({
          id: experiment?.id,
          revision: experiment?.updated_at,
          title,
          hypothesis,
          variable,
          primaryKpi,
          startDate,
          reviewDate,
          controlDescription,
          variantDescription,
          secondaryKpi,
          baselineValue,
          targetValue,
          priority,
          confidence,
          effort,
          platform,
          externalRefs: { campaignId, adsetId, adId, landingPageUrl },
        });
        setMessage(result.message);
        if (result.ok) router.push(`/experiments/${result.id}`);
      } catch {
        setMessage("Eksperimen belum tersimpan. Isi form tetap dipertahankan.");
      }
    });
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <fieldset disabled={pending} className="space-y-5">
        <SectionCard
          title="1 · Hypothesis"
          description="Nyatakan perubahan, sasaran, dan alasan yang dapat diuji."
        >
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <label className="field md:col-span-2" htmlFor="experiment-title">
              Judul
              <Input
                id="experiment-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                required
              />
            </label>
            <label
              className="field md:col-span-2"
              htmlFor="experiment-hypothesis"
            >
              Hipotesis
              <Textarea
                id="experiment-hypothesis"
                value={hypothesis}
                onChange={(event) => setHypothesis(event.target.value)}
                placeholder="Jika … maka … karena …"
                maxLength={2000}
                rows={3}
                required
              />
            </label>
            <label className="field" htmlFor="experiment-variable">
              Variabel yang diuji
              <Input
                id="experiment-variable"
                value={variable}
                onChange={(event) => setVariable(event.target.value)}
                maxLength={200}
                required
              />
            </label>
            <label className="field" htmlFor="experiment-kpi">
              KPI utama
              <Input
                id="experiment-kpi"
                value={primaryKpi}
                onChange={(event) => setPrimaryKpi(event.target.value)}
                maxLength={120}
                required
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard
          title="2 · Test"
          description="Satu perubahan, satu pembanding, dan jendela review yang jelas."
        >
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <label className="field" htmlFor="experiment-control">
              Control (opsional)
              <Textarea
                id="experiment-control"
                value={controlDescription}
                onChange={(event) => setControlDescription(event.target.value)}
                maxLength={2000}
                rows={3}
              />
            </label>
            <label className="field" htmlFor="experiment-variant">
              Variant (opsional)
              <Textarea
                id="experiment-variant"
                value={variantDescription}
                onChange={(event) => setVariantDescription(event.target.value)}
                maxLength={2000}
                rows={3}
              />
            </label>
            <label className="field" htmlFor="experiment-start-date">
              Tanggal mulai
              <Input
                id="experiment-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
            </label>
            <label className="field" htmlFor="experiment-review-date">
              Tanggal review
              <Input
                id="experiment-review-date"
                type="date"
                value={reviewDate}
                onChange={(event) => setReviewDate(event.target.value)}
                required
                aria-describedby={warning ? "duration-warning" : undefined}
              />
            </label>
            {warning && (
              <p
                id="duration-warning"
                role="status"
                className="rounded-md border border-attention/30 bg-attention-soft px-3 py-2 text-sm text-attention md:col-span-2"
              >
                Peringatan durasi: {warning} Simpan tetap diperbolehkan.
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Prioritas backlog"
          description="Skor = (priority × confidence) / effort. Nilai 1 rendah, 5 tinggi."
        >
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            {[
              ["Priority", priority, setPriority],
              ["Confidence", confidence, setConfidence],
              ["Effort", effort, setEffort],
            ].map(([label, value, setter]) => (
              <label className="field" key={label as string}>
                {label as string}
                <select
                  className="native-control"
                  value={value as number}
                  onChange={(event) =>
                    (setter as (value: number) => void)(
                      Number(event.target.value),
                    )
                  }
                >
                  {[1, 2, 3, 4, 5].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <p className="text-sm text-muted-foreground sm:col-span-3">
              Skor saat ini:{" "}
              <strong className="text-foreground tabular-nums">
                {priorityScore(priority, confidence, effort).toFixed(2)}
              </strong>
            </p>
          </div>
        </SectionCard>

        <details className="rounded-lg border bg-card">
          <summary className="cursor-pointer px-5 py-4 text-sm font-medium">
            KPI tambahan dan referensi eksternal (opsional)
          </summary>
          <div className="grid gap-4 border-t p-5 md:grid-cols-2">
            <label className="field" htmlFor="experiment-secondary-kpi">
              KPI sekunder
              <Input
                id="experiment-secondary-kpi"
                value={secondaryKpi}
                onChange={(event) => setSecondaryKpi(event.target.value)}
                maxLength={120}
              />
            </label>
            <label className="field" htmlFor="experiment-platform">
              Platform
              <Input
                id="experiment-platform"
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
                maxLength={80}
              />
            </label>
            <label className="field" htmlFor="experiment-baseline">
              Nilai baseline
              <Input
                id="experiment-baseline"
                type="number"
                step="any"
                value={baselineValue}
                onChange={(event) => setBaselineValue(event.target.value)}
              />
            </label>
            <label className="field" htmlFor="experiment-target">
              Nilai target
              <Input
                id="experiment-target"
                type="number"
                step="any"
                value={targetValue}
                onChange={(event) => setTargetValue(event.target.value)}
              />
            </label>
            <label className="field" htmlFor="experiment-campaign">
              Campaign ID
              <Input
                id="experiment-campaign"
                value={campaignId}
                onChange={(event) => setCampaignId(event.target.value)}
                maxLength={200}
              />
            </label>
            <label className="field" htmlFor="experiment-adset">
              Ad set ID
              <Input
                id="experiment-adset"
                value={adsetId}
                onChange={(event) => setAdsetId(event.target.value)}
                maxLength={200}
              />
            </label>
            <label className="field" htmlFor="experiment-ad">
              Ad ID
              <Input
                id="experiment-ad"
                value={adId}
                onChange={(event) => setAdId(event.target.value)}
                maxLength={200}
              />
            </label>
            <label className="field" htmlFor="experiment-url">
              Landing page URL
              <Input
                id="experiment-url"
                type="url"
                value={landingPageUrl}
                onChange={(event) => setLandingPageUrl(event.target.value)}
                maxLength={2000}
                placeholder="https://"
              />
            </label>
          </div>
        </details>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">
            <Save />
            {pending ? "Menyimpan…" : "Simpan ke backlog"}
          </Button>
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        </div>
      </fieldset>
    </form>
  );
}

export function ExperimentActions({
  experiment,
  minimumResults,
}: {
  experiment: Experiment;
  minimumResults: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState("inconclusive");
  const [primaryKpiResult, setPrimaryKpiResult] = useState("");
  const [observedResults, setObservedResults] = useState("0");
  const [conclusion, setConclusion] = useState("");
  const [learning, setLearning] = useState("");
  const [nextAction, setNextAction] = useState("");
  const evidence = sampleEvidence(Number(observedResults || 0), minimumResults);

  function transition(to: ExperimentStatus) {
    startTransition(async () => {
      const result = await transitionExperimentAction({
        id: experiment.id,
        revision: experiment.updated_at,
        from: experiment.status,
        to,
      });
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  function complete() {
    startTransition(async () => {
      const result = await completeExperimentAction({
        id: experiment.id,
        revision: experiment.updated_at,
        from: "running",
        outcome,
        primaryKpiResult,
        observedResults,
        conclusion,
        learning,
        nextAction,
      });
      setMessage(result.message);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {experiment.status === "draft" && (
          <Button disabled={pending} onClick={() => transition("running")}>
            <Play /> Mulai eksperimen
          </Button>
        )}
        {experiment.status === "running" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={pending}>
                <Check /> Selesaikan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Evidence → Decision → Learning</DialogTitle>
                <DialogDescription>
                  Hasil tidak dihitung sebagai signifikansi statistik. Catat
                  bukti dan pembelajaran yang dapat dipakai kembali.
                </DialogDescription>
              </DialogHeader>
              <form
                id="complete-experiment"
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  complete();
                }}
              >
                <fieldset
                  disabled={pending}
                  className="contents disabled:opacity-60"
                >
                  <label className="field" htmlFor="result-outcome">
                    Outcome
                    <select
                      id="result-outcome"
                      className="native-control"
                      value={outcome}
                      onChange={(event) => setOutcome(event.target.value)}
                    >
                      <option value="win">Win</option>
                      <option value="lose">Lose</option>
                      <option value="inconclusive">Inconclusive</option>
                    </select>
                  </label>
                  <label className="field" htmlFor="result-kpi">
                    Hasil KPI utama
                    <Input
                      id="result-kpi"
                      type="number"
                      step="any"
                      value={primaryKpiResult}
                      onChange={(event) =>
                        setPrimaryKpiResult(event.target.value)
                      }
                      required
                    />
                  </label>
                  <label className="field sm:col-span-2" htmlFor="result-count">
                    Jumlah hasil teramati
                    <Input
                      id="result-count"
                      type="number"
                      min="0"
                      step="1"
                      value={observedResults}
                      onChange={(event) =>
                        setObservedResults(event.target.value)
                      }
                      aria-describedby={
                        evidence.sample_warning ? "sample-warning" : undefined
                      }
                      required
                    />
                  </label>
                  {evidence.sample_warning && (
                    <p
                      id="sample-warning"
                      role="status"
                      className="rounded-md border border-attention/30 bg-attention-soft px-3 py-2 text-sm text-attention sm:col-span-2"
                    >
                      Sampel di bawah {minimumResults}. Outcome akan disimpan
                      dengan label “inconclusive by default”.
                    </p>
                  )}
                  <label
                    className="field sm:col-span-2"
                    htmlFor="result-conclusion"
                  >
                    Kesimpulan
                    <Textarea
                      id="result-conclusion"
                      value={conclusion}
                      onChange={(event) => setConclusion(event.target.value)}
                      maxLength={4000}
                      rows={3}
                      required
                    />
                  </label>
                  <label
                    className="field sm:col-span-2"
                    htmlFor="result-learning"
                  >
                    Learning
                    <Textarea
                      id="result-learning"
                      value={learning}
                      onChange={(event) => setLearning(event.target.value)}
                      maxLength={4000}
                      rows={3}
                      required
                    />
                    <span className="text-xs text-muted-foreground">
                      Wajib. Eksperimen tidak dapat selesai tanpa learning.
                    </span>
                  </label>
                  <label className="field sm:col-span-2" htmlFor="result-next">
                    Tindakan berikutnya
                    <Textarea
                      id="result-next"
                      value={nextAction}
                      onChange={(event) => setNextAction(event.target.value)}
                      maxLength={2000}
                      rows={2}
                      required
                    />
                  </label>
                </fieldset>
              </form>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  form="complete-experiment"
                  type="submit"
                  disabled={pending}
                >
                  {pending ? "Menyimpan…" : "Simpan hasil"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {experiment.status !== "cancelled" && (
          <ConfirmDialog
            trigger={
              <Button disabled={pending} variant="outline">
                <X /> Batalkan eksperimen
              </Button>
            }
            title="Batalkan eksperimen?"
            description="Status menjadi cancelled. Catatan dan referensi tetap tersimpan."
            onConfirm={() => transition("cancelled")}
          />
        )}
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

export function ExperimentJourney({ status }: { status: string }) {
  const stages = ["Hypothesis", "Test", "Evidence", "Decision", "Learning"];
  const active =
    status === "draft"
      ? 1
      : status === "running"
        ? 2
        : status === "completed"
          ? 5
          : 0;
  return (
    <ol
      aria-label="Tahap eksperimen"
      className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-5"
    >
      {stages.map((stage, index) => (
        <li
          key={stage}
          className={`px-3 py-2 text-xs font-medium ${index < active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
        >
          {index + 1}. {stage}
        </li>
      ))}
    </ol>
  );
}

export function ExperimentPagination({
  base,
  page,
  total,
}: {
  base: string;
  page: number;
  total: number;
}) {
  return (
    <nav aria-label="Halaman eksperimen" className="flex gap-4 p-5 text-sm">
      {page > 0 && (
        <Link
          className="text-primary underline"
          href={`${base}&page=${page - 1}`}
        >
          Sebelumnya
        </Link>
      )}
      {(page + 1) * 20 < total && (
        <Link
          className="text-primary underline"
          href={`${base}&page=${page + 1}`}
        >
          Berikutnya
        </Link>
      )}
    </nav>
  );
}
