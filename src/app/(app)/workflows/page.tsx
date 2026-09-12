import Link from "next/link";
import { PageHeader, SectionCard } from "@/components/operational";
import { WorkflowHistory, WorkflowChecklist } from "@/components/workflow";
import { EmptyState } from "@/components/states";
import { historyModel } from "@/services/workflow-pages";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const model = await historyModel(await searchParams);
  return (
    <>
      <PageHeader
        title="Workflows"
        description={`Riwayat 30 hari: ${model.start} – ${model.end} · Asia/Jakarta.`}
        actions={
          <Link
            href="/workflows/templates"
            className="font-medium text-primary underline"
          >
            Kelola template
          </Link>
        }
      />
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Hari yang terlewat tidak diisi otomatis. Persentase mengikuti langkah
          wajib; bila semua opsional, seluruh langkah dihitung.
        </p>
        {model.detail && <WorkflowChecklist run={model.detail} />}
        <SectionCard title="Riwayat checklist">
          {model.total ? (
            <WorkflowHistory {...model} />
          ) : (
            <EmptyState
              title="Belum ada riwayat checklist"
              description="Buka Today untuk menjalankan checklist pada hari yang dijadwalkan."
              action={
                <Link href="/today" className="text-primary underline">
                  Buka Today
                </Link>
              }
            />
          )}
        </SectionCard>
      </div>
    </>
  );
}
