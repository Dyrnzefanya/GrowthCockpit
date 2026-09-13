import { PageHeader, SectionCard } from "@/components/operational";
import { LeadImport } from "@/components/lead-import";
import { requireUser } from "@/services/session";
export default async function Page() {
  await requireUser();
  return (
    <>
      <PageHeader
        title="Import inquiry"
        description="Upload → mapping → dry-run → commit atomik. Re-import file yang sama tidak menggandakan inquiry."
      />
      <SectionCard title="CSV import">
        <LeadImport />
      </SectionCard>
    </>
  );
}
