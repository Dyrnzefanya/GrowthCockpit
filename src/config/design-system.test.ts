// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import {
  StatusBadge,
  statusSemantics,
  type Status,
} from "@/components/status-badge";
import { readViewParams } from "@/lib/view-params";

it("TEST-1.6 renders every PRD status with an icon and its label", () => {
  for (const status of Object.keys(statusSemantics) as Status[]) {
    const html = renderToStaticMarkup(createElement(StatusBadge, { status }));
    expect(html).toContain("<svg");
    expect(html).toContain(
      status === "mql" || status === "sql"
        ? status.toUpperCase()
        : status.replaceAll("_", " "),
    );
  }
});
it("TEST-1.5 ignores invalid date params and reversed ranges", () => {
  expect(
    readViewParams(new URLSearchParams("from=2026-02-30&to=garbage")),
  ).toEqual({ query: "", from: "", to: "" });
  expect(
    readViewParams(new URLSearchParams("from=2026-09-11&to=2026-09-01")).from,
  ).toBe("");
  expect(
    readViewParams(new URLSearchParams("from=2026-09-01&to=2026-09-11&q=paper"))
      .to,
  ).toBe("2026-09-11");
});
it("TEST-1.7 forbids hard-coded colors, font sizes, or arbitrary spacing in components", () => {
  function check(directory: string) {
    for (const file of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, file.name);
      if (file.isDirectory()) check(path);
      else if (/\.(tsx|css)$/.test(path)) {
        const text = readFileSync(path, "utf8");
        expect(text, path).not.toMatch(
          /#[0-9a-fA-F]{3,8}\b|(?:rgb|hsl|oklch)\(|\[[^\]]*\d(?:px|rem)\b/,
        );
      }
    }
  }
  check("src/components");
  check("src/app");
});

it("static route skeletons remain Server Components and gallery fixtures stay isolated", () => {
  for (const route of [
    "today",
    "performance",
    "leads",
    "funnel",
    "experiments",
    "playbook",
    "workflows",
    "reports",
    "integrations",
    "settings",
  ]) {
    expect(
      readFileSync(`src/app/(app)/${route}/page.tsx`, "utf8"),
    ).not.toContain("use client");
  }
  expect(
    readFileSync("src/components/route-skeleton.tsx", "utf8"),
  ).not.toContain("gallery");
  expect(readFileSync("src/app/(app)/dev/gallery/page.tsx", "utf8")).toContain(
    'serverEnv.APP_ENV !== "development"',
  );
});
