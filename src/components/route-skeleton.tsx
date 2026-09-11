import Link from "next/link";
import { ArrowUpRight, Plus, Upload } from "lucide-react";
import { navigation } from "@/config/navigation";
import {
  PageHeader,
  SectionCard,
  IntegrationHealthCard,
} from "@/components/operational";
import { EmptyState, NotConnectedState } from "@/components/states";
import { Button } from "@/components/ui/button";

const todaySections = [
  {
    title: "Alerts",
    description: "Important changes across your workspace.",
    empty: "Alerts are not active yet",
    detail: "Open alerts will appear here, grouped by severity.",
    phase: 9,
  },
  {
    title: "Priority actions",
    description: "What to work on next, and why.",
    empty: "Recommendations are not active yet",
    detail:
      "Evidence-backed priorities will appear when the decision engine is ready.",
    phase: 11,
  },
  {
    title: "Daily checklist",
    description: "A repeatable rhythm for focused work.",
    empty: "Your daily routine starts here",
    detail: "Weekday-aware checklists will keep the essentials in view.",
    phase: 3,
  },
  {
    title: "Quick notes",
    description: "Capture context while it is fresh.",
    empty: "Notes are not active yet",
    detail:
      "Date-linked notes will carry your observations into the weekly report.",
    phase: 3,
  },
  {
    title: "Experiment review queue",
    description: "Make time to learn from what you test.",
    empty: "No experiments to review yet",
    detail: "Running experiments due for review will appear here.",
    phase: 5,
  },
  {
    title: "Lead follow-up queue",
    description: "Keep qualified inquiries moving.",
    empty: "Lead follow-up is not active yet",
    detail:
      "Overdue follow-ups and inquiries missing attribution will appear here.",
    phase: 6,
  },
] as const;
const nouns: Record<
  string,
  { section: string; title: string; description: string }
> = {
  "/leads": {
    section: "Inquiry register",
    title: "No lead inquiries yet",
    description:
      "Each lead is an inquiry event. A single contact can have multiple inquiries. Add or import leads when this workspace is activated.",
  },
  "/funnel": {
    section: "Lead progression",
    title: "No lead data yet",
    description:
      "Qualification and outcome data will show how inquiries progress. Conversion rates remain unavailable until the underlying events exist.",
  },
  "/experiments": {
    section: "Experiment register",
    title: "No experiments yet",
    description:
      "Plan hypotheses, define success criteria, and review results in one place.",
  },
  "/playbook": {
    section: "Knowledge library",
    title: "No articles yet",
    description:
      "Document proven approaches and standard operating procedures for the work you repeat.",
  },
  "/workflows": {
    section: "Workflow templates",
    title: "No templates yet",
    description:
      "Create reusable daily and weekly checklists to support consistent execution.",
  },
  "/reports": {
    section: "Report archive",
    title: "No reports yet",
    description:
      "Weekly reports will connect performance facts, experiment learnings, and decisions.",
  },
};
export function RouteSkeleton({ route }: { route: string }) {
  const item = navigation.find((item) => item.href === route)!;
  return (
    <>
      <PageHeader
        title={item.label}
        description={item.description}
        actions={
          route === "/leads" ? (
            <>
              <Button disabled>
                <Plus aria-hidden="true" />
                Add lead
              </Button>
              <Button disabled variant="outline">
                <Upload aria-hidden="true" />
                Import CSV
              </Button>
            </>
          ) : undefined
        }
      />
      {route === "/today" ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Workspace setup <span className="mx-2">/</span> Sections activate
              as their capabilities become available.
            </p>
            <Link
              href="/integrations"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary"
            >
              View connections
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            {todaySections.map((section) => (
              <SectionCard
                key={section.title}
                title={section.title}
                description={section.description}
                action={
                  <span className="text-xs text-muted-foreground">
                    Phase {section.phase}
                  </span>
                }
              >
                <EmptyState
                  title={section.empty}
                  description={section.detail}
                  phase={section.phase}
                />
              </SectionCard>
            ))}
          </div>
          <SectionCard
            title="Data health"
            description="Source status and the last successful sync."
          >
            <EmptyState
              title="Source health is not available yet"
              description="Connection monitoring arrives in Phase 7; HubSpot, Slack, and Meta populate it in Phases 8–10."
              phase={7}
            />
          </SectionCard>
        </div>
      ) : route === "/integrations" ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {[
            {
              name: "HubSpot",
              phase: 8,
              description: "CRM contacts and lifecycle outcomes.",
            },
            {
              name: "Slack",
              phase: 9,
              description: "Operational alerts delivered to your team.",
            },
            {
              name: "Meta Ads",
              phase: 10,
              description: "Read-only paid media performance.",
            },
          ].map((source) => (
            <IntegrationHealthCard
              key={source.name}
              name={source.name}
              status="not_configured"
            >
              <NotConnectedState {...source} />
            </IntegrationHealthCard>
          ))}
          <SectionCard title="Connection activity">
            <EmptyState
              title="No integration runs yet"
              description="Run history and connection diagnostics become available with the integration foundation."
              phase={7}
            />
          </SectionCard>
        </div>
      ) : route === "/performance" ? (
        <SectionCard title="Paid media performance" className="max-w-3xl">
          <NotConnectedState
            name="Meta Ads"
            phase={10}
            description="Spend, campaigns, and performance comparisons will appear after a connection is configured. No performance data is available yet."
          />
        </SectionCard>
      ) : route === "/settings" ? (
        <div className="space-y-5">
          {[
            {
              title: "Profile & access",
              phase: 2,
              detail: "Account and authentication settings.",
            },
            {
              title: "CRM mapping",
              phase: 8,
              detail: "HubSpot field and lifecycle mapping.",
            },
            {
              title: "Decision thresholds",
              phase: 11,
              detail:
                "Versioned operating thresholds for deterministic recommendations.",
            },
          ].map((section) => (
            <SectionCard key={section.title} title={section.title}>
              <EmptyState
                title="Configuration not active yet"
                description={section.detail}
                phase={section.phase}
              />
            </SectionCard>
          ))}
        </div>
      ) : (
        <SectionCard title={nouns[route].section}>
          <EmptyState
            title={nouns[route].title}
            description={nouns[route].description}
            phase={item.phase}
          />
        </SectionCard>
      )}
    </>
  );
}
