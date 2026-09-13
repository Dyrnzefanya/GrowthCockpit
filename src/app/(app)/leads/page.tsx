import Link from "next/link";
import { PageHeader, SectionCard } from "@/components/operational";
import { Button } from "@/components/ui/button";
import { LeadTable, Choice, Field } from "@/components/leads";
import { leadLibrary } from "@/services/leads";
import { leadStatuses, channels, platforms } from "@/config/lead-schema";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const m = await leadLibrary(await searchParams),
    f = m.filters;
  return (
    <>
      <PageHeader
        title="Leads"
        description="Satu baris = satu inquiry. Satu Contact (orang) dapat memiliki beberapa inquiry."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/leads/import">Import CSV</Link>
            </Button>
            <Button asChild>
              <Link href="/leads/new">Inquiry baru</Link>
            </Button>
          </>
        }
      />
      <SectionCard
        title="Registry inquiry"
        description="Kualifikasi q1, atribusi per inquiry, dan riwayat perubahan. Data manual/import; belum terhubung CRM."
      >
        <form
          className="grid items-end gap-3 border-b p-5 sm:grid-cols-2 xl:grid-cols-4"
          method="get"
          key={JSON.stringify(f)}
        >
          <Choice
            name="status"
            label="Status"
            values={["", ...leadStatuses]}
            value={f.status}
          />
          <Choice
            name="channel"
            label="Channel"
            values={["", ...channels]}
            value={f.channel}
          />
          <Choice
            name="platform"
            label="Platform"
            values={["", ...platforms]}
            value={f.platform}
          />
          <Field
            name="campaign"
            label="Campaign (cocok persis)"
            value={f.campaign}
          />
          <Choice
            name="attribution"
            label="Atribusi"
            values={["all", "complete", "missing"]}
            value={f.attribution}
          />
          <Field name="owner" label="Owner profile ID" value={f.owner} />
          <Field
            name="from"
            label="Dari tanggal · WIB"
            type="date"
            value={f.from ?? ""}
          />
          <Field
            name="to"
            label="Sampai tanggal · WIB"
            type="date"
            value={f.to ?? ""}
          />
          <Button>Terapkan filter</Button>
          <Link className="text-sm text-primary underline" href="/leads">
            Reset filter
          </Link>
        </form>
        <LeadTable rows={m.rows} total={m.total} page={f.page} />
      </SectionCard>
    </>
  );
}
