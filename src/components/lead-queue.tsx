import Link from "next/link";
import { SectionCard } from "@/components/operational";
import { EmptyState } from "@/components/states";
import { followUpQueue } from "@/services/leads";
export async function LeadQueue() {
  const result = await followUpQueue().catch(() => null);
  return (
    <SectionCard
      title="Lead follow-up queue"
      description="Review inquiry baru, lengkapi atribusi, dan tindak lanjuti MQL/SQL lewat SLA hari kerja WIB."
    >
      {!result ? (
        <p role="alert" className="p-5 text-sm">
          Queue belum dapat dimuat.{" "}
          <Link className="underline" href="/today">
            Muat ulang
          </Link>
        </p>
      ) : !result.total ? (
        <EmptyState
          title="Tidak ada inquiry yang perlu ditindaklanjuti"
          description="Queue berasal dari lead nyata, tanpa aktivitas CRM eksternal."
        />
      ) : (
        <>
          <ol className="divide-y">
            {result.rows.map((l) => (
              <li key={l.id} className="space-y-1 p-4">
                <Link
                  className="text-sm font-medium text-primary underline"
                  href={"/leads/" + l.id}
                >
                  {l.product_interest ?? "Inquiry tanpa produk"} ·{" "}
                  {l.qualification_status.toUpperCase()}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {l.reasons.join(" · ")}
                </p>
              </li>
            ))}
          </ol>
          <p className="p-4 text-xs text-muted-foreground">
            {result.total} inquiry perlu perhatian; menampilkan maksimal 20.{" "}
            <Link className="underline" href="/leads">
              Buka registry
            </Link>
          </p>
        </>
      )}
    </SectionCard>
  );
}
