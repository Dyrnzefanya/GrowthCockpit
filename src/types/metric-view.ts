export type MetricView = {
  value: number | null;
  unit: string;
  comparison: string;
  direction: "up" | "down" | "flat" | "unknown";
  isGood: boolean | null;
  freshness: "fresh" | "stale" | "unknown";
};
