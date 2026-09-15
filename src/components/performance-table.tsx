"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DataTable, type Column } from "@/components/data-table";
import { percent } from "@/domain/metrics/funnel";
import { formatMetric } from "@/domain/metrics/performance";
import type { performanceModel } from "@/services/performance";
type Model = Awaited<ReturnType<typeof performanceModel>>;
type Row = Model["rows"][number];
export function PerformanceTable({
  rows,
  total,
  page,
}: {
  rows: Row[];
  total: number;
  page: number;
}) {
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const navigate = (changes: Record<string, string>) => {
    const query = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => query.set(k, v));
    router.push(`${pathname}?${query}`);
  };
  const columns: Column<Row>[] = [
    { key: "name", label: "Campaign", value: (r) => r.name, sortable: true },
    ...(
      [
        "spend",
        "impressions",
        "clicks",
        "ctr",
        "cpc",
        "cpm",
        "leads",
        "mql",
        "mqlRate",
        "cpql",
      ] as const
    ).map((key) => ({
      key,
      label: {
        spend: "Spend",
        impressions: "Impressions",
        clicks: "Clicks",
        ctr: "CTR",
        cpc: "CPC",
        cpm: "CPM",
        leads: "Leads",
        mql: "MQL",
        mqlRate: "MQL rate",
        cpql: "CPQL",
      }[key],
      sortable: true,
      value: (r: Row) => r[key] ?? "—",
      render: (r: Row) => (
        <div className="text-right tabular-nums">
          <span title={r[key] === null ? "No data" : undefined}>
            {["ctr", "mqlRate"].includes(key)
              ? percent(r[key] as number | null)
              : formatMetric(
                  r[key],
                  ["spend", "cpc", "cpm", "cpql"].includes(key)
                    ? r.currency
                    : null,
                )}
          </span>
          <span className="block text-xs text-muted-foreground">
            Sebelumnya:{" "}
            {["ctr", "mqlRate"].includes(key)
              ? percent((r.previous?.[key] as number | null) ?? null)
              : formatMetric(
                  r.previous?.[key] ?? null,
                  ["spend", "cpc", "cpm", "cpql"].includes(key)
                    ? r.previous?.currency
                    : null,
                )}
          </span>
        </div>
      ),
    })),
    {
      key: "freshness",
      label: "Freshness",
      value: (r) => r.freshness.status,
      render: (r) => (
        <span title={r.freshness.oldest ?? "Belum tersedia"}>
          {r.freshness.status} · {r.freshness.ageHours ?? "—"} jam
        </span>
      ),
    },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.key}
      caption="Campaign performance · cohort · Meta source dates"
      pagination={{
        page,
        total,
        pageSize: 20,
        onPageChange: (p) => navigate({ page: String(p) }),
      }}
      onSortChange={(key, direction) =>
        navigate({ sort: key, direction, page: "0" })
      }
    />
  );
}
