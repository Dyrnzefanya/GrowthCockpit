import type { ReactNode } from "react";
import { Inbox, Plug, TriangleAlert, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
export function EmptyState({
  title,
  description,
  phase,
  action,
}: {
  title: string;
  description: string;
  phase?: number;
  action?: ReactNode;
}) {
  return (
    <div className="state-panel">
      <div className="state-icon">
        <Inbox className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 space-y-1">
        <h3 className="text-sm">{title}</h3>
        <p className="max-w-prose text-sm text-muted-foreground">
          {description}
        </p>
        {phase && (
          <p className="pt-1 text-xs text-muted-foreground">
            Available in Phase {phase}
          </p>
        )}
        {action && <div className="pt-3">{action}</div>}
      </div>
    </div>
  );
}
export function NotConnectedState({
  name,
  phase,
  description,
}: {
  name: string;
  phase: number;
  description?: string;
}) {
  return (
    <div className="state-panel">
      <div className="state-icon">
        <Plug className="size-4" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm">{name} is not connected yet</h3>
        <p className="max-w-prose text-muted-foreground">
          {description ??
            "Connect this source to make its data available here."}
        </p>
        <p className="pt-1 text-xs text-muted-foreground">
          Connection available in Phase {phase}
        </p>
      </div>
    </div>
  );
}
export function ErrorState({
  title = "This section could not load",
  onRetry,
}: {
  title?: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="state-panel">
      <TriangleAlert aria-hidden="true" className="size-5 text-critical" />
      <div className="space-y-2">
        <h3>{title}</h3>
        <p className="text-muted-foreground">
          Try again. Navigation and other sections are still available.
        </p>
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}
export function StaleBanner({ updatedAt }: { updatedAt: string }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-md border border-attention/30 bg-attention-soft px-4 py-3 text-attention"
    >
      <Clock3 className="mt-0.5 size-4" aria-hidden="true" />
      <p>
        Data may be out of date. Last updated:{" "}
        <span className="font-medium">{updatedAt}</span>
      </p>
    </div>
  );
}
export function LoadingSkeleton({
  pattern = "section",
}: {
  pattern?: "section" | "metric" | "table";
}) {
  return (
    <div
      role="status"
      aria-label={`Loading ${pattern}`}
      className="space-y-3 p-5"
    >
      <span className="sr-only">Loading {pattern}</span>
      <div aria-hidden="true" className="h-3 w-1/3 rounded-sm bg-muted" />
      {Array.from(
        { length: pattern === "table" ? 5 : pattern === "metric" ? 1 : 3 },
        (_, index) => (
          <div
            aria-hidden="true"
            key={index}
            className="h-6 w-full rounded-sm bg-muted"
          />
        ),
      )}
    </div>
  );
}
