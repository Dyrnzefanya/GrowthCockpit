export const articleTypes = [
  "sop",
  "checklist",
  "decision_tree",
  "troubleshooting",
  "reference",
] as const;
export const articleStatuses = ["draft", "published", "archived"] as const;
export type ArticleType = (typeof articleTypes)[number];
export type ArticleStatus = (typeof articleStatuses)[number];

export const articleTypeLabels: Record<ArticleType, string> = {
  sop: "SOP",
  checklist: "Checklist",
  decision_tree: "Decision tree",
  troubleshooting: "Troubleshooting",
  reference: "Reference",
};

export function slugify(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 140)
      .replace(/-$/g, "") || "article"
  );
}

export function slugCandidate(base: string, attempt: number) {
  const suffix = attempt ? `-${attempt + 1}` : "";
  return `${base.slice(0, 160 - suffix.length).replace(/-$/g, "")}${suffix}`;
}

export function publication(
  status: ArticleStatus,
  version: number,
  publishedAt: string | null,
  now = new Date().toISOString(),
) {
  return status === "published"
    ? { version: version + 1, publishedAt: now }
    : { version, publishedAt };
}

export type TocItem = { id: string; label: string; level: 2 | 3 };
export function markdownHeadings(markdown: string): TocItem[] {
  const headings: TocItem[] = [];
  let fenced = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const match = /^(##|###)\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const label = match[2].replace(/[*_`[\]]/g, "").trim();
    headings.push({
      id: slugify(label),
      label,
      level: match[1].length as 2 | 3,
    });
  }
  return headings;
}

export function normalizeTags(tags: string[]) {
  const seen = new Set<string>();
  return tags
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag && !seen.has(tag) && seen.add(tag));
}
