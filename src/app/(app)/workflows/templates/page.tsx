import Link from "next/link";
import { PageHeader } from "@/components/operational";
import { WorkflowTemplateEditor } from "@/components/workflow-template-editor";
import { templatesModel } from "@/services/workflow-pages";
export default async function Page() {
  const templates = await templatesModel();
  return (
    <>
      <PageHeader
        title="Template checklist"
        description="Atur rutinitas tanpa mengubah checklist yang sudah tercatat."
        actions={
          <Link href="/workflows" className="text-primary underline">
            Kembali ke riwayat
          </Link>
        }
      />
      <div className="max-w-4xl space-y-5">
        <WorkflowTemplateEditor />
        {templates.map((template) => (
          <details
            key={`${template.id}-${template.version}`}
            className="rounded-lg border bg-card"
          >
            <summary className="min-h-11 cursor-pointer px-5 py-4 font-medium">
              {template.name} · {template.is_active ? "Aktif" : "Nonaktif"}
            </summary>
            <WorkflowTemplateEditor template={template} />
          </details>
        ))}
      </div>
    </>
  );
}
