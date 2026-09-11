"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import {
  PageHeader,
  SectionCard,
  MetricCard,
  AlertItem,
  IntegrationHealthCard,
  Timeline,
} from "@/components/operational";
import {
  EmptyState,
  ErrorState,
  StaleBanner,
  NotConnectedState,
  LoadingSkeleton,
} from "@/components/states";
import {
  StatusBadge,
  statusSemantics,
  type Status,
} from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { DetailDrawer, ConfirmDialog } from "@/components/overlays";

type Example = { id: string; name: string; company: string; stage: Status };
// Illustrative fixtures must remain inside this server-gated gallery directory.
const examples: Example[] = Array.from({ length: 200 }, (_, index) => ({
  id: String(index + 1),
  name: `Illustrative inquiry ${String(index + 1).padStart(3, "0")}`,
  company:
    index === 0
      ? "Illustrative company with an intentionally long name to verify cell truncation and accessible full text"
      : "Example organization",
  stage: index % 2 === 0 ? "new" : "mql",
}));
const columns: Column<Example>[] = [
  { key: "name", label: "Inquiry", value: (row) => row.name },
  { key: "company", label: "Company", value: (row) => row.company },
  {
    key: "stage",
    label: "Qualification",
    value: (row) => row.stage,
    render: (row) => <StatusBadge status={row.stage} />,
  },
];
export function Gallery() {
  const searchParams = useSearchParams();
  const [count, setCount] = useState(200);
  const [loading, setLoading] = useState(false);
  const [retried, setRetried] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  return (
    <TooltipProvider>
      <div className="space-y-6">
        <PageHeader
          title="Component gallery"
          description="Development only · Every record, metric, and timeline below is illustrative. Nothing here is production data."
        />
        <div className="rounded-md border border-attention/30 bg-attention-soft p-4 font-medium text-attention">
          ILLUSTRATIVE CONTENT — design and interaction review only
        </div>
        <SectionCard
          title="Status vocabulary"
          description="One token set. An icon and a label for every state."
        >
          <div className="flex flex-wrap gap-3 p-5">
            {(Object.keys(statusSemantics) as Status[]).map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </SectionCard>
        <SectionCard
          title="Metric presentation"
          description="Illustrative values. Comparison and freshness are always explicit."
        >
          <div className="grid gap-4 p-5 md:grid-cols-3">
            <MetricCard
              title="Illustrative qualified inquiries"
              metric={{
                value: 24,
                unit: "inquiries",
                comparison: "+4 vs previous period",
                direction: "up",
                isGood: true,
                freshness: "fresh",
              }}
            />
            <MetricCard
              title="Illustrative cost per inquiry"
              metric={{
                value: 125,
                unit: "example units",
                comparison: "−8 vs previous period",
                direction: "down",
                isGood: true,
                freshness: "stale",
              }}
            />
            <MetricCard
              title="Unavailable metric"
              metric={{
                value: null,
                unit: "",
                comparison: "No comparison available",
                direction: "unknown",
                isGood: null,
                freshness: "unknown",
              }}
            />
          </div>
        </SectionCard>
        <SectionCard
          title="Table & filters"
          description="Injected 0, 1, or 200 example rows; sorting, pagination, visibility, and row actions."
        >
          <div className="space-y-4 p-5">
            <FilterBar />
            <div className="flex flex-wrap items-center gap-3">
              <label className="field" htmlFor="row-count">
                Example rows
                <select
                  id="row-count"
                  className="native-control"
                  value={count}
                  onChange={(event) => setCount(Number(event.target.value))}
                >
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={200}>200</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={loading}
                  onCheckedChange={(value) => setLoading(value === true)}
                />
                Show table loading
              </label>
            </div>
          </div>
          <DataTable
            rows={examples.slice(0, count)}
            columns={columns}
            rowKey={(row) => row.id}
            loading={loading}
            query={searchParams.get("q") ?? ""}
            caption="Illustrative inquiries"
            actions={(row) => (
              <DetailDrawer
                title={row.name}
                description="Illustrative inquiry. No CRM record is loaded."
                trigger={
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`View ${row.name}`}
                  >
                    View
                  </Button>
                }
              >
                <p>{row.company}</p>
                <div className="mt-4">
                  <StatusBadge status={row.stage} />
                </div>
              </DetailDrawer>
            )}
          />
        </SectionCard>
        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard title="Empty">
            <EmptyState
              title="No items yet"
              description="This is the shared empty-state pattern."
              action={
                <Button onClick={() => toast("Illustrative action only")}>
                  Example action
                </Button>
              }
            />
          </SectionCard>
          <SectionCard title="Error">
            {retried ? (
              <div role="status" className="p-5">
                Illustrative retry completed.
              </div>
            ) : (
              <ErrorState
                title="Illustrative connection failure"
                onRetry={() => setRetried(true)}
              />
            )}
          </SectionCard>
          <SectionCard title="Loading">
            <LoadingSkeleton />
            <LoadingSkeleton pattern="metric" />
          </SectionCard>
          <IntegrationHealthCard
            name="Illustrative connection"
            status="not_configured"
          >
            <NotConnectedState name="Example source" phase={8} />
          </IntegrationHealthCard>
        </div>
        <StaleBanner updatedAt="2 hours ago · illustrative timestamp" />
        <SectionCard title="Alerts & timeline">
          <AlertItem
            severity="warning"
            title="Illustrative freshness warning"
            evidence="Example evidence explains why attention is needed."
            actions={
              <Button
                variant="outline"
                onClick={() => toast("Illustrative acknowledgement")}
              >
                Acknowledge example
              </Button>
            }
          />
          <div className="p-5">
            <Timeline
              events={[
                {
                  id: "one",
                  title: "Illustrative observation recorded",
                  time: "09:00 WIB · example",
                  description: "Timeline events show context and chronology.",
                },
                {
                  id: "two",
                  title: "Illustrative review completed",
                  time: "10:00 WIB · example",
                  description: "No workflow or business event is created.",
                },
              ]}
            />
          </div>
        </SectionCard>
        <SectionCard title="Inputs & controls">
          <div className="grid gap-6 p-5 md:grid-cols-2">
            <label className="field" htmlFor="example-input">
              Example input
              <Input
                id="example-input"
                placeholder="Enter an illustrative label"
              />
            </label>
            <div className="field">
              <label htmlFor="example-select">Example select</label>
              <Select defaultValue="all">
                <SelectTrigger id="example-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All examples</SelectItem>
                  <SelectItem value="selected">Selected examples</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="field" htmlFor="example-textarea">
              Example notes
              <Textarea
                id="example-textarea"
                placeholder="Illustrative notes only"
              />
            </label>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <Switch />
                Example switch
              </label>
              <RadioGroup defaultValue="a" aria-label="Example choice">
                <label className="flex items-center gap-2">
                  <RadioGroupItem value="a" />
                  Choice A
                </label>
                <label className="flex items-center gap-2">
                  <RadioGroupItem value="b" />
                  Choice B
                </label>
              </RadioGroup>
              <div className="flex gap-2">
                <Badge>Badge</Badge>
                <Badge variant="outline">Tag</Badge>
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex flex-wrap gap-3 p-5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Focus for tooltip</Button>
              </TooltipTrigger>
              <TooltipContent>Additional illustrative context</TooltipContent>
            </Tooltip>
            <ConfirmDialog
              title="Confirm illustrative action?"
              description="This demonstrates confirmation behavior. No production record is changed."
              onConfirm={() => setConfirmed(true)}
              trigger={<Button>Open confirmation</Button>}
            />
            <Button
              variant="outline"
              onClick={() => toast.success("Illustrative toast delivered")}
            >
              Show toast
            </Button>
            {confirmed && <p role="status">Illustrative action confirmed.</p>}
          </div>
          <div className="p-5 pt-0">
            <Tabs defaultValue="overview">
              <TabsList aria-label="Example views">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                Illustrative overview panel.
              </TabsContent>
              <TabsContent value="details">
                Illustrative details panel.
              </TabsContent>
            </Tabs>
          </div>
        </SectionCard>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}
