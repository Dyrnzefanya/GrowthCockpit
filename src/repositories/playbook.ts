import "server-only";
import { serverClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.generated";

type Tables = Database["public"]["Tables"];
export type PlaybookArticle = Tables["playbook_articles"]["Row"];
export type PlaybookWrite = Tables["playbook_articles"]["Insert"];

function fail(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "23505") throw new Error("SLUG_CONFLICT");
  throw new Error("INTERNAL");
}

export async function searchArticles(input: {
  query?: string;
  type?: string;
  category?: string;
  tag?: string;
  status?: string;
  page: number;
}) {
  const { data, error } = await (
    await serverClient()
  ).rpc("search_playbook", {
    p_query: input.query ?? "",
    ...(input.type && { p_type: input.type }),
    ...(input.category && { p_category: input.category }),
    ...(input.tag && { p_tag: input.tag }),
    ...(input.status && { p_status: input.status }),
    p_limit: 20,
    p_offset: input.page * 20,
  });
  fail(error);
  return { articles: data ?? [], total: data?.[0]?.total_count ?? 0 };
}

export async function readPlaybookFacets() {
  const { data, error } = await (
    await serverClient()
  )
    .from("playbook_articles")
    .select("category,tags")
    .neq("status", "archived")
    .order("category")
    .limit(500);
  fail(error);
  return {
    categories: [...new Set((data ?? []).map((row) => row.category))],
    tags: [...new Set((data ?? []).flatMap((row) => row.tags))].sort(),
  };
}

export async function readArticleBySlug(slug: string) {
  const { data, error } = await (
    await serverClient()
  )
    .from("playbook_articles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  fail(error);
  return data;
}

export async function readArticleById(id: string) {
  const { data, error } = await (
    await serverClient()
  )
    .from("playbook_articles")
    .select("*")
    .eq("id", id)
    .single();
  fail(error);
  return data;
}

export async function insertArticle(values: PlaybookWrite) {
  const { data, error } = await (
    await serverClient()
  )
    .from("playbook_articles")
    .insert(values)
    .select("*")
    .single();
  fail(error);
  return data!;
}

export async function updateArticle(
  id: string,
  revision: string,
  values: Tables["playbook_articles"]["Update"],
) {
  const { data, error } = await (
    await serverClient()
  )
    .from("playbook_articles")
    .update(values)
    .eq("id", id)
    .eq("updated_at", revision)
    .select("*")
    .maybeSingle();
  fail(error);
  if (!data) throw new Error("CONFLICT");
  return data;
}

export async function removeArticle(id: string, revision: string) {
  const { data, error } = await (
    await serverClient()
  )
    .from("playbook_articles")
    .delete()
    .eq("id", id)
    .eq("updated_at", revision)
    .select("id")
    .maybeSingle();
  fail(error);
  if (!data) throw new Error("CONFLICT");
}
