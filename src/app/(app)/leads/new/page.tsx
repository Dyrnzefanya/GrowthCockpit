import { PageHeader, SectionCard } from "@/components/operational";
import { LeadForm } from "@/components/leads";
import { requireUser } from "@/services/session";
import { jakartaDateTime } from "@/domain/dates";
export default async function Page() {
  await requireUser();
  return (
    <>
      <PageHeader
        title="Inquiry baru"
        description="Catat kebutuhan, lalu lihat alasan kualifikasi. Atribusi yang belum tersedia tetap ditandai."
      />
      <SectionCard title="Catat inquiry">
        <LeadForm now={jakartaDateTime(new Date())} />
      </SectionCard>
    </>
  );
}
