import { describe, expect, it } from "vitest";
import {
  markdownHeadings,
  normalizeTags,
  publication,
  slugCandidate,
  slugify,
} from ".";
import { articleInputSchema } from "@/config/playbook-schema";

describe("playbook rules", () => {
  it("creates stable slugs and numeric collision suffixes", () => {
    expect(slugify("  SOP: Peluncuran Café! ")).toBe("sop-peluncuran-cafe");
    expect(slugCandidate("sop-peluncuran", 0)).toBe("sop-peluncuran");
    expect(slugCandidate("sop-peluncuran", 1)).toBe("sop-peluncuran-2");
  });

  it("increments versions only when publishing", () => {
    expect(publication("draft", 0, null, "now")).toEqual({
      version: 0,
      publishedAt: null,
    });
    expect(publication("published", 2, "before", "now")).toEqual({
      version: 3,
      publishedAt: "now",
    });
  });

  it("extracts navigable headings outside code fences", () => {
    expect(
      markdownHeadings(
        "# Title\n## Check data\n```\n## Ignore\n```\n### Next step",
      ),
    ).toEqual([
      { id: "check-data", label: "Check data", level: 2 },
      { id: "next-step", label: "Next step", level: 3 },
    ]);
    expect(normalizeTags([" QA ", "qa", "UTM"])).toEqual(["qa", "utm"]);
  });

  it("accepts PostgreSQL timestamp offsets as write revisions", () => {
    expect(
      articleInputSchema.parse({
        id: "44444444-4444-4444-8444-444444444444",
        revision: "2026-09-13T04:00:00.123456+00:00",
        title: "Title",
        category: "Category",
        articleType: "sop",
        summary: "Summary",
        bodyMd: "Body",
        tags: [],
        status: "published",
      }).revision,
    ).toContain("+00:00");
  });
});
