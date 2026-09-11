import Link from "next/link";
import { PageHeader, SectionCard } from "@/components/operational";
import { EmptyState } from "@/components/states";
export default function LeadDetail() {
  return (
    <>
      <PageHeader
        title="Inquiry detail"
        description="Contact, attribution, and lifecycle context for an inquiry."
        actions={
          <Link
            href="/leads"
            className="text-primary underline underline-offset-4"
          >
            Back to leads
          </Link>
        }
      />
      <SectionCard title="Inquiry record">
        <EmptyState
          title="Lead details are not active yet"
          description="This route does not represent an existing CRM record. Inquiry records and contact history become available when Leads is activated."
          phase={6}
        />
      </SectionCard>
    </>
  );
}
