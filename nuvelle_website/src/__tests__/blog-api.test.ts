import { describe, expect, it, vi } from "vitest";
import { fetchBlogDetail, fetchBlogList, mapBloggerPost } from "../lib/blog/api";
import type { BlogConfig } from "../lib/blog/config";
import { blogPostingJsonLd, metadataForBlogDetail } from "../lib/blog/seo";
import type { BlogArticleDetail } from "../lib/blog/types";

const config: BlogConfig = {
  apiUrl: "https://blogger.example.com",
  accessKey: "blog_sk_test",
  siteSlug: "nuvelle",
  pageSize: 12,
  siteOrigin: "https://nuvelle.ai",
  languageByLocale: {
    en: "en",
    cn: "en",
    jp: "en",
    de: "en",
    fr: "en",
    es: "en",
    pt: "en"
  }
};

const articleDetail: BlogArticleDetail = {
  id: "10",
  slug: "clean-seo",
  title: "Plain title",
  excerpt: "Plain excerpt",
  date: "2026-06-16T00:00:00.000Z",
  contentHtml: "<p>Plain content</p>",
  meta: {}
};

const bloggerPost = {
  id: "post-1",
  site_slug: "nuvelle",
  title: "First post",
  slug: "first-post",
  language: "en",
  path: "/blog/first-post",
  html_content: "<h1>First post</h1><p>Body</p>",
  excerpt: "Short summary",
  cover_image_url: "https://cdn.example/cover.png",
  meta_title: "SEO title",
  meta_description: "SEO description",
  canonical_url: "https://nuvelle.ai/blog/first-post",
  published_at: "2026-06-19T12:00:00Z",
  updated_at: "2026-06-20T12:00:00Z",
  author: {
    id: "author-1",
    email: "writer@example.com",
    nickname: "Writer",
    avatar_url: "https://cdn.example/avatar.png"
  },
  category: {
    id: "category-1",
    site_id: "site-1",
    name: "Product",
    slug: "product",
    description: "Product updates",
    created_at: "2026-06-19T12:00:00Z",
    updated_at: "2026-06-19T12:00:00Z"
  }
};

describe("blog api adapter", () => {
  it("maps Blogger fields into a frontend article detail", () => {
    expect(mapBloggerPost(bloggerPost)).toEqual({
      id: "post-1",
      slug: "first-post",
      title: "First post",
      excerpt: "Short summary",
      date: "2026-06-19T12:00:00Z",
      image: "https://cdn.example/cover.png",
      authorName: "Writer",
      category: { slug: "product", name: "Product" },
      contentHtml: "<h1>First post</h1><p>Body</p>",
      meta: { title: "SEO title", desc: "SEO description" },
      canonicalUrl: "https://nuvelle.ai/blog/first-post",
      modifiedDate: "2026-06-20T12:00:00Z",
      path: "/blog/first-post"
    });
  });

  it("builds a Blogger list request with AccessKey auth, category, language, and pagination", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => []
    });

    await fetchBlogList({
      locale: "cn",
      pageNum: 2,
      pageSize: 24,
      type: "product",
      config,
      fetcher: fetchMock as unknown as typeof fetch
    });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/api/integration/sites/nuvelle/posts");
    expect(url.searchParams.get("limit")).toBe("24");
    expect(url.searchParams.get("offset")).toBe("24");
    expect(url.searchParams.get("category_slug")).toBe("product");
    expect(url.searchParams.get("language")).toBe("en");
    expect(fetchMock.mock.calls[0][1]).toEqual({
      cache: "no-store",
      headers: { "X-Access-Key": "blog_sk_test" }
    });
  });

  it("filters Blogger list results locally for the existing search page", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        bloggerPost,
        {
          ...bloggerPost,
          id: "post-2",
          slug: "release-note",
          title: "Release note",
          excerpt: "Platform update",
          category: { ...bloggerPost.category, name: "Engineering", slug: "engineering" }
        }
      ]
    });

    const result = await fetchBlogList({
      locale: "en",
      search: "first",
      config,
      fetcher: fetchMock as unknown as typeof fetch
    });

    expect(result.total).toBe(1);
    expect(result.articles.map((article) => article.slug)).toEqual(["first-post"]);
  });

  it("builds a Blogger detail request and maps the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => bloggerPost
    });

    const article = await fetchBlogDetail({
      locale: "en",
      slug: "first-post",
      config,
      fetcher: fetchMock as unknown as typeof fetch
    });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/api/integration/sites/nuvelle/posts/first-post");
    expect(url.searchParams.get("language")).toBe("en");
    expect(article?.contentHtml).toBe("<h1>First post</h1><p>Body</p>");
  });

  it("returns null when Blogger reports a missing post", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => "not found"
    });

    await expect(
      fetchBlogDetail({
        locale: "en",
        slug: "missing",
        config,
        fetcher: fetchMock as unknown as typeof fetch
      })
    ).resolves.toBeNull();
  });

  it("strips HTML and encoded markup from detail metadata title and description", () => {
    const metadata = metadataForBlogDetail(
      "en",
      {
        ...articleDetail,
        title: "<b>Fallback title</b>",
        meta: {
          title: "&lt;strong&gt;Meta &amp;amp; title&lt;/strong&gt;",
          desc: "<p>Meta <em>description</em> &amp; details</p>"
        }
      },
      "clean-seo"
    );

    expect(metadata.title).toBe("Meta & title");
    expect(metadata.description).toBe("Meta description & details");
    expect(metadata.openGraph?.title).toBe("Meta & title");
    expect(metadata.openGraph?.description).toBe("Meta description & details");
    expect(metadata.twitter?.title).toBe("Meta & title");
    expect(metadata.twitter?.description).toBe("Meta description & details");
  });

  it("strips HTML from JSON-LD headline and meta description", () => {
    expect(
      blogPostingJsonLd(
        {
          ...articleDetail,
          title: "<h1>Headline &amp; news</h1>",
          meta: {
            desc: "<p>Structured <strong>description</strong> &amp; summary</p>"
          }
        },
        "https://nuvelle.ai/blog/clean-seo"
      )
    ).toMatchObject({
      headline: "Headline & news",
      description: "Structured description & summary"
    });
  });

  it("slices detail metadata descriptions after stripping HTML", () => {
    const visibleDescription = `${"a".repeat(159)}b`;
    const metadata = metadataForBlogDetail(
      "en",
      {
        ...articleDetail,
        meta: {
          desc: `<span>${visibleDescription}</span><strong>hidden</strong>`
        }
      },
      "clean-seo"
    );

    expect(metadata.description).toBe(visibleDescription);
  });
});
