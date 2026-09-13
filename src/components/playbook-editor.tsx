"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlaybookMarkdown } from "@/components/playbook-markdown";
import { SectionCard } from "@/components/operational";
import { articleTypeLabels, articleTypes } from "@/domain/playbook";
import type { PlaybookArticle } from "@/repositories/playbook";
import {
  deleteArticleAction,
  saveArticleAction,
} from "@/services/playbook-actions";

export function PlaybookEditor({ article }: { article?: PlaybookArticle }) {
  const router = useRouter();
  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [category, setCategory] = useState(article?.category ?? "");
  const [articleType, setArticleType] = useState(
    article?.article_type ?? "sop",
  );
  const [summary, setSummary] = useState(article?.summary ?? "");
  const [bodyMd, setBodyMd] = useState(
    article?.body_md ??
      "# Judul\n\n## Tujuan\n\n## Langkah\n\n- [ ] Langkah pertama",
  );
  const [tags, setTags] = useState(article?.tags.join(", ") ?? "");
  const [status, setStatus] = useState(article?.status ?? "draft");
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        const result = await saveArticleAction({
          id: article?.id,
          revision: article?.updated_at,
          title,
          slug: slug || undefined,
          category,
          articleType,
          summary,
          bodyMd,
          tags: tags.split(","),
          status,
        });
        setMessage(result.message);
        if (result.ok) router.push(`/playbook/${result.slug}`);
      } catch {
        setMessage("Artikel belum tersimpan. Isi editor tetap dipertahankan.");
      }
    });
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <SectionCard
        title={article ? "Edit artikel" : "Artikel baru"}
        description="Tulis prosedur yang dapat dipakai saat pekerjaan berlangsung."
      >
        <form
          className="min-w-0 space-y-5 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <fieldset disabled={pending} className="min-w-0 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field sm:col-span-2" htmlFor="article-title">
                Judul
                <Input
                  id="article-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                  required
                />
              </label>
              <label className="field" htmlFor="article-type">
                Jenis
                <select
                  id="article-type"
                  className="native-control"
                  value={articleType}
                  onChange={(event) => setArticleType(event.target.value)}
                >
                  {articleTypes.map((type) => (
                    <option key={type} value={type}>
                      {articleTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="article-category">
                Kategori
                <Input
                  id="article-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  maxLength={80}
                  required
                />
              </label>
              <label className="field sm:col-span-2" htmlFor="article-summary">
                Ringkasan
                <Textarea
                  id="article-summary"
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  maxLength={500}
                  rows={3}
                  required
                />
              </label>
              <label className="field" htmlFor="article-slug">
                Slug (opsional)
                <Input
                  id="article-slug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  maxLength={160}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  placeholder="Dibuat dari judul"
                />
              </label>
              <label className="field" htmlFor="article-tags">
                Tag
                <Input
                  id="article-tags"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="qa, tracking, campaign"
                />
                <span className="text-xs text-muted-foreground">
                  Pisahkan dengan koma, maksimal 20 tag.
                </span>
              </label>
              <label className="field" htmlFor="article-status">
                Status
                <select
                  id="article-status"
                  className="native-control"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <label className="font-medium" htmlFor="article-body">
                  Isi Markdown
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreview((value) => !value)}
                >
                  <Eye />
                  {preview ? "Tutup preview" : "Preview"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mendukung heading, daftar, checklist, tabel, tautan, dan blok
                kode. HTML mentah dihapus. Artikel boleh merujuk ambang
                operasional, tetapi tidak boleh memuat secret, token, atau data
                pribadi.
              </p>
              <Textarea
                id="article-body"
                className="min-h-96 font-mono text-sm"
                value={bodyMd}
                onChange={(event) => setBodyMd(event.target.value)}
                maxLength={100000}
                required
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit">
                <Save />
                {pending ? "Menyimpan…" : "Simpan artikel"}
              </Button>
              {article && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (!window.confirm("Hapus artikel ini secara permanen?"))
                      return;
                    startTransition(async () => {
                      const result = await deleteArticleAction({
                        id: article.id,
                        revision: article.updated_at,
                      });
                      setMessage(result.message);
                      if (result.ok) router.push("/playbook");
                    });
                  }}
                >
                  <Trash2 />
                  Hapus
                </Button>
              )}
              <p role="status" className="text-sm text-muted-foreground">
                {message}
              </p>
            </div>
          </fieldset>
        </form>
      </SectionCard>
      <SectionCard
        title="Preview aman"
        description="HTML mentah tidak akan ditampilkan."
        className={preview ? "block" : "max-xl:hidden"}
      >
        <PlaybookMarkdown markdown={bodyMd} className="p-5" />
      </SectionCard>
    </div>
  );
}
