import Link from "next/link";
import { PageHeader, SectionCard } from "@/components/operational";
import { EmptyState } from "@/components/states";
import {
  WorkflowChecklist,
  QuickNoteForm,
  WorkflowRetry,
} from "@/components/workflow";
import { todayModel } from "@/services/workflow-pages";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const model = await todayModel(await searchParams);
  return (
    <>
      <PageHeader
        title="Today"
        description={`Selamat bekerja. ${model.heading}`}
        actions={
          <Link
            className="text-sm font-medium text-primary underline"
            href="/workflows"
          >
            Riwayat checklist
          </Link>
        }
      />
      <div className="space-y-5">
        <p className="text-xs text-muted-foreground">
          Checklist mengikuti hari ini di Asia/Jakarta; rentang pelaporan tidak
          mengubah jadwal.
        </p>
        {model.runError && (
          <WorkflowRetry title="Checklist belum dapat dimuat atau dibuat." />
        )}
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            {model.runs.map((run) => (
              <WorkflowChecklist key={run.id} run={run} />
            ))}
            {!model.runError && !model.runs.length && (
              <SectionCard title="Checklist hari ini">
                <EmptyState
                  title="Tidak ada checklist hari ini"
                  description="Tidak ada template aktif yang dijadwalkan untuk hari ini. Riwayat tetap tersedia."
                  action={
                    <Link
                      className="text-primary underline"
                      href="/workflows/templates"
                    >
                      Kelola template
                    </Link>
                  }
                />
              </SectionCard>
            )}
          </div>
          <SectionCard
            title="Catatan cepat"
            description="Konteks kerja yang tersimpan berdasarkan tanggal."
          >
            <QuickNoteForm />
            <form
              className="flex flex-wrap items-end gap-3 border-y p-5"
              method="get"
            >
              <label className="field" htmlFor="note-date">
                Tanggal catatan
                <input
                  id="note-date"
                  name="note_date"
                  className="native-control"
                  type="date"
                  defaultValue={model.noteDate}
                  max={model.today}
                  required
                />
              </label>
              <button
                className="min-h-11 rounded-md border px-4 text-sm font-medium"
                type="submit"
              >
                Lihat catatan
              </button>
            </form>
            {model.noteError ? (
              <WorkflowRetry title="Catatan belum dapat dimuat." />
            ) : model.notes.length ? (
              <ol aria-label={`Catatan ${model.noteDate}`} className="divide-y">
                {model.notes.map((note) => (
                  <li key={note.id} className="space-y-2 p-5">
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={note.note_date}
                    >
                      {note.note_date} · WIB
                    </time>
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {note.body}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="Belum ada catatan untuk tanggal ini"
                description="Tambahkan observasi melalui Catatan cepat hari ini."
              />
            )}
            <nav
              aria-label="Halaman catatan"
              className="flex gap-4 p-5 text-sm text-primary"
            >
              {model.notePage > 0 && (
                <Link
                  href={`/today?note_date=${model.noteDate}&note_page=${model.notePage - 1}`}
                >
                  Sebelumnya
                </Link>
              )}
              {(model.notePage + 1) * 20 < model.noteTotal && (
                <Link
                  href={`/today?note_date=${model.noteDate}&note_page=${model.notePage + 1}`}
                >
                  Berikutnya
                </Link>
              )}
            </nav>
          </SectionCard>
        </div>
        <SectionCard
          title="Bagian berikutnya"
          description="Bagian ini belum aktif; tidak ada data yang dibuat-buat."
        >
          <ul className="grid gap-3 p-5 text-sm text-muted-foreground sm:grid-cols-2">
            <li>Experiment review queue · Phase 5</li>
            <li>Lead follow-up queue · Phase 6</li>
            <li>Data health · Phase 7</li>
            <li>Alerts · Phase 9</li>
            <li>Priority actions · Phase 11</li>
          </ul>
        </SectionCard>
      </div>
    </>
  );
}
