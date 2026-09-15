"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileCheck, Printer, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  exportReportAction,
  finalizeReportAction,
  saveReportAction,
} from "@/services/report-actions";

export function ReportEditor({
  id,
  initialRevision,
  initialNarrative,
  final,
}: {
  id: string;
  initialRevision: string;
  initialNarrative: string;
  final: boolean;
}) {
  const router = useRouter(),
    [pending, start] = useTransition(),
    [narrative, setNarrative] = useState(initialNarrative),
    [revision, setRevision] = useState(initialRevision),
    [message, setMessage] = useState("");
  const exportMarkdown = () =>
    start(async () => {
      try {
        const result = await exportReportAction(id),
          url = URL.createObjectURL(
            new Blob([result.markdown], {
              type: "text/markdown;charset=utf-8",
            }),
          ),
          link = document.createElement("a");
        link.href = url;
        link.download = result.filename;
        link.click();
        URL.revokeObjectURL(url);
      } catch {
        setMessage("Markdown export failed. Try again.");
      }
    });
  if (final)
    return (
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={exportMarkdown} disabled={pending}>
          <Download /> Export Markdown
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer /> Print
        </Button>
        <span aria-live="polite" className="text-sm text-critical">
          {message.startsWith("Markdown") ? message : ""}
        </span>
      </div>
    );
  const input = { id, revision, narrative };
  return (
    <section className="space-y-3 rounded-lg border bg-card p-5 print:hidden">
      <label className="field">
        <span className="font-medium">Editable narrative</span>
        <span className="text-xs text-muted-foreground">
          Edit executive summary, interpretation, and next priorities. Fact
          tables remain frozen inputs.
        </span>
        <Textarea
          aria-label="Report narrative Markdown"
          rows={16}
          maxLength={50000}
          value={narrative}
          onChange={(event) => setNarrative(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={pending || !narrative.trim()}
          onClick={() =>
            start(async () => {
              try {
                setRevision(await saveReportAction(input));
                setMessage("Draft saved.");
              } catch {
                setMessage(
                  "The draft changed or could not be saved. Reload and try again.",
                );
              }
            })
          }
        >
          <Save /> Save draft
        </Button>
        <Button
          disabled={pending || !narrative.trim()}
          onClick={() => {
            if (
              !window.confirm(
                "Finalize this report? Its facts and narrative cannot be changed afterward.",
              )
            )
              return;
            start(async () => {
              try {
                setMessage("");
                await finalizeReportAction(input);
                router.refresh();
              } catch {
                setMessage(
                  "Finalisation failed. Reload and verify the latest draft.",
                );
              }
            });
          }}
        >
          <FileCheck /> Finalize
        </Button>
        <Button variant="outline" onClick={exportMarkdown} disabled={pending}>
          <Download /> Export draft
        </Button>
        <span
          aria-live="polite"
          className="self-center text-sm text-muted-foreground"
        >
          {message}
        </span>
      </div>
    </section>
  );
}
