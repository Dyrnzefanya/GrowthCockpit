import Link from "next/link";
import { PageHeader } from "@/components/operational";
import { ExperimentEditor } from "@/components/experiments";
import { experimentDefaults } from "@/services/experiments";
import { z } from "zod";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const defaults = await experimentDefaults();
  const campaignId = z
    .string()
    .max(200)
    .catch("")
    .parse((await searchParams).campaign_id);
  return (
    <>
      <PageHeader
        title="Eksperimen baru"
        description="Catat hipotesis dalam satu layar; detail tambahan tetap opsional."
        actions={
          <Link className="text-sm text-primary underline" href="/experiments">
            Batal
          </Link>
        }
      />
      <ExperimentEditor defaults={defaults} initialCampaignId={campaignId} />
    </>
  );
}
