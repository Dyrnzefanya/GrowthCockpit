import Link from "next/link";
import { PageHeader, SectionCard } from "@/components/operational";
import { EmptyState } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { reportList } from "@/services/reports";
import { generateReportFormAction } from "@/services/report-actions";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const model = await reportList(await searchParams);
  return (
    <>
      <PageHeader
        title="Reports"
        description="Weekly facts, learnings, and priorities for Marketing leadership."
        showDateRange={false}
        actions={
          <form
            action={generateReportFormAction}
            className="flex items-end gap-2"
          >
            <label className="field">
              <span className="text-xs font-medium">ISO week · WIB</span>
              <input
                aria-label="Report ISO week"
                className="native-control"
                type="week"
                name="week"
                required
                max={model.currentWeek}
                defaultValue={model.currentWeek}
              />
            </label>
            <Button type="submit">Generate report</Button>
          </form>
        }
      />
      <SectionCard
        title="Weekly reports"
        description="Monday–Sunday · Asia/Jakarta · newest version first"
      >
        {model.reports.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Finalized</th>
                  </tr>
                </thead>
                <tbody>
                  {model.reports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <Link
                          className="font-medium text-primary underline"
                          href={`/reports/${report.id}`}
                        >
                          {report.period_start} – {report.period_end}
                        </Link>
                      </td>
                      <td>v{report.version}</td>
                      <td>
                        <StatusBadge
                          status={report.status === "final" ? "final" : "draft"}
                        />
                      </td>
                      <td>
                        {report.finalized_at
                          ? new Intl.DateTimeFormat("id-ID", {
                              timeZone: "Asia/Jakarta",
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(report.finalized_at))
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav aria-label="Report pages" className="flex justify-between p-4">
              {model.page > 0 ? (
                <Link
                  className="text-primary underline"
                  href={`/reports?page=${model.page - 1}`}
                >
                  Previous
                </Link>
              ) : (
                <span />
              )}
              {(model.page + 1) * 20 < model.total ? (
                <Link
                  className="text-primary underline"
                  href={`/reports?page=${model.page + 1}`}
                >
                  Next
                </Link>
              ) : (
                <span />
              )}
            </nav>
          </>
        ) : (
          <EmptyState
            title="No weekly report yet"
            description="Choose the current or a past ISO week to assemble a report from stored GrowthCockpit facts."
          />
        )}
      </SectionCard>
    </>
  );
}
