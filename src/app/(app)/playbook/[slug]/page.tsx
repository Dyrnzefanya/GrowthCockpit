import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, Pencil } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/operational";
import { PlaybookMarkdown } from "@/components/playbook-markdown";
import { StatusBadge, type Status } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  articleTypeLabels,
  markdownHeadings,
  type ArticleType,
} from "@/domain/playbook";
import { playbookArticle } from "@/services/playbook";

export default async function Page({ params }: PageProps<"/playbook/[slug]">) {
  const { slug } = await params;
  const article = await playbookArticle(slug);
  if (!article) notFound();
  const headings = markdownHeadings(article.body_md);
  return (
    <>
      <PageHeader
        title={article.title}
        description={article.summary}
        actions={
          <Button asChild variant="outline">
            <Link href={`/playbook/${article.slug}/edit`}>
              <Pencil />
              Edit artikel
            </Link>
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StatusBadge status={article.status as Status} />
        <span className="text-sm text-muted-foreground">
          {articleTypeLabels[article.article_type as ArticleType]} ·{" "}
          {article.category} · versi {article.version}
        </span>
      </div>
      {article.status === "archived" && (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 rounded-md border border-attention/30 bg-attention-soft px-4 py-3 text-attention"
        >
          <Archive className="mt-0.5 size-4" aria-hidden="true" />
          <p>
            Artikel ini diarsipkan. Tautan lama tetap tersedia untuk konteks
            historis.
          </p>
        </div>
      )}
      {article.status === "draft" && (
        <p
          role="status"
          className="mb-5 rounded-md border bg-muted px-4 py-3 text-sm"
        >
          Draft ini hanya tersedia di workspace terautentikasi.
        </p>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-4">
        <SectionCard
          title="Isi artikel"
          className={headings.length >= 3 ? "xl:col-span-3" : "xl:col-span-4"}
        >
          <PlaybookMarkdown markdown={article.body_md} className="p-5 sm:p-7" />
        </SectionCard>
        {headings.length >= 3 && (
          <nav
            aria-label="Daftar isi"
            className="rounded-lg border bg-card p-4 xl:sticky xl:top-20"
          >
            <h2 className="mb-2 text-sm">Di halaman ini</h2>
            <ol className="space-y-1 text-sm text-muted-foreground">
              {headings.map((heading, index) => (
                <li
                  key={`${heading.id}-${index}`}
                  className={heading.level === 3 ? "pl-3" : ""}
                >
                  <a
                    className="block rounded-sm px-2 py-1.5 hover:bg-muted hover:text-foreground"
                    href={`#${heading.id}`}
                  >
                    {heading.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>
    </>
  );
}
