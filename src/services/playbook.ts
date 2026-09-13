import "server-only";
import { requireUser } from "@/services/session";
import { can } from "@/lib/auth/can";
import {
  normalizeTags,
  publication,
  slugCandidate,
  slugify,
} from "@/domain/playbook";
import {
  articleInputSchema,
  deleteArticleSchema,
  playbookFiltersSchema,
} from "@/config/playbook-schema";
import {
  insertArticle,
  readArticleById,
  readArticleBySlug,
  readPlaybookFacets,
  removeArticle,
  searchArticles,
  updateArticle,
} from "@/repositories/playbook";

export async function playbookLibrary(value: unknown) {
  await requireUser();
  const input = playbookFiltersSchema.parse(value);
  const [result, facets] = await Promise.all([
    searchArticles({
      query: input.q,
      type: input.type,
      category: input.category,
      tag: input.tag,
      status: input.status,
      page: input.page,
    }),
    readPlaybookFacets(),
  ]);
  return { ...result, ...facets, filters: input };
}

export async function playbookArticle(slug: string) {
  await requireUser();
  return readArticleBySlug(slug);
}

export async function savePlaybookArticle(value: unknown) {
  const user = await requireUser();
  if (!(await can("playbook:write"))) throw new Error("FORBIDDEN");
  const input = articleInputSchema.parse(value);
  const previous = input.id ? await readArticleById(input.id) : null;
  if (previous && !input.revision) throw new Error("CONFLICT");
  const base = slugify(input.slug || input.title);
  const published = publication(
    input.status,
    previous?.version ?? 0,
    previous?.published_at ?? null,
  );
  const common = {
    title: input.title,
    category: input.category,
    article_type: input.articleType,
    summary: input.summary,
    body_md: input.bodyMd,
    tags: normalizeTags(input.tags),
    status: input.status,
    version: published.version,
    published_at: published.publishedAt,
    updated_by: user.id,
  };
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const slug = slugCandidate(base, attempt);
      return previous
        ? await updateArticle(previous.id, input.revision!, {
            ...common,
            slug,
          })
        : await insertArticle({ ...common, slug });
    } catch (error) {
      if (!(error instanceof Error && error.message === "SLUG_CONFLICT"))
        throw error;
    }
  }
  throw new Error("SLUG_CONFLICT");
}

export async function deletePlaybookArticle(value: unknown) {
  await requireUser();
  if (!(await can("playbook:write"))) throw new Error("FORBIDDEN");
  const input = deleteArticleSchema.parse(value);
  await removeArticle(input.id, input.revision);
}
