import { describe, expect, it } from "vitest";
import { sanitizeArticleHtml, stripHtml } from "../lib/blog/sanitize";

describe("blog sanitizer", () => {
  it("removes scripts, event handlers, and javascript urls while preserving article markup", () => {
    const html =
      '<h2 onclick="bad()">Title</h2><script>alert(1)</script><p><a href="javascript:bad()">Bad</a><a href="https://nuvelle.ai">Good</a></p><img src="x.jpg" onerror="bad()" alt="x">';
    const sanitized = sanitizeArticleHtml(html);

    expect(sanitized).toContain("<h2>Title</h2>");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("alert(1)");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("onerror");
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).toContain('href="https://nuvelle.ai"');
    expect(sanitized).toContain('src="x.jpg"');
  });

  it("strips html for descriptions", () => {
    expect(stripHtml("<p>Hello <strong>Nuvelle</strong></p>").trim()).toBe("Hello Nuvelle");
  });
});
