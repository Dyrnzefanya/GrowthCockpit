"use client";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { changeItem } from "@/services/workflow-actions";
import { addNote } from "@/services/notes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/operational";
import { StatusBadge, type Status } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { ErrorState } from "@/components/states";
import type { WorkflowItem } from "@/repositories/workflows";
import type { runView } from "@/services/workflows";
type RunView = ReturnType<typeof runView>;
function ChecklistItem({ item }: { item: WorkflowItem }) {
  const [done, setDone] = useOptimistic(item.is_done);
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState(item.notes);
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState<
    { done: boolean } | { note: string } | null
  >(null);
  function save(change: { done: boolean } | { note: string }) {
    startTransition(async () => {
      if ("done" in change) setDone(change.done);
      setMessage("");
      try {
        const result = await changeItem({
          runId: item.run_id,
          itemId: item.id,
          ...change,
        });
        setMessage(result.message);
        setRetry(result.ok ? null : change);
      } catch {
        setMessage("Perubahan belum tersimpan. Coba lagi.");
        setRetry(change);
      }
    });
  }
  return (
    <li
      className="space-y-2 border-b p-4 last:border-0"
      data-testid="workflow-item"
    >
      <label
        className="flex min-h-11 cursor-pointer items-start gap-3"
        htmlFor={`step-${item.id}`}
      >
        <input
          id={`step-${item.id}`}
          type="checkbox"
          className="mt-1 size-5 shrink-0 accent-primary"
          checked={done}
          disabled={pending}
          onChange={(e) => save({ done: e.target.checked })}
        />
        <span className="min-w-0">
          <span
            className={`block break-words font-medium ${done ? "text-muted-foreground line-through" : ""}`}
          >
            {item.label_snapshot}
          </span>
          <span className="block text-xs text-muted-foreground">
            {item.required_snapshot ? "Wajib" : "Opsional"}
          </span>
          {item.help_snapshot && (
            <span className="mt-1 block text-sm text-muted-foreground">
              {item.help_snapshot}
            </span>
          )}
        </span>
      </label>
      <details className="ml-8">
        <summary className="min-h-11 cursor-pointer py-3 text-sm text-primary">
          Catatan langkah{item.notes ? " · tersimpan" : ""}
        </summary>
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            save({ note });
          }}
        >
          <label className="field" htmlFor={`note-${item.id}`}>
            Catatan: {item.label_snapshot}
          </label>
          <Textarea
            id={`note-${item.id}`}
            value={note}
            disabled={pending}
            onChange={(e) => setNote(e.target.value)}
            maxLength={4000}
            rows={2}
          />
          <Button variant="outline" size="sm" disabled={pending}>
            Simpan catatan
          </Button>
        </form>
      </details>
      <div className="ml-8 text-sm" aria-live="polite">
        {pending ? "Menyimpan…" : message}
        {retry && (
          <div role="alert" className="mt-2 text-critical">
            Tampilan dikembalikan ke data tersimpan.{" "}
            <Button
              variant="outline"
              size="sm"
              onClick={() => save(retry)}
              disabled={pending}
            >
              Coba lagi
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
export function WorkflowChecklist({ run }: { run: RunView }) {
  return (
    <SectionCard
      title={run.template_name_snapshot}
      description={`${run.run_date} · versi ${run.template_version} · ${run.progress.done}/${run.progress.total} langkah · ${run.progress.percentage}%`}
      action={<StatusBadge status={run.status as Status} />}
    >
      <ol aria-label={`Langkah ${run.template_name_snapshot}`}>
        {run.workflow_items.map((item) => (
          <ChecklistItem key={item.id} item={item} />
        ))}
      </ol>
    </SectionCard>
  );
}
export function QuickNoteForm() {
  const [body, setBody] = useState("");
  const [id, setId] = useState(() => crypto.randomUUID());
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-3 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          try {
            const result = await addNote({ id, body });
            setMessage(result.message);
            if (result.ok) {
              setBody("");
              setId(crypto.randomUUID());
            }
          } catch {
            setMessage("Catatan belum tersimpan. Silakan coba lagi.");
          }
        });
      }}
    >
      <label className="field" htmlFor="quick-note">
        Catatan cepat hari ini
      </label>
      <Textarea
        id="quick-note"
        value={body}
        disabled={pending}
        onChange={(e) => {
          setBody(e.target.value);
          setId(crypto.randomUUID());
        }}
        required
        maxLength={4000}
        rows={3}
        aria-describedby="note-privacy"
      />
      <p id="note-privacy" className="text-xs text-muted-foreground">
        Jangan masukkan kredensial, token, atau data pribadi pelanggan. Catatan
        baru mengikuti tanggal Asia/Jakarta saat disimpan.
      </p>
      <Button disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan catatan hari ini"}
      </Button>
      <p role="status" className="text-sm">
        {message}
      </p>
    </form>
  );
}
export function WorkflowRetry({ title }: { title: string }) {
  const router = useRouter();
  return <ErrorState title={title} onRetry={() => router.refresh()} />;
}
export function WorkflowHistory({
  runs,
  total,
  page,
  sort,
  direction,
}: {
  runs: RunView[];
  total: number;
  page: number;
  sort: string;
  direction: string;
}) {
  const router = useRouter();
  function navigate(
    nextPage: number,
    nextSort = sort,
    nextDirection = direction,
  ) {
    router.push(
      `/workflows?page=${nextPage}&sort=${nextSort}&direction=${nextDirection}`,
    );
  }
  return (
    <DataTable
      rows={runs}
      rowKey={(run) => run.id}
      caption="Riwayat checklist 30 hari terakhir"
      pagination={{ page, total, onPageChange: (next) => navigate(next) }}
      onSortChange={(key, dir) => navigate(0, key, dir)}
      columns={[
        { key: "run_date", label: "Tanggal WIB", value: (r) => r.run_date },
        {
          key: "template_name_snapshot",
          label: "Checklist",
          value: (r) => r.template_name_snapshot,
          render: (r) => (
            <Link
              className="font-medium text-primary underline underline-offset-4"
              href={`/workflows?run=${r.id}`}
            >
              {r.template_name_snapshot}
            </Link>
          ),
        },
        {
          key: "status",
          label: "Status / penyelesaian",
          value: (r) => r.status,
          render: (r) => (
            <div className="space-y-1">
              <StatusBadge status={r.status as Status} />
              <p className="text-xs">
                {r.progress.percentage}% · {r.progress.done}/{r.progress.total}{" "}
                langkah
              </p>
            </div>
          ),
        },
      ]}
    />
  );
}
