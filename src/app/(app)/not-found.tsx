import Link from "next/link";
import { PageHeader, SectionCard } from "@/components/operational";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <>
      <PageHeader
        title="Page not found"
        description="This address does not belong to the workspace."
      />
      <SectionCard title="Find your way back">
        <EmptyState
          title="We could not find that page"
          description="Use the sidebar or return to your daily workspace."
          action={
            <Button asChild>
              <Link href="/today">Back to Today</Link>
            </Button>
          }
        />
      </SectionCard>
    </>
  );
}
