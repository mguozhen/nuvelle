import { describe, expect, it } from "vitest";
import {
  blogCollectionJsonLd,
  blogPostingJsonLd,
  metadataForBlogDetail,
  metadataForBlogList
} from "../lib/blog/seo";
import type { BlogArticleDetail } from "../lib/blog/types";

const article: BlogArticleDetail = {
  id: "post-1",
  slug: "growth-playbook",
  title: "Growth Playbook",
  excerpt: "How creators grow AI short drama fandoms.",
  date: "2026-06-19T12:00:00Z",
  image: "https://cdn.example/growth.png",
  authorName: "Nuvelle Editorial",
  category: { name: "Creator Insights", slug: "creator-insights" },
  contentHtml: "<p>Creator guide</p>",
  meta: {},
  modifiedDate: "2026-06-20T12:00:00Z"
};

describe("blog seo", () => {
  it("adds indexable metadata for blog list pages and noindexes search pages", () => {
    const listMetadata = metadataForBlogList("en", { kind: "list" }, "Blog", "Latest Nuvelle updates.");
    const searchMetadata = metadataForBlogList(
      "en",
      { kind: "search", query: "creator" },
      "Results: creator",
      "Search results for creator on the Nuvelle blog."
    );

    expect(listMetadata).toMatchObject({
      title: "Blog | Nuvelle",
      robots: { index: true, follow: true },
      twitter: {
        card: "summary",
        title: "Blog | Nuvelle",
        description: "Latest Nuvelle updates."
      }
    });
    expect(searchMetadata).toMatchObject({
      title: "Results: creator | Nuvelle",
      robots: { index: false, follow: true }
    });
  });

  it("builds Blog JSON-LD for list pages", () => {
    expect(blogCollectionJsonLd("en", { kind: "list" }, "Blog", "Latest Nuvelle updates.")).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Blog | Nuvelle",
      description: "Latest Nuvelle updates.",
      url: "https://nuvelle.ai/blog",
      inLanguage: "en",
      publisher: {
        "@type": "Organization",
        name: "Nuvelle",
        url: "https://nuvelle.ai"
      }
    });
  });

  it("adds article metadata and structured data from category and author fields", () => {
    const metadata = metadataForBlogDetail("en", article, "growth-playbook");
    const jsonLd = blogPostingJsonLd(article, "https://nuvelle.ai/blog/growth-playbook");

    expect(metadata).toMatchObject({
      category: "Creator Insights",
      authors: [{ name: "Nuvelle Editorial" }],
      keywords: expect.arrayContaining(["Creator Insights", "creator-insights", "Nuvelle", "AI short dramas"]),
      robots: { index: true, follow: true },
      openGraph: {
        section: "Creator Insights",
        tags: expect.arrayContaining(["Creator Insights", "creator-insights"])
      }
    });
    expect(jsonLd).toMatchObject({
      "@type": "BlogPosting",
      articleSection: "Creator Insights",
      keywords: expect.arrayContaining(["Creator Insights", "creator-insights", "Nuvelle"]),
      publisher: {
        "@type": "Organization",
        name: "Nuvelle",
        url: "https://nuvelle.ai"
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": "https://nuvelle.ai/blog/growth-playbook"
      }
    });
  });
});
