"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { StatusBadge, type Status } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createLeadAction,
  overrideLeadAction,
  saveDealAction,
} from "@/services/lead-actions";
import { channels, platforms, leadStatuses } from "@/config/lead-schema";
import type { leadLibrary, leadDetail } from "@/services/leads";
export function Field({
  name,
  label,
  type = "text",
  value = "",
  required = false,
  maxLength = 4000,
}: {
  name: string;
  label: string;
  type?: string;
  value?: string | number;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="field min-w-0" htmlFor={name}>
      {label}
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        maxLength={maxLength}
        className="native-control w-full min-w-0"
        step={type === "number" ? "any" : undefined}
      />
    </label>
  );
}
export function Choice({
  name,
  label,
  values,
  value = "",
}: {
  name: string;
  label: string;
  values: readonly string[];
  value?: string;
}) {
  return (
    <label className="field min-w-0" htmlFor={name}>
      {label}
      <select
        className="native-control"
        id={name}
        name={name}
        defaultValue={value}
      >
        {values.map((v) => (
          <option key={v} value={v}>
            {v || "Semua"}
          </option>
        ))}
      </select>
    </label>
  );
}
export function LeadForm({ now }: { now: string }) {
  const router = useRouter(),
    token = useRef<string>(crypto.randomUUID());
  const [pending, start] = useTransition(),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-6 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const value = {
          ...Object.fromEntries(form),
          out_of_scope: form.get("out_of_scope") === "on",
        };
        start(async () => {
          setError("");
          const result = await createLeadAction(value, token.current);
          if (result.ok && result.result.leadId)
            router.push("/leads/" + result.result.leadId);
          else setError(result.ok ? "Inquiry belum tersimpan" : result.message);
        });
      }}
    >
      <p className="text-sm text-muted-foreground">
        Satu lead adalah satu inquiry. Orang yang sama dapat memiliki beberapa
        lead. Tanpa email/telepon yang valid, inquiry tetap disimpan sebagai
        DQ_NO_CONTACT tanpa membuat Contact.
      </p>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-medium">
          Identitas dan waktu inquiry
        </legend>
        <Field
          name="occurred_at"
          label="Waktu inquiry · WIB"
          type="datetime-local"
          value={now}
          required
        />
        <Choice
          name="channel"
          label="Channel"
          values={channels}
          value="manual"
        />
        <Field name="full_name" label="Nama orang" maxLength={160} />
        <Field name="email" label="Email" maxLength={254} />
        <Field
          name="phone"
          label="Telepon / WhatsApp"
          type="tel"
          maxLength={50}
        />
        <Field name="company_name" label="Perusahaan" maxLength={200} />
        <Field
          name="company_domain"
          label="Domain perusahaan"
          maxLength={254}
        />
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-medium">Kebutuhan</legend>
        <Field
          name="product_interest"
          label="Produk yang diminati"
          maxLength={200}
        />
        <Field
          name="estimated_quantity"
          label="Estimasi jumlah (kosong = belum diketahui)"
          type="number"
        />
        <Field name="required_by_date" label="Tanggal dibutuhkan" type="date" />
        <label className="field sm:col-span-2" htmlFor="message">
          Pesan / kebutuhan
          <textarea
            className="native-control min-h-24"
            name="message"
            id="message"
            maxLength={4000}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="out_of_scope" /> Permintaan eksplisit di
          luar katalog produk
        </label>
      </fieldset>
      <details className="rounded-md border p-4">
        <summary className="cursor-pointer font-medium">
          Atribusi dan owner (opsional)
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Choice
            name="platform"
            label="Platform"
            values={platforms}
            value="unknown"
          />
          {(["source", "medium", "campaign", "content", "term"] as const).map(
            (k) => (
              <Field
                key={k}
                name={"utm_" + k}
                label={"UTM " + k}
                maxLength={300}
              />
            ),
          )}
          <Field name="landing_page" label="Landing page" />
          <Field name="referrer" label="Referrer" />
          <Choice
            name="click_id_type"
            label="Jenis click ID"
            values={["none", "fbclid", "gclid", "ctwa_clid", "li_fat_id"]}
            value="none"
          />
          <Field name="click_id" label="Click ID" maxLength={500} />
          <Field name="campaign_id" label="Campaign ID" maxLength={300} />
          <Field name="adset_id" label="Ad set ID" maxLength={300} />
          <Field name="ad_id" label="Ad ID" maxLength={300} />
          <Field name="owner_id" label="Owner profile ID (kosong = saya)" />
        </div>
      </details>
      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}{" "}
          <Link className="underline" href="/leads">
            Periksa kontak pada registry lead
          </Link>
        </p>
      )}
      <div className="flex gap-3">
        <Button disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan inquiry"}
        </Button>
        <Button asChild variant="outline">
          <Link href="/leads">Batal</Link>
        </Button>
      </div>
    </form>
  );
}
type Library = Awaited<ReturnType<typeof leadLibrary>>;
export function LeadTable({
  rows,
  total,
  page,
}: {
  rows: Library["rows"];
  total: number;
  page: number;
}) {
  const router = useRouter(),
    search = useSearchParams();
  function navigate(values: Record<string, string>) {
    const p = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(values)) p.set(k, v);
    router.push("/leads?" + p);
  }
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.id}
      caption="Registry inquiry"
      pagination={{
        page,
        total,
        pageSize: 20,
        onPageChange: (p) => navigate({ page: String(p) }),
      }}
      onSortChange={(sort, direction) =>
        navigate({ sort, direction, page: "0" })
      }
      columns={[
        {
          key: "inquiry_date",
          label: "Inquiry · WIB",
          value: (r) => r.inquiry_date,
          render: (r) => (
            <Link className="text-primary underline" href={"/leads/" + r.id}>
              {r.inquiry_date}
            </Link>
          ),
        },
        {
          key: "contact",
          label: "Contact (orang)",
          sortable: false,
          value: (r) =>
            r.contacts?.full_name ??
            r.contacts?.email ??
            r.contacts?.phone_e164 ??
            "Belum teridentifikasi",
        },
        {
          key: "product_interest",
          label: "Produk",
          value: (r) => r.product_interest ?? "—",
        },
        {
          key: "qualification_status",
          label: "Kualifikasi",
          value: (r) => r.qualification_status,
          render: (r) => (
            <StatusBadge status={r.qualification_status as Status} />
          ),
        },
        { key: "platform", label: "Platform", value: (r) => r.platform },
        { key: "channel", label: "Channel", value: (r) => r.channel },
        {
          key: "lt_campaign",
          label: "Campaign",
          value: (r) => r.lt_campaign ?? "—",
        },
        {
          key: "attribution_missing",
          label: "Atribusi",
          value: (r) => (r.attribution_missing ? "Belum lengkap" : "Tersedia"),
        },
      ]}
    />
  );
}
type Detail = NonNullable<Awaited<ReturnType<typeof leadDetail>>>;
export function OverrideForm({ lead }: { lead: Detail["lead"] }) {
  const [open, setOpen] = useState(false),
    [pending, start] = useTransition(),
    [error, setError] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Override kualifikasi</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override dengan alasan</DialogTitle>
          <DialogDescription>
            Perubahan manual tercatat pada timeline dan tidak dikualifikasi
            ulang otomatis. Tidak dikirim ke HubSpot.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            start(async () => {
              const r = await overrideLeadAction({
                id: lead.id,
                revision: lead.updated_at,
                status: form.get("status"),
                reason: form.get("reason"),
              });
              if (r.ok) setOpen(false);
              else setError(r.message);
            });
          }}
        >
          <Choice
            name="status"
            label="Status baru"
            values={leadStatuses.filter((s) => s !== lead.qualification_status)}
          />
          <label className="field" htmlFor="reason">
            Alasan wajib
            <textarea
              id="reason"
              name="reason"
              required
              maxLength={2000}
              className="native-control min-h-24"
            />
          </label>
          {error && (
            <p role="alert" className="text-critical">
              {error}
            </p>
          )}
          <Button disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan override"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function DealForm({ detail }: { detail: Detail }) {
  const d = detail.deal,
    [pending, start] = useTransition(),
    [message, setMessage] = useState("");
  return (
    <form
      className="space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        start(async () => {
          const r = await saveDealAction({
            ...Object.fromEntries(form),
            lead_id: detail.lead.id,
            revision: d?.updated_at ?? null,
          });
          setMessage(r.ok ? "Deal tersimpan." : r.message);
        });
      }}
    >
      <p className="text-sm text-muted-foreground">
        Deal manual lokal. Tidak ada koneksi atau write-back HubSpot. Nilai dan
        outcome harus berasal dari bukti nyata.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Nama deal" value={d?.name ?? ""} required />
        <Field
          name="pipeline"
          label="Pipeline"
          value={d?.pipeline ?? ""}
          required
        />
        <Field
          name="stage_key"
          label="Stage key"
          value={d?.stage_key ?? ""}
          required
        />
        <Field
          name="stage_label"
          label="Label stage"
          value={d?.stage_label ?? ""}
          required
        />
        <Choice
          name="stage_category"
          label="Kategori stage"
          values={["open", "won", "lost"]}
          value={d?.stage_category ?? "open"}
        />
        <Field
          name="amount"
          label="Nilai deal (kosong = belum diketahui)"
          value={d?.amount ?? ""}
        />
        <Field
          name="currency"
          label="Mata uang ISO"
          value={d?.currency ?? "IDR"}
          required
          maxLength={3}
        />
        <Field
          name="expected_close_date"
          label="Perkiraan tanggal close"
          type="date"
          value={d?.expected_close_date ?? ""}
        />
        <Field
          name="close_date"
          label="Tanggal close aktual (wajib won/lost)"
          type="date"
          value={d?.close_date ?? ""}
        />
      </div>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <Button disabled={pending || Boolean(d?.hubspot_deal_id)}>
        {pending ? "Menyimpan…" : "Simpan deal"}
      </Button>
    </form>
  );
}
