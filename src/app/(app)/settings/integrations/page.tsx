import Link from "next/link";
import { IntegrationCenter } from "@/components/integration-center";
import { PageHeader } from "@/components/operational";
import { Button } from "@/components/ui/button";
import { integrationCenterModel } from "@/services/integration-center";

export default async function SettingsIntegrationsPage() {
  const model = await integrationCenterModel();
  return (
    <>
      <PageHeader
        title="Settings · Integrations"
        description="Manage provider configuration and verify read-only connections. Secret values are write-only."
        showDateRange={false}
        actions={
          <Button asChild variant="outline">
            <Link href="/integrations">Operational status</Link>
          </Button>
        }
      />
      <IntegrationCenter providers={model.providers} />
    </>
  );
}
