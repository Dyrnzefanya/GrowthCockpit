import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlaybookMarkdown } from "@/components/playbook-markdown";

describe("safe Markdown", () => {
  it("renders GFM while dropping injected HTML and unsafe URLs", () => {
    const html = renderToStaticMarkup(
      <PlaybookMarkdown
        markdown={
          "## Safe\n- [ ] Check\n\n<script>alert(1)</script><img src=x onerror=alert(2)>\n\n[bad](javascript:alert(3))"
        }
      />,
    );
    expect(html).toContain('id="safe"');
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain("script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
  });
});
