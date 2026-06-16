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

  it("removes unsafe href and src schemes across unquoted, mixed-case, and obfuscated values", () => {
    const html = [
      '<a href=javascript:alert(1)>Unquoted</a>',
      '<a href=JaVaScRiPt:alert(2)>Mixed</a>',
      '<a href="java\nscript:alert(3)">Obfuscated</a>',
      '<img src=data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg== alt="bad">',
      '<img src="data:image/png;base64,AAAA" alt="safe">'
    ].join("");
    const sanitized = sanitizeArticleHtml(html);

    expect(sanitized).toContain("<a>Unquoted</a>");
    expect(sanitized).toContain("<a>Mixed</a>");
    expect(sanitized).toContain("<a>Obfuscated</a>");
    expect(sanitized).toContain('<img alt="bad">');
    expect(sanitized).toContain('<img src="data:image/png;base64,AAAA" alt="safe">');
    expect(sanitized.toLowerCase()).not.toContain("javascript:");
    expect(sanitized.toLowerCase()).not.toContain("data:text/html");
  });

  it("strips html for descriptions", () => {
    expect(stripHtml("<p>Hello <strong>Nuvelle</strong></p>").trim()).toBe("Hello Nuvelle");
  });
});
