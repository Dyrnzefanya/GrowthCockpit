"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { hubspotAction } from "@/services/hubspot-actions";
export function HubspotForm({ mapping }: { mapping?: string }) {
  const [state, action, pending] = useActionState(hubspotAction, {
    message: "",
  });
  return (
    <form action={action} className="space-y-3 p-5">
      {mapping !== undefined ? (
        <>
          <input type="hidden" name="operation" value="mapping" />
          <label className="field">
            HubSpot mapping (JSON)
            <textarea
              className="native-control min-h-56 w-full font-mono text-xs"
              name="mapping"
              defaultValue={mapping}
              maxLength={30000}
              required
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Gunakan ID portal, pipeline, stage dan owner sebenarnya. Mapping
            invalid menonaktifkan sync. Lifecycle write-back tetap nonaktif
            secara default.
          </p>
        </>
      ) : (
        <>
          <label className="field">
            Objek
            <select name="kind" className="native-control">
              <option>contacts</option>
              <option>companies</option>
              <option>deals</option>
            </select>
          </label>
          <label className="field">
            Record ID (opsional)
            <input
              className="native-control"
              name="recordId"
              inputMode="numeric"
              pattern="[0-9]+"
            />
          </label>
          <p className="text-xs">
            Isi record ID atau rentang tanggal perubahan CRM (WIB).
          </p>
          <div className="flex flex-wrap gap-3">
            <label className="field">
              From
              <input className="native-control" type="date" name="from" />
            </label>
            <label className="field">
              To
              <input className="native-control" type="date" name="to" />
            </label>
          </div>
        </>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={pending}
          type="submit"
          name="operation"
          value={mapping !== undefined ? "mapping" : "resync"}
        >
          {pending
            ? "Memproses…"
            : mapping !== undefined
              ? "Simpan mapping"
              : "Re-sync"}
        </Button>
        {mapping === undefined && (
          <Button
            disabled={pending}
            variant="outline"
            name="operation"
            value="run"
          >
            Run reconcile
          </Button>
        )}
      </div>
      <p role="status" className="text-sm">
        {state.message}
      </p>
    </form>
  );
}
