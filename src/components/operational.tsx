import { Suspense, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Minus, CircleHelp } from "lucide-react";
import { StatusBadge, type Status } from "@/components/status-badge";
import type { MetricView } from "@/types/metric-view";
import { DateRangeControl } from "@/components/filter-bar";
import { cn } from "@/lib/utils";
export function PageHeader({
  title,
  description,
  actions,
  filters,
  showDateRange = true,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  filters?: ReactNode;
  showDateRange?: boolean;
}) {
  return (
    <header className="mb-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-64">
          <h1 className="break-words text-2xl tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 max-w-prose text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2">
          {showDateRange && (
            <Suspense
              fallback={
                <span className="text-sm text-muted-foreground">
                  Date range
                </span>
              }
            >
              <DateRangeControl />
            </Suspense>
          )}
          {actions}
        </div>
      </div>
      {filters}
    </header>
  );
}
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-lg border bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
        <div>
          <h2 className="text-sm">{title}</h2>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function MetricDelta({
  direction,
  isGood,
  comparison,
}: Pick<MetricView, "direction" | "isGood" | "comparison">) {
  const Icon = {
    up: ArrowUp,
    down: ArrowDown,
    flat: Minus,
    unknown: CircleHelp,
  }[direction];
  return (
    <span
      className={`inline-flex items-start gap-1 text-xs ${isGood === null ? "text-muted-foreground" : isGood ? "text-healthy" : "text-critical"}`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      <span>
        {comparison}
        <span className="sr-only">
          ; {direction};{" "}
          {isGood === null
            ? "not assessed"
            : isGood
              ? "favorable"
              : "unfavorable"}
        </span>
      </span>
    </span>
  );
}
export function MetricCard({
  title,
  metric,
  compact = false,
  context,
}: {
  title: string;
  metric: MetricView;
  compact?: boolean;
  context?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-lg border bg-card",
        compact ? "space-y-2 p-3" : "space-y-3 p-5",
      )}
    >
      <h3 className="text-sm text-muted-foreground">{title}</h3>
      {context && <p className="text-xs text-muted-foreground">{context}</p>}
      <p
        className={cn(
          "break-words font-semibold tabular-nums",
          compact ? "text-xl" : "text-2xl",
        )}
      >
        {metric.value === null ? (
          compact ? (
            <span title="No data">—</span>
          ) : (
            "Unavailable"
          )
        ) : (
          <>
            {metric.value.toLocaleString("en-US")}{" "}
            <span className="text-sm font-normal">{metric.unit}</span>
          </>
        )}
      </p>
      <MetricDelta {...metric} />
      <div>
        <StatusBadge status={metric.freshness} />
      </div>
    </section>
  );
}
export function AlertItem({
  severity,
  title,
  evidence,
  actions,
}: {
  severity: "info" | "warning" | "critical";
  title: string;
  evidence: string;
  actions?: ReactNode;
}) {
  return (
    <article className="space-y-2 border-b p-5 last:border-b-0">
      <StatusBadge status={severity} />
      <h3 className="text-sm">{title}</h3>
      <p className="text-muted-foreground">{evidence}</p>
      {actions}
    </article>
  );
}
export function IntegrationHealthCard({
  name,
  status,
  children,
}: {
  name: string;
  status: Status;
  children: ReactNode;
}) {
  return (
    <SectionCard title={name} action={<StatusBadge status={status} />}>
      {children}
    </SectionCard>
  );
}
export function Timeline({
  events,
}: {
  events: { id: string; title: string; time: string; description: string }[];
}) {
  return (
    <ol className="space-y-5 border-l pl-5">
      {events.map((event) => (
        <li key={event.id}>
          <p className="text-xs text-muted-foreground">{event.time}</p>
          <h3 className="text-sm">{event.title}</h3>
          <p className="text-muted-foreground">{event.description}</p>
        </li>
      ))}
    </ol>
  );
}
