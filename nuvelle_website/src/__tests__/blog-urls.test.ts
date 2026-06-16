import { describe, expect, it } from "vitest";
import {
  blogPath,
  buildAlternateLinks,
  buildDetailAlternateLinks,
  canonicalUrl,
  normalizeSiteOrigin,
  siteRelativeUrl
} from "../lib/blog/urls";

describe("blog urls", () => {
  it("normalizes origins and builds locale-aware relative paths", () => {
    expect(normalizeSiteOrigin("https://nuvelle.ai/")).toBe("https://nuvelle.ai");
    expect(blogPath("en", { kind: "list" })).toBe("/blog");
    expect(blogPath("cn", { kind: "list" })).toBe("/cn/blog");
    expect(blogPath("fr", { kind: "category", slug: "news" })).toBe("/fr/blog/category/news");
    expect(blogPath("pt", { kind: "search", query: "ai shorts" })).toBe("/pt/blog/search?value=ai%20shorts");
    expect(blogPath("jp", { kind: "detail", slug: "story one" })).toBe("/jp/blog/story%20one");
  });

  it("builds canonical and hreflang links", () => {
    expect(canonicalUrl("https://nuvelle.ai", "de", { kind: "list" })).toBe("https://nuvelle.ai/de/blog");
    expect(canonicalUrl("https://nuvelle.ai", "en", { kind: "detail", slug: "hello" })).toBe(
      "https://nuvelle.ai/blog/hello"
    );
    expect(buildAlternateLinks("https://nuvelle.ai", { kind: "category", slug: "news" })).toEqual([
      { hrefLang: "en", href: "https://nuvelle.ai/blog/category/news" },
      { hrefLang: "zh-CN", href: "https://nuvelle.ai/cn/blog/category/news" },
      { hrefLang: "ja-JP", href: "https://nuvelle.ai/jp/blog/category/news" },
      { hrefLang: "de-DE", href: "https://nuvelle.ai/de/blog/category/news" },
      { hrefLang: "fr-FR", href: "https://nuvelle.ai/fr/blog/category/news" },
      { hrefLang: "es-ES", href: "https://nuvelle.ai/es/blog/category/news" },
      { hrefLang: "pt-PT", href: "https://nuvelle.ai/pt/blog/category/news" },
      { hrefLang: "x-default", href: "https://nuvelle.ai/blog/category/news" }
    ]);
  });

  it("builds detail alternates only for the current locale when translated slugs are unknown", () => {
    expect(buildDetailAlternateLinks("https://nuvelle.ai", "jp", "konnichiwa")).toEqual([
      { hrefLang: "ja-JP", href: "https://nuvelle.ai/jp/blog/konnichiwa" },
      { hrefLang: "x-default", href: "https://nuvelle.ai/jp/blog/konnichiwa" }
    ]);
  });

  it("converts same-site absolute links into root-relative links", () => {
    expect(siteRelativeUrl("https://nuvelle.ai", "https://nuvelle.ai")).toBe("/");
    expect(siteRelativeUrl("https://nuvelle.ai", "https://nuvelle.ai/cn/blog?value=ai#top")).toBe(
      "/cn/blog?value=ai#top"
    );
    expect(siteRelativeUrl("https://preview.example", "https://nuvelle.ai/blog")).toBe("/blog");
    expect(siteRelativeUrl("https://nuvelle.ai", "https://example.com/blog")).toBe("https://example.com/blog");
    expect(siteRelativeUrl("https://nuvelle.ai", "/blog")).toBe("/blog");
  });
});
