import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, SectionCard } from "@/components/operational";
import { StatusBadge, type Status } from "@/components/status-badge";
import { OverrideForm, DealForm } from "@/components/leads";
import { leadDetail } from "@/services/leads";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const m = await leadDetail(
    (await params).id,
    (await searchParams).event_page,
  );
  if (!m) notFound();
  const l = m.lead,
    c = m.contact;
  const facts = [
    ["Contact", c?.full_name ?? "Belum teridentifikasi"],
    ["Email", c?.email],
    ["Telepon", c?.phone_e164],
    ["Perusahaan", m.company?.name],
    ["Waktu inquiry", l.inquiry_at],
    ["Tanggal bisnis", l.inquiry_date + " · Asia/Jakarta"],
    ["Produk", l.product_interest],
    ["Jumlah", l.estimated_quantity],
    ["Dibutuhkan", l.required_by_date],
    ["Owner", l.owner_id],
  ] as const;
  return (
    <>
      <PageHeader
        title="Detail inquiry"
        description={
          l.product_interest ?? "Inquiry tanpa produk teridentifikasi"
        }
        actions={<OverrideForm lead={l} />}
      />
      <p className="mb-4 text-sm">
        <Link className="text-primary underline" href="/leads">
          Kembali ke registry
        </Link>{" "}
        · Lead ID <span className="break-all">{l.id}</span>
      </p>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <SectionCard title="Identitas dan kebutuhan">
          <dl className="grid grid-cols-1 gap-3 p-5 text-sm sm:grid-cols-2">
            {facts.map(([key, value]) => (
              <div key={key} className="min-w-0">
                <dt className="text-muted-foreground">{key}</dt>
                <dd className="break-words">{value ?? "—"}</dd>
              </div>
            ))}
          </dl>
          <p className="whitespace-pre-wrap break-words px-5 pb-5 text-sm">
            {l.message ?? "Tidak ada pesan tambahan."}
          </p>
          <p className="px-5 pb-5 text-xs text-muted-foreground">
            Contact = orang. Inquiry berikutnya dari orang yang sama dapat
            menjadi lead baru.
          </p>
        </SectionCard>
        <SectionCard title="Kualifikasi dan flags">
          <div className="space-y-3 p-5 text-sm">
            <StatusBadge status={l.qualification_status as Status} />
            <p className="break-words">Alasan: {l.qualification_reason}</p>
            <p>Versi aturan: {l.qualification_rule_version}</p>
            <p>
              {l.manual_override
                ? "Override manual — tidak ditimpa otomatis"
                : "Keputusan engine saat inquiry dibuat"}
            </p>
            <p>
              {l.attribution_missing
                ? "Atribusi belum lengkap"
                : "Atribusi campaign tersedia"}
            </p>
            <p>
              {l.duplicate_suspect
                ? "Perlu pemeriksaan duplikat"
                : "Tidak ada konflik duplikat tersimpan"}
            </p>
            <p>HubSpot belum terhubung; pemetaan lifecycle belum tersedia.</p>
          </div>
        </SectionCard>
        <SectionCard title="Atribusi inquiry · last touch">
          <dl className="grid gap-3 p-5 text-sm sm:grid-cols-2">
            {[
              "platform",
              "lt_source",
              "lt_medium",
              "lt_campaign",
              "lt_content",
              "lt_term",
              "landing_page",
              "referrer",
              "click_id_type",
              "click_id",
              "campaign_id",
              "adset_id",
              "ad_id",
            ].map((k) => (
              <div key={k} className="min-w-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="break-all">
                  {String(l[k as keyof typeof l] ?? "—")}
                </dd>
              </div>
            ))}
          </dl>
        </SectionCard>
        <SectionCard title="Contact · first touch">
          <dl className="grid gap-3 p-5 text-sm sm:grid-cols-2">
            {[
              "ft_at",
              "ft_source",
              "ft_medium",
              "ft_campaign",
              "ft_content",
              "ft_term",
              "ft_landing_page",
              "ft_referrer",
            ].map((k) => (
              <div key={k} className="min-w-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="break-all">
                  {c ? String(c[k as keyof typeof c] ?? "—") : "—"}
                </dd>
              </div>
            ))}
          </dl>
        </SectionCard>
        <SectionCard
          title="Timeline stage"
          description="Append-only; perubahan disertai actor, sumber, dan waktu."
        >
          <ol className="divide-y">
            {m.events.map((e) => (
              <li key={e.id} className="space-y-2 p-5 text-sm">
                <p>
                  {e.from_status ?? "Inquiry dibuat"} →{" "}
                  <strong>{e.to_status}</strong> · {e.source}
                </p>
                <time>
                  {new Intl.DateTimeFormat("id-ID", {
                    timeZone: "Asia/Jakarta",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(e.changed_at))}{" "}
                  WIB
                </time>
                <p className="break-all text-xs text-muted-foreground">
                  Actor: {e.actor}
                </p>
                <p className="whitespace-pre-wrap break-words">{e.note}</p>
              </li>
            ))}
          </ol>
          <nav
            aria-label="Halaman timeline"
            className="flex flex-wrap gap-4 p-5 text-sm"
          >
            <span>
              {m.eventTotal} perubahan · Halaman {m.eventPage + 1}
            </span>
            {m.eventPage > 0 && (
              <Link
                className="text-primary underline"
                href={"/leads/" + l.id + "?event_page=" + (m.eventPage - 1)}
              >
                Sebelumnya
              </Link>
            )}
            {(m.eventPage + 1) * 20 < m.eventTotal && (
              <Link
                className="text-primary underline"
                href={"/leads/" + l.id + "?event_page=" + (m.eventPage + 1)}
              >
                Berikutnya
              </Link>
            )}
          </nav>
        </SectionCard>
        <SectionCard title={m.deal ? "Deal terkait" : "Tambah deal manual"}>
          <DealForm detail={m} />
        </SectionCard>
      </div>
    </>
  );
}
