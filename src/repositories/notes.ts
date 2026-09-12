import "server-only";
import { serverClient } from "@/lib/supabase/server";
export async function readNotes(date: string, page = 0) {
  const { data, error, count } = await (
    await serverClient()
  )
    .from("notes")
    .select("*", { count: "exact" })
    .eq("note_date", date)
    .eq("context_type", "general")
    .order("created_at", { ascending: false })
    .order("id")
    .range(page * 20, page * 20 + 19);
  if (error) throw new Error("INTERNAL");
  return { notes: data ?? [], total: count ?? 0 };
}
export async function insertNote(
  id: string,
  body: string,
  date: string,
  userId: string,
) {
  const { error } = await (await serverClient()).from("notes").insert({
    id,
    body,
    note_date: date,
    context_type: "general",
    created_by: userId,
  });
  // A retry with the same client-generated id must not duplicate an already-saved note.
  if (error?.code === "23505") {
    const { data, error: readError } = await (
      await serverClient()
    )
      .from("notes")
      .select("body,created_by")
      .eq("id", id)
      .single();
    if (!readError && data?.body === body && data.created_by === userId) return;
  }
  if (error) throw new Error("INTERNAL");
}
