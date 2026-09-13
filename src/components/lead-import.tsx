"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { csvFields, readCsv } from "@/domain/leads/csv";
import { importLeadAction } from "@/services/lead-actions";
type Result = Extract<
  Awaited<ReturnType<typeof importLeadAction>>,
  { ok: true }
>["result"];
export function LeadImport() {
  const [text, setText] = useState(""),
    [headers, setHeaders] = useState<string[]>([]),
    [mapping, setMapping] = useState<
      Partial<Record<(typeof csvFields)[number], string>>
    >({});
  const [result, setResult] = useState<Result | null>(null),
    [message, setMessage] = useState(""),
    [pending, start] = useTransition();
  function run(commit: boolean) {
    start(async () => {
      setMessage(
        commit
          ? "Commit atomik sedang berlangsung…"
          : "Memvalidasi dan merencanakan semua baris…",
      );
      const r = await importLeadAction(
        {
          text,
          mapping,
          ...(commit ? { fingerprint: result?.fingerprint } : {}),
        },
        commit,
      );
      if (r.ok) {
        setResult(r.result);
        setMessage(
          commit
            ? "Import selesai."
            : "Dry-run selesai. Belum ada data ditulis.",
        );
      } else setMessage(r.message);
    });
  }
  return (
    <div className="space-y-5 p-5">
      <ol
        className="flex flex-wrap gap-3 text-sm text-muted-foreground"
        aria-label="Langkah import"
      >
        <li>1. Upload</li>
        <li>2. Mapping</li>
        <li>3. Dry-run</li>
        <li>4. Commit</li>
        <li>5. Report</li>
      </ol>
      <p className="text-sm">
        UTF-8 CSV, maksimal 5 MB / 5.000 inquiry. Petakan waktu inquiry
        sebenarnya, bukan tanggal pembuatan Contact. Waktu tanpa offset dibaca
        sebagai WIB. Data diproses dalam memori.
      </p>
      <label className="field" htmlFor="csv-file">
        File CSV
        <input
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          disabled={pending}
          onChange={async (e) => {
            setResult(null);
            setMessage("");
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 5_000_000) {
              setMessage("File melebihi 5 MB.");
              return;
            }
            try {
              const source = new TextDecoder("utf-8", { fatal: true }).decode(
                await file.arrayBuffer(),
              );
              const csv = readCsv(source);
              setText(source);
              setHeaders(csv.headers);
              const auto: typeof mapping = {};
              for (const field of csvFields)
                if (csv.headers.includes(field)) auto[field] = field;
              setMapping(auto);
            } catch {
              setHeaders([]);
              setText("");
              setMessage(
                "CSV tidak valid: periksa UTF-8, header unik, jumlah baris, dan format kutipan.",
              );
            }
          }}
        />
      </label>
      {headers.length > 0 && (
        <fieldset
          disabled={pending || result?.committed}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <legend className="mb-3 font-medium">Pemetaan kolom</legend>
          {csvFields.map((field) => (
            <label className="field" htmlFor={"map-" + field} key={field}>
              {field}
              {field === "occurred_at" ? " (wajib)" : ""}
              <select
                id={"map-" + field}
                className="native-control"
                value={mapping[field] ?? ""}
                onChange={(e) => {
                  setMapping({ ...mapping, [field]: e.target.value });
                  setResult(null);
                }}
              >
                <option value="">Tidak dipetakan</option>
                {headers.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
          ))}
        </fieldset>
      )}
      {headers.length > 0 && !result?.committed && (
        <Button
          disabled={pending || !mapping.occurred_at}
          onClick={() => run(false)}
        >
          Jalankan dry-run
        </Button>
      )}
      {pending && (
        <progress className="w-full" aria-label="Pemrosesan import" />
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {result && (
        <section className="space-y-3" aria-label="Hasil import">
          <h2 className="font-medium">
            {result.committed ? "Laporan import" : "Pratinjau tanpa perubahan"}
          </h2>
          <p className="text-sm">
            Created: {result.counts.created} · Updated: {result.counts.updated}{" "}
            · Skipped: {result.counts.skipped} · Errors: {result.counts.errors}
          </p>
          <div
            className="table-scroll max-h-80"
            role="region"
            tabIndex={0}
            aria-label="Laporan per baris"
          >
            <table>
              <caption className="sr-only">Semua baris import</caption>
              <thead>
                <tr>
                  <th>Baris</th>
                  <th>Status</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {result.report.map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>{r.status}</td>
                    <td>{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!result.committed && (
            <Button
              disabled={pending || result.counts.errors > 0}
              onClick={() => run(true)}
            >
              Commit import
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
