"use client";
import { useActionState } from "react";
import { metaIngestAction } from "@/services/meta-actions";
import { Button } from "@/components/ui/button";
export function MetaControls({
  resultType,
  hasProgress,
}: {
  resultType: string | null;
  hasProgress: boolean;
}) {
  const [state, action, pending] = useActionState(metaIngestAction, {
    message: "",
  });
  return (
    <>
      {hasProgress && (
        <form action={action}>
          <input type="hidden" name="operation" value="cancel-range" />
          <p className="mb-2 text-xs text-muted-foreground">
            Rentang yang tidak dapat dipulihkan dapat dibatalkan; data tersimpan
            tetap dipertahankan.
          </p>
          <Button variant="outline" disabled={pending}>
            Batalkan rentang tertunda
          </Button>
        </form>
      )}
      <form action={action} className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          {["from", "to"].map((name) => (
            <label key={name} className="text-sm">
              <span className="mb-1 block">
                {name === "from" ? "From" : "To"} · tanggal sumber
              </span>
              <input
                type="date"
                required
                name={name}
                className="h-10 max-w-full rounded border bg-background px-3"
              />
            </label>
          ))}
          <Button disabled={pending} variant="outline">
            {pending ? "Memproses…" : "Re-ingest range"}
          </Button>
        </div>
        <p role="status" className="text-sm">
          {state.message}
        </p>
      </form>
      <form action={action} className="space-y-2">
        <input type="hidden" name="operation" value="result-type" />
        <label className="block text-sm">
          Primary result action_type
          <input
            name="result_type"
            defaultValue={resultType ?? ""}
            className="mt-1 block h-10 w-full rounded border bg-background px-3"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Salin action_type yang benar dari konfigurasi measurement akun; kosong
          berarti tidak tersedia. Bukan jumlah inquiry PM OS.
        </p>
        <Button variant="outline" disabled={pending}>
          Simpan action type
        </Button>
      </form>
    </>
  );
}
