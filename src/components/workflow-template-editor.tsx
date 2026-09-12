"use client";
import { useState, useTransition } from "react";
import { ArrowUp, ArrowDown, Plus, X } from "lucide-react";
import { saveTemplate } from "@/services/workflow-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/operational";
import type { WorkflowTemplate } from "@/repositories/workflows";
const weekdays = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];
export function WorkflowTemplateEditor({
  template,
}: {
  template?: WorkflowTemplate;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [key, setKey] = useState(template?.key ?? "");
  const [cadence, setCadence] = useState(template?.cadence ?? "daily");
  const [days, setDays] = useState(template?.weekdays ?? [1, 2, 3, 4, 5, 6, 7]);
  const [active, setActive] = useState(template?.is_active ?? true);
  const [steps, setSteps] = useState(
    template?.steps ?? [
      { key: "langkah-1", label: "", help: "", required: true },
    ],
  );
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const prefix = template?.id ?? "new";
  function move(index: number, offset: number) {
    setSteps((current) => {
      const next = [...current];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
  }
  return (
    <SectionCard
      title={template?.name ?? "Template baru"}
      description={
        template
          ? `Versi ${template.version} · ${template.is_active ? "Aktif" : "Nonaktif"}`
          : "Susun checklist sesuai rutinitas kerja."
      }
    >
      <form
        className="space-y-5 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            try {
              const result = await saveTemplate({
                id: template?.id,
                version: template?.version,
                name,
                key,
                cadence,
                weekdays: cadence === "monthly" ? null : days,
                is_active: active,
                steps,
              });
              setMessage(result.message);
              if (result.ok && !template) {
                setName("");
                setKey("");
                setSteps([
                  { key: "langkah-1", label: "", help: "", required: true },
                ]);
              }
            } catch {
              setMessage("Template belum tersimpan. Silakan coba lagi.");
            }
          });
        }}
      >
        <fieldset
          disabled={pending}
          className="space-y-5"
          aria-label="Isi template"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field" htmlFor={`${prefix}-name`}>
              Nama template
              <Input
                id={`${prefix}-name`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
              />
            </label>
            <label className="field" htmlFor={`${prefix}-key`}>
              Kunci unik
              <Input
                id={`${prefix}-key`}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                readOnly={!!template}
                required
                pattern="[a-z0-9][a-z0-9-]*"
                maxLength={80}
              />
              <span className="text-xs text-muted-foreground">
                Huruf kecil, angka, dan tanda hubung.
              </span>
            </label>
            <label className="field" htmlFor={`${prefix}-cadence`}>
              Jadwal
              <select
                id={`${prefix}-cadence`}
                className="native-control"
                value={cadence}
                onChange={(e) => setCadence(e.target.value as typeof cadence)}
              >
                <option value="daily">Harian</option>
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan · hari kerja pertama</option>
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="size-5 accent-primary"
              />
              Template aktif
            </label>
          </div>
          {cadence !== "monthly" && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">
                Hari pelaksanaan
              </legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {weekdays.map((day, index) => (
                  <label key={day} className="flex min-h-11 items-center gap-2">
                    <input
                      className="size-4 accent-primary"
                      type="checkbox"
                      checked={days.includes(index + 1)}
                      onChange={(e) =>
                        setDays(
                          e.target.checked
                            ? [...days, index + 1]
                            : days.filter((d) => d !== index + 1),
                        )
                      }
                    />
                    {day}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <p className="text-xs text-muted-foreground">
            Perubahan berlaku untuk checklist yang belum dibuat. Menonaktifkan
            template mempertahankan riwayat dan checklist yang sedang berjalan.
          </p>
          <ol className="space-y-4" aria-label="Urutan langkah">
            {steps.map((step, index) => (
              <li key={step.key} className="space-y-3 rounded-md border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    Langkah {index + 1}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Naikkan langkah ${index + 1}`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Turunkan langkah ${index + 1}`}
                      disabled={index === steps.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Hapus langkah ${index + 1}`}
                      disabled={steps.length === 1}
                      onClick={() =>
                        setSteps(steps.filter((_, i) => i !== index))
                      }
                    >
                      <X />
                    </Button>
                  </div>
                </div>
                <label
                  className="field"
                  htmlFor={`${prefix}-${step.key}-label`}
                >
                  Nama langkah
                  <Input
                    id={`${prefix}-${step.key}-label`}
                    value={step.label}
                    required
                    maxLength={240}
                    onChange={(e) =>
                      setSteps(
                        steps.map((s, i) =>
                          i === index ? { ...s, label: e.target.value } : s,
                        ),
                      )
                    }
                  />
                </label>
                <label className="field" htmlFor={`${prefix}-${step.key}-help`}>
                  Petunjuk
                  <Textarea
                    id={`${prefix}-${step.key}-help`}
                    rows={2}
                    value={step.help}
                    maxLength={1000}
                    onChange={(e) =>
                      setSteps(
                        steps.map((s, i) =>
                          i === index ? { ...s, help: e.target.value } : s,
                        ),
                      )
                    }
                  />
                </label>
                <label className="flex min-h-11 items-center gap-2">
                  <input
                    className="size-4 accent-primary"
                    type="checkbox"
                    checked={step.required}
                    onChange={(e) =>
                      setSteps(
                        steps.map((s, i) =>
                          i === index
                            ? { ...s, required: e.target.checked }
                            : s,
                        ),
                      )
                    }
                  />
                  Wajib diselesaikan
                </label>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={steps.length >= 50}
              onClick={() =>
                setSteps([
                  ...steps,
                  {
                    key: crypto.randomUUID(),
                    label: "",
                    help: "",
                    required: true,
                  },
                ])
              }
            >
              <Plus />
              Tambah langkah
            </Button>
            <Button disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan template"}
            </Button>
          </div>
        </fieldset>
        <p role="status" className="text-sm">
          {message}
        </p>
      </form>
    </SectionCard>
  );
}
