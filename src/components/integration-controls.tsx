"use client";
import { useActionState } from "react";
import { integrationAction } from "@/services/integration-actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { DetailDrawer } from "@/components/overlays";
import { useRouter, useSearchParams } from "next/navigation";
import { jakartaDateTime } from "@/domain/dates";
import type { Database } from "@/types/database.generated";
type Run = Database["public"]["Tables"]["integration_runs"]["Row"];
export function RunTable({
  rows,
  total,
  page,
}: {
  rows: Run[];
  total: number;
  page: number;
}) {
  const router = useRouter(),
    search = useSearchParams();
  const date = (v: string | null) =>
    v ? jakartaDateTime(new Date(v)) : "Belum ada";
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.id}
      caption="Integration runs"
      pagination={{
        page,
        total,
        pageSize: 20,
        onPageChange: (next) => {
          const p = new URLSearchParams(search);
          p.set("page", String(next));
          router.push("/integrations?" + p);
        },
      }}
      columns={[
        {
          key: "time",
          label: "Waktu · WIB",
          value: (r) => date(r.started_at),
          sortable: false,
        },
        {
          key: "resource",
          label: "Resource / trigger",
          value: (r) => `${r.resource} / ${r.trigger}`,
          sortable: false,
        },
        {
          key: "status",
          label: "Status",
          value: (r) => r.status,
          sortable: false,
        },
        {
          key: "counts",
          label: "Read / written / failed",
          value: (r) =>
            `${r.records_read} / ${r.records_written} / ${r.records_failed}`,
          sortable: false,
        },
      ]}
      actions={(r) => (
        <DetailDrawer
          trigger={<Button variant="outline">Detail run</Button>}
          title="Detail eksekusi"
          description="Metadata operasional tanpa payload atau secret."
        >
          <dl className="space-y-3 break-all text-sm">
            <dt>Correlation ID</dt>
            <dd>{r.correlation_id}</dd>
            <dt>Mulai / selesai</dt>
            <dd>
              {date(r.started_at)} / {date(r.ended_at)}
            </dd>
            <dt>Durasi</dt>
            <dd>
              {r.ended_at
                ? `${Date.parse(r.ended_at) - Date.parse(r.started_at)} ms`
                : "Masih berjalan"}
            </dd>
            <dt>Error</dt>
            <dd>{r.error_summary ?? "Tidak ada"}</dd>
          </dl>
        </DetailDrawer>
      )}
    />
  );
}
export function IntegrationControl({
  id,
  job,
  label,
}: {
  id?: string;
  job?: string;
  label?: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (previous: { message: string }, form: FormData) => {
      const result = await integrationAction(previous, form);
      toast(result.message);
      router.refresh();
      return result;
    },
    {
      message: "",
    },
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="operation" value={id ? "retry" : "run"} />
      {id && <input type="hidden" name="id" value={id} />}
      {job && <input type="hidden" name="job" value={job} />}
      <Button variant="outline" disabled={pending} type="submit">
        {pending ? "Memproses…" : id ? "Retry now" : (label ?? "Run now")}
      </Button>
      <p role="status" className="text-sm">
        {state.message}
      </p>
    </form>
  );
}
