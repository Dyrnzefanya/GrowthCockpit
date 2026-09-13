import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/operational";
import { EmptyState } from "@/components/states";
import { StatusBadge, type Status } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { articleTypeLabels, type ArticleType } from "@/domain/playbook";
import { playbookLibrary } from "@/services/playbook";

function date(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const model = await playbookLibrary(await searchParams);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(model.filters))
    if (key !== "page" && value !== undefined) query.set(key, String(value));
  const pageHref = (page: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(page));
    return `/playbook?${next}`;
  };
  return (
    <>
      <PageHeader
        title="Playbook"
        description="Temukan prosedur, checklist, dan referensi saat pekerjaan berlangsung."
        actions={
          <Button asChild>
            <Link href="/playbook/new">
              <Plus />
              Artikel baru
            </Link>
          </Button>
        }
      />
      <div className="space-y-5">
        <SectionCard
          title="Cari pengetahuan"
          description="Pencarian membaca judul, ringkasan, isi, dan tag."
        >
          <form
            className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-7"
            method="get"
          >
            <label className="field xl:col-span-2" htmlFor="playbook-search">
              Kata kunci
              <span className="relative">
                <Search
                  aria-hidden="true"
                  className="absolute left-3 top-3 size-4 text-muted-foreground"
                />
                <input
                  id="playbook-search"
                  name="q"
                  className="native-control pl-9"
                  defaultValue={model.filters.q}
                  maxLength={200}
                  placeholder="Cari langkah, masalah, atau istilah"
                />
              </span>
            </label>
            <label className="field" htmlFor="playbook-type">
              Jenis
              <select
                id="playbook-type"
                name="type"
                className="native-control"
                defaultValue={model.filters.type ?? ""}
              >
                <option value="">Semua jenis</option>
                {Object.entries(articleTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor="playbook-category">
              Kategori
              <select
                id="playbook-category"
                name="category"
                className="native-control"
                defaultValue={model.filters.category ?? ""}
              >
                <option value="">Semua kategori</option>
                {model.categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor="playbook-tag">
              Tag
              <select
                id="playbook-tag"
                name="tag"
                className="native-control"
                defaultValue={model.filters.tag ?? ""}
              >
                <option value="">Semua tag</option>
                {model.tags.map((tag) => (
                  <option key={tag}>{tag}</option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor="playbook-status">
              Status
              <select
                id="playbook-status"
                name="status"
                className="native-control"
                defaultValue={model.filters.status ?? ""}
              >
                <option value="">Aktif + draft</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <Button className="self-end" type="submit">
              Terapkan
            </Button>
          </form>
        </SectionCard>

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            <strong className="font-semibold text-foreground">
              {model.total}
            </strong>{" "}
            artikel ditemukan
          </p>
          {query.size > 0 && (
            <Link className="text-sm text-primary underline" href="/playbook">
              Hapus filter
            </Link>
          )}
        </div>

        {model.articles.length ? (
          <ol className="grid gap-4 lg:grid-cols-2" aria-label="Hasil playbook">
            {model.articles.map((article) => (
              <li key={article.id}>
                <article className="h-full rounded-lg border bg-card p-5 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={article.status as Status} />
                    <span className="text-xs font-medium text-muted-foreground">
                      {articleTypeLabels[article.article_type as ArticleType]} ·{" "}
                      {article.category}
                    </span>
                  </div>
                  <h2 className="text-base">
                    <Link
                      className="text-primary hover:underline"
                      href={`/playbook/${article.slug}`}
                    >
                      {article.title}
                    </Link>
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {article.summary}
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
                    {article.tags.map((tag) => (
                      <li key={tag}>
                        <Link
                          href={`/playbook?tag=${encodeURIComponent(tag)}`}
                          className="block rounded-sm bg-muted px-2 py-1 text-xs hover:text-primary"
                        >
                          {tag}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Diperbarui {date(article.updated_at)} · versi{" "}
                    {article.version}
                  </p>
                </article>
              </li>
            ))}
          </ol>
        ) : (
          <SectionCard title="Hasil pencarian">
            <EmptyState
              title="Artikel tidak ditemukan"
              description="Ubah kata kunci atau filter, atau buat prosedur yang belum tersedia."
              action={
                <Link className="text-primary underline" href="/playbook/new">
                  Buat artikel baru
                </Link>
              }
            />
          </SectionCard>
        )}

        <nav
          aria-label="Halaman hasil playbook"
          className="flex justify-between text-sm text-primary"
        >
          {model.filters.page > 0 ? (
            <Link href={pageHref(model.filters.page - 1)}>Sebelumnya</Link>
          ) : (
            <span />
          )}
          {(model.filters.page + 1) * 20 < model.total && (
            <Link href={pageHref(model.filters.page + 1)}>Berikutnya</Link>
          )}
        </nav>
      </div>
    </>
  );
}
