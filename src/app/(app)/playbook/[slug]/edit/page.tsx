import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/operational";
import { PlaybookEditor } from "@/components/playbook-editor";
import { playbookArticle } from "@/services/playbook";

export default async function Page({
  params,
}: PageProps<"/playbook/[slug]/edit">) {
  const { slug } = await params;
  const article = await playbookArticle(slug);
  if (!article) notFound();
  return (
    <>
      <PageHeader
        title={`Edit · ${article.title}`}
        description="Perubahan published membuat versi baru; arsip tetap dapat dibuka melalui tautan lama."
        actions={
          <Link
            className="text-sm text-primary underline"
            href={`/playbook/${article.slug}`}
          >
            Batal
          </Link>
        }
      />
      <PlaybookEditor article={article} />
    </>
  );
}
