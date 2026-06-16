import { describe, expect, it, vi } from "vitest";
import { fetchBlogDetail, fetchBlogList, mapBlogDetail, mapBlogListItem } from "../lib/blog/api";
import type { BlogConfig } from "../lib/blog/config";

const config: BlogConfig = {
  slxHost: "https://apps.voc.ai",
  siteKey: "nuvelle.ai",
  pageSize: 12,
  siteOrigin: "https://nuvelle.ai",
  categoryIdsByLocale: {
    en: [1, 2],
    cn: [],
    jp: [],
    de: [],
    fr: [],
    es: [],
    pt: []
  }
};

describe("blog api adapter", () => {
  it("maps backend list fields into a frontend article item", () => {
    expect(
      mapBlogListItem({
        ID: 7,
        slug: "hello",
        post_title: "Hello",
        post_excerpt: "Excerpt",
        post_date: "2026-06-16T00:00:00.000Z",
        twitter_image: "https://cdn.example/cover.jpg",
        author_name: "Nuvelle",
        category_slug: "news",
        category_name: "News",
        detailUrl: "/blog/hello"
      })
    ).toEqual({
      id: 7,
      slug: "hello",
      title: "Hello",
      excerpt: "Excerpt",
      date: "2026-06-16T00:00:00.000Z",
      image: "https://cdn.example/cover.jpg",
      authorName: "Nuvelle",
      category: { slug: "news", name: "News" }
    });
  });

  it("maps backend detail fields into a frontend article detail", () => {
    expect(
      mapBlogDetail({
        ID: 8,
        post_name: "story",
        post_title: "Story",
        post_excerpt: "Detail excerpt",
        post_content: "<p>Body</p>",
        post_date: "2026-06-15T00:00:00.000Z",
        twitter_image: "https://cdn.example/story.jpg",
        author_name: "Editor",
        type: "blog",
        meta: { title: "Meta title", desc: "Meta desc" },
        category: { slug: "updates", name: "Updates" },
        schemaJsonTrimmed: "{\"@context\":\"https://schema.org\"}",
        sourceUrl: "https://canonical.example/story",
        post_modified: "2026-06-16T00:00:00.000Z"
      })
    ).toEqual({
      id: 8,
      slug: "story",
      title: "Story",
      excerpt: "Detail excerpt",
      date: "2026-06-15T00:00:00.000Z",
      image: "https://cdn.example/story.jpg",
      authorName: "Editor",
      category: { slug: "updates", name: "Updates" },
      contentHtml: "<p>Body</p>",
      meta: { title: "Meta title", desc: "Meta desc" },
      schemaJsonTrimmed: "{\"@context\":\"https://schema.org\"}",
      canonicalUrl: "https://canonical.example/story",
      modifiedDate: "2026-06-16T00:00:00.000Z",
      type: "blog"
    });
  });

  it("builds list request with site, configured category ids, search, and pagination", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 200, data: { total: 0, list: [] } })
    });

    await fetchBlogList({
      locale: "en",
      pageNum: 2,
      pageSize: 24,
      search: "ai shorts",
      config,
      fetcher: fetchMock as unknown as typeof fetch
    });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/n/blog/listDataV2");
    expect(url.searchParams.get("site")).toBe("nuvelle.ai");
    expect(url.searchParams.get("categoryIds")).toBe("1,2");
    expect(url.searchParams.get("search")).toBe("ai shorts");
    expect(url.searchParams.get("pageNum")).toBe("2");
    expect(url.searchParams.get("pageSize")).toBe("24");
    expect(fetchMock.mock.calls[0][1]).toEqual({ cache: "no-store" });
  });

  it("omits category ids when they are not configured for the locale", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 200, data: { total: 0, list: [] } })
    });

    await fetchBlogList({
      locale: "cn",
      config,
      fetcher: fetchMock as unknown as typeof fetch
    });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.has("categoryIds")).toBe(false);
  });

  it("returns null for empty backend detail data", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 200, data: [] })
    });

    await expect(
      fetchBlogDetail({
        locale: "cn",
        slug: "missing",
        config,
        fetcher: fetchMock as unknown as typeof fetch
      })
    ).resolves.toBeNull();
  });
});
