import Link from "next/link";
import { PageHeader } from "@/components/operational";
import { PlaybookEditor } from "@/components/playbook-editor";

export default function Page() {
  return (
    <>
      <PageHeader
        title="Artikel playbook baru"
        description="Ubah pengetahuan operasional menjadi instruksi yang mudah dicari."
        actions={
          <Link className="text-sm text-primary underline" href="/playbook">
            Kembali ke playbook
          </Link>
        }
      />
      <PlaybookEditor />
    </>
  );
}
