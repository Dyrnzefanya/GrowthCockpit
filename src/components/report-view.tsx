import ReactMarkdown from "react-markdown";
import { SectionCard } from "@/components/operational";
import { StatusBadge } from "@/components/status-badge";
import { formatMetric } from "@/domain/metrics/performance";
import type { ReportFacts } from "@/config/report-schema";

const metricLabels = {
  spend: "Spend",
  leads: "Leads · joined",
  cpl: "CPL · diagnostic",
  mql: "MQL",
  cpql: "CPQL",
  sql: "SQL",
  cpsql: "CPSQL",
  opportunities: "Opportunities",
  revenue: "Attributed revenue",
  roas: "ROAS",
  cac: "CAC",
} as const;

const percent = (value: number | null) =>
  value === null ? "—" : `${(value * 100).toFixed(1)}%`;
const money = new Set(["spend", "cpl", "cpql", "cpsql", "revenue", "cac"]);

export function ReportView({
  facts,
  narrative,
}: {
  facts: ReportFacts;
  narrative: string;
}) {
  const metrics = Object.entries(facts.metrics).filter(
    ([key]) =>
      facts.caveats.revenueAvailable ||
      !["revenue", "roas", "cac"].includes(key),
  ) as [
    keyof typeof metricLabels,
    ReportFacts["metrics"][keyof ReportFacts["metrics"]],
  ][];
  const displayedCampaigns = facts.campaigns.slice(0, 500);
  return (
    <article className="report-print space-y-5">
      <section className="rounded-lg border bg-card p-5">
        <div className="playbook-prose max-w-none">
          <ReactMarkdown>{narrative}</ReactMarkdown>
        </div>
      </section>
      <SectionCard
        title="Performance"
        description="Cohort basis · all joined campaigns · current vs previous ISO week"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Current</th>
                <th>Previous</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(([key, item]) => (
                <tr key={key}>
                  <td>{metricLabels[key]}</td>
                  <td>
                    {formatMetric(
                      item.current,
                      money.has(key) ? item.unit : undefined,
                    )}
                    {key === "roas" && item.current !== null ? "x" : ""}
                  </td>
                  <td>
                    {formatMetric(
                      item.previous,
                      money.has(key) ? item.unit : undefined,
                    )}
                    {key === "roas" && item.previous !== null ? "x" : ""}
                  </td>
                  <td>{percent(item.change)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      {!facts.caveats.revenueAvailable && (
        <div className="rounded-md border border-attention/30 bg-attention-soft p-4 text-sm text-attention">
          {facts.caveats.revenueReason}
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Lead quality and follow-up">
          <dl className="grid grid-cols-2 gap-3 p-5 text-sm">
            <dt>MQL rate</dt>
            <dd>{percent(facts.funnel.mqlRate)}</dd>
            <dt>SQL rate</dt>
            <dd>{percent(facts.funnel.sqlRate)}</dd>
            <dt>Win rate</dt>
            <dd>{percent(facts.funnel.winRate)}</dd>
            <dt>Required workflow completion</dt>
            <dd>{percent(facts.workflow.rate)}</dd>
            <dt>Workflow runs</dt>
            <dd>{facts.workflow.runs}</dd>
            <dt>Disqualified leads</dt>
            <dd>{facts.funnel.disqualified}</dd>
          </dl>
        </SectionCard>
        <SectionCard title="Experiments">
          <div className="space-y-4 p-5 text-sm">
            <div>
              <h3 className="font-medium">Completed with learning</h3>
              {facts.experiments.completed.length ? (
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  {facts.experiments.completed.map((item) => (
                    <li key={item.code}>
                      <strong>{item.code}</strong> · {item.title}:{" "}
                      {item.learning}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-muted-foreground">
                  No completed experiment in this week.
                </p>
              )}
            </div>
            <div>
              <h3 className="font-medium">Running</h3>
              {facts.experiments.running.length ? (
                <ul className="mt-2 list-disc pl-5">
                  {facts.experiments.running.map((item) => (
                    <li key={item.code}>
                      {item.code} · {item.title} · review {item.reviewDate}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-muted-foreground">
                  No running experiment.
                </p>
              )}
            </div>
          </div>
        </SectionCard>
      </div>
      <SectionCard
        title="What changed — campaign facts"
        description={
          facts.campaigns.length > displayedCampaigns.length
            ? "Read-only facts ordered by spend · showing the first 500; Markdown export contains the full snapshot"
            : "Read-only facts ordered by spend"
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Spend</th>
                <th>Leads</th>
                <th>MQL</th>
                <th>CPQL</th>
              </tr>
            </thead>
            <tbody>
              {displayedCampaigns.length ? (
                displayedCampaigns.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{formatMetric(item.spend, item.currency)}</td>
                    <td>{item.leads}</td>
                    <td>{item.mql}</td>
                    <td>{formatMetric(item.cpql, item.currency)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    No campaign facts are available for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Notes">
          <ul className="space-y-3 p-5 text-sm">
            {facts.notes.length ? (
              facts.notes.map((item, index) => (
                <li key={`${item.date}-${index}`}>
                  <span className="text-muted-foreground">{item.date}</span> ·{" "}
                  {item.body}
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">
                No notes captured for this week.
              </li>
            )}
          </ul>
        </SectionCard>
        <SectionCard title="Unresolved issues">
          <ul className="space-y-3 p-5 text-sm">
            {facts.issues.length ? (
              facts.issues.map((item, index) => (
                <li key={`${item.title}-${index}`}>
                  <StatusBadge
                    status={
                      item.severity === "critical"
                        ? "critical"
                        : item.severity === "warning"
                          ? "warning"
                          : "info"
                    }
                  />{" "}
                  <span className="ml-2 font-medium">{item.title}</span>
                  <p className="mt-1 text-muted-foreground">{item.message}</p>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">
                No unresolved alert was captured at generation time.
              </li>
            )}
          </ul>
        </SectionCard>
      </div>
      <SectionCard
        title="Data-quality caveats"
        description="Mandatory · captured when this version was generated"
      >
        <ul className="list-disc space-y-2 p-5 pl-10 text-sm">
          {facts.caveats.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>
    </article>
  );
}
