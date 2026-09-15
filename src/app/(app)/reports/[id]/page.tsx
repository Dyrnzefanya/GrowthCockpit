import { notFound } from "next/navigation";
import { PageHeader } from "@/components/operational";
import { StatusBadge } from "@/components/status-badge";
import { ReportEditor } from "@/components/report-controls";
import { ReportView } from "@/components/report-view";
import { reportDetail } from "@/services/reports";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const model = await reportDetail((await params).id);
  if (!model) notFound();
  const { report, facts } = model;
  return (
    <>
      <PageHeader
        title={`Weekly report · ${facts.period.isoWeek}`}
        description={`${facts.period.start} – ${facts.period.end} · Asia/Jakarta${facts.period.partial ? " · Partial period" : ""} · v${report.version}`}
        showDateRange={false}
        actions={
          <StatusBadge status={report.status === "final" ? "final" : "draft"} />
        }
      />
      <div className="mb-5">
        <ReportEditor
          id={report.id}
          initialRevision={report.updated_at}
          initialNarrative={report.narrative_md}
          final={report.status === "final"}
        />
      </div>
      <ReportView facts={facts} narrative={report.narrative_md} />
    </>
  );
}
