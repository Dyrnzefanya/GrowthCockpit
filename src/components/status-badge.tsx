import {
  CircleCheck,
  CircleHelp,
  CircleAlert,
  TriangleAlert,
} from "lucide-react";
export const statusSemantics = {
  critical: "critical",
  attention: "attention",
  healthy: "healthy",
  unknown: "unknown",
  info: "unknown",
  warning: "attention",
  degraded: "attention",
  failing: "critical",
  not_configured: "unknown",
  pending: "unknown",
  in_progress: "attention",
  completed: "healthy",
  skipped: "unknown",
  draft: "unknown",
  published: "healthy",
  archived: "unknown",
  running: "attention",
  cancelled: "unknown",
  new: "unknown",
  mql: "healthy",
  sql: "healthy",
  disqualified: "unknown",
  open: "attention",
  won: "healthy",
  lost: "unknown",
  fresh: "healthy",
  stale: "attention",
  monitor: "unknown",
  investigate: "attention",
  hold: "unknown",
  scale_candidate: "healthy",
  pause_candidate: "attention",
  suppressed: "unknown",
} as const;
export type Status = keyof typeof statusSemantics;
const palette = {
  critical: { className: "bg-critical-soft text-critical", Icon: CircleAlert },
  attention: {
    className: "bg-attention-soft text-attention",
    Icon: TriangleAlert,
  },
  healthy: { className: "bg-healthy-soft text-healthy", Icon: CircleCheck },
  unknown: { className: "bg-unknown-soft text-unknown", Icon: CircleHelp },
};
export function StatusBadge({ status }: { status: Status }) {
  const { className, Icon } = palette[statusSemantics[status]];
  const label =
    status === "mql" || status === "sql"
      ? status.toUpperCase()
      : status.replaceAll("_", " ");
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium capitalize ${className}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
