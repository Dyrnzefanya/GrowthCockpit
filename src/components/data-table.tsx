"use client";
import { useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { EmptyState, LoadingSkeleton } from "@/components/states";
export type Column<T> = {
  key: string;
  label: string;
  value: (row: T) => string | number;
  render?: (row: T) => ReactNode;
};
type Pagination = {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
};
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  actions,
  loading = false,
  query = "",
  pagination,
  onSortChange,
  caption = "Records",
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  actions?: (row: T) => ReactNode;
  loading?: boolean;
  query?: string;
  pagination?: Pagination;
  onSortChange?: (key: string, direction: "asc" | "desc") => void;
  caption?: string;
}) {
  const [sort, setSort] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  // PRD: callers provide server-paged rows above 500; this component performs no fetching.
  if (!pagination && rows.length > 500)
    throw new Error("DataTable requires server pagination above 500 rows.");
  const visible = columns.filter((column) => !hidden.includes(column.key));
  const filtered = pagination
    ? rows
    : rows.filter((row) =>
        columns.some((column) =>
          String(column.value(row)).toLowerCase().includes(query.toLowerCase()),
        ),
      );
  const sortColumn = columns.find((column) => column.key === sort?.key);
  const sorted =
    sortColumn && !pagination
      ? [...filtered].sort((a, b) => {
          const av = sortColumn.value(a);
          const bv = sortColumn.value(b);
          const difference =
            typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv));
          return difference * (sort?.direction === "asc" ? 1 : -1);
        })
      : filtered;
  const total = pagination?.total ?? sorted.length;
  const pages = Math.max(1, Math.ceil(total / 10));
  const current = Math.min(pagination?.page ?? page, pages - 1);
  const displayed = pagination
    ? rows
    : sorted.slice(current * 10, current * 10 + 10);
  function go(next: number) {
    if (pagination) pagination.onPageChange(next);
    else setPage(next);
  }
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3 p-4">
        <p className="text-xs text-muted-foreground">
          {loading ? "Loading records" : `${total} records`}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <SlidersHorizontal className="size-3.5" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={!hidden.includes(column.key)}
                disabled={!hidden.includes(column.key) && visible.length === 1}
                onCheckedChange={(checked) =>
                  setHidden(
                    checked
                      ? hidden.filter((key) => key !== column.key)
                      : [...hidden, column.key],
                  )
                }
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {loading ? (
        <LoadingSkeleton pattern="table" />
      ) : !total ? (
        <EmptyState
          title="No records"
          description="Records matching this view will appear here. Try another filter."
        />
      ) : (
        <>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label={caption}
          >
            <table>
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr>
                  {visible.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={
                        sort?.key === column.key
                          ? sort.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        className="flex items-center gap-2 text-left"
                        onClick={() => {
                          const direction =
                            sort?.key === column.key && sort.direction === "asc"
                              ? "desc"
                              : "asc";
                          setSort({ key: column.key, direction });
                          go(0);
                          onSortChange?.(column.key, direction);
                        }}
                      >
                        {column.label}
                        {sort?.key === column.key ? (
                          sort.direction === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3" />
                        )}
                      </button>
                    </th>
                  ))}
                  {actions && <th scope="col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {displayed.map((row) => (
                  <tr key={rowKey(row)} className="hover:bg-muted/50">
                    {visible.map((column) => (
                      <td key={column.key}>
                        <div
                          className="max-w-64 truncate"
                          title={String(column.value(row))}
                        >
                          {column.render?.(row) ?? column.value(row)}
                        </div>
                      </td>
                    ))}
                    {actions && <td>{actions(row)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 p-4">
            <p aria-live="polite" className="text-xs text-muted-foreground">
              Page {current + 1} of {pages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={current === 0}
                onClick={() => go(current - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={current + 1 >= pages}
                onClick={() => go(current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
