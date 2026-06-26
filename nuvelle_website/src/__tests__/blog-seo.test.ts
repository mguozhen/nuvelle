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
    const listMetadata = metadataForBlogList(
      "en",
      { kind: "list" },
      "Nuvelle AI Short Drama Journal and Creator Playbooks",
      "Explore Nuvelle story notes, AI short drama release updates, creator playbooks, and fandom trends for vertical series viewers."
    );
    const searchMetadata = metadataForBlogList(
      "en",
      { kind: "search", query: "creator" },
      "Results: creator",
      "Search results for creator on the Nuvelle blog."
    );

    expect(listMetadata).toMatchObject({
      title: "Nuvelle AI Short Drama Journal and Creator Playbooks",
      robots: { index: true, follow: true },
      openGraph: {
        images: expect.arrayContaining([
          expect.objectContaining({
            url: "https://nuvelle.ai/posters/_lead.jpg",
            alt: "Nuvelle AI short drama posters"
          })
        ])
      },
      twitter: {
        card: "summary_large_image",
        title: "Nuvelle AI Short Drama Journal and Creator Playbooks",
        description:
          "Explore Nuvelle story notes, AI short drama release updates, creator playbooks, and fandom trends for vertical series viewers.",
        images: ["https://nuvelle.ai/posters/_lead.jpg"]
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
