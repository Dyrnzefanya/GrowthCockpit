"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Search, CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readViewParams } from "@/lib/view-params";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function FilterBar({
  datesOnly = false,
  onApply,
}: {
  datesOnly?: boolean;
  onApply?: () => void;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const id = useId();
  const values = readViewParams(new URLSearchParams(params));
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const from = data.get("from")?.toString() ?? "";
    const to = data.get("to")?.toString() ?? "";
    const endInput = form.elements.namedItem("to") as HTMLInputElement;
    endInput.setCustomValidity(
      from && to && from > to ? "End date must be on or after start date." : "",
    );
    if (!form.reportValidity()) return;
    const next = new URLSearchParams(params);
    for (const key of datesOnly ? ["from", "to"] : ["q", "from", "to"]) {
      const value = data.get(key)?.toString().trim() ?? "";
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    router.push(pathname + (next.size ? "?" + next.toString() : ""), {
      scroll: false,
    });
    onApply?.();
  }
  return (
    <form
      key={params.toString()}
      onSubmit={apply}
      onInput={(event) => {
        const endInput = event.currentTarget.elements.namedItem(
          "to",
        ) as HTMLInputElement;
        endInput.setCustomValidity("");
      }}
      aria-label={datesOnly ? "Global date range" : "Filter records"}
      className={
        datesOnly
          ? "grid grid-cols-2 items-end gap-3"
          : "flex flex-wrap items-end gap-2"
      }
    >
      {!datesOnly && (
        <label className="field flex-1" htmlFor={id + "-q"}>
          <span className="flex items-center gap-1.5 text-xs font-medium">
            <Search className="size-3.5" aria-hidden="true" />
            Search
          </span>
          <input
            id={id + "-q"}
            name="q"
            className="native-control"
            defaultValue={values.query}
            maxLength={120}
            placeholder="Search records"
          />
        </label>
      )}
      <label className="field" htmlFor={id + "-from"}>
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          From
        </span>
        <input
          id={id + "-from"}
          name="from"
          type="date"
          className="native-control"
          defaultValue={values.from}
        />
      </label>
      <label className="field" htmlFor={id + "-to"}>
        <span className="text-xs font-medium">To</span>
        <input
          id={id + "-to"}
          name="to"
          type="date"
          className="native-control"
          defaultValue={values.to}
        />
      </label>
      <div
        className={
          datesOnly ? "col-span-2 flex justify-end gap-2" : "flex gap-2"
        }
      >
        <Button variant="outline" type="submit" className="min-h-10">
          Apply
        </Button>
        {(values.from || values.to || (!datesOnly && values.query)) && (
          <Button
            variant="ghost"
            type="button"
            className="min-h-10"
            onClick={() => {
              const next = new URLSearchParams(params);
              for (const key of datesOnly
                ? ["from", "to"]
                : ["q", "from", "to"])
                next.delete(key);
              router.push(pathname + (next.size ? "?" + next : ""), {
                scroll: false,
              });
              onApply?.();
            }}
          >
            Reset
          </Button>
        )}
      </div>
    </form>
  );
}

export function DateRangeControl() {
  const params = useSearchParams();
  const { from, to } = readViewParams(new URLSearchParams(params));
  const [open, setOpen] = useState(false);
  const range =
    from && to
      ? `${from} – ${to}`
      : from
        ? `From ${from}`
        : to
          ? `To ${to}`
          : "Date range";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          aria-label={`Date range: ${from || to ? range : "not selected"}`}
        >
          <CalendarDays aria-hidden="true" />
          <span className="tabular-nums">{range}</span>
          <ChevronDown
            className="size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-11/12 max-w-sm sm:max-w-sm">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Reporting date range</DialogTitle>
          <DialogDescription>
            Choose custom dates. Asia/Jakarta · WIB.
          </DialogDescription>
        </DialogHeader>
        <FilterBar datesOnly onApply={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
