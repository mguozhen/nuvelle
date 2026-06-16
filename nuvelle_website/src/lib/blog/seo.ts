import type { Metadata } from "next";
import { blogConfig } from "@/lib/blog/config";
import { stripHtml } from "@/lib/blog/sanitize";
import {
  buildAlternateLinks,
  buildDetailAlternateLinks,
  canonicalUrl,
  type BlogRoute
} from "@/lib/blog/urls";
import type { BlogArticleDetail } from "@/lib/blog/types";
import type { LocaleKey } from "@/lib/i18n";

export type BreadcrumbItem = {
  name: string;
  url?: string;
};

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: item.url ? { "@id": item.url, name: item.name } : { name: item.name }
    }))
  };
}

export function blogPostingJsonLd(article: BlogArticleDetail, canonical: string) {
  const description = article.meta.desc || stripHtml(article.excerpt || article.contentHtml).trim().slice(0, 160);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: stripHtml(article.title).trim(),
    description,
    image: article.image ? [article.image] : undefined,
    datePublished: article.date,
    dateModified: article.modifiedDate || article.date,
    author: article.authorName ? { "@type": "Person", name: article.authorName } : undefined,
    mainEntityOfPage: canonical
  };
}

export function metadataForBlogList(
  locale: LocaleKey,
  route: Exclude<BlogRoute, { kind: "detail" }>,
  title: string,
  description: string
): Metadata {
  const canonical = canonicalUrl(blogConfig.siteOrigin, locale, route);
  const alternates = buildAlternateLinks(blogConfig.siteOrigin, route);

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: Object.fromEntries(alternates.map((item) => [item.hrefLang, item.href]))
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Nuvelle",
      type: "website"
    }
  };
}

export function metadataForBlogDetail(locale: LocaleKey, article: BlogArticleDetail, slug: string): Metadata {
  const canonical = article.canonicalUrl || canonicalUrl(blogConfig.siteOrigin, locale, { kind: "detail", slug });
  const alternates = buildDetailAlternateLinks(blogConfig.siteOrigin, locale, slug);
  const title = article.meta.title || article.title;
  const description = article.meta.desc || stripHtml(article.excerpt || article.contentHtml).trim().slice(0, 160);

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: Object.fromEntries(alternates.map((item) => [item.hrefLang, item.href]))
    },
    openGraph: {
      title,
      description,
      url: canonical,
      images: article.image ? [article.image] : undefined,
      siteName: "Nuvelle",
      type: "article",
      publishedTime: article.date,
      modifiedTime: article.modifiedDate || article.date
    },
    twitter: {
      card: article.image ? "summary_large_image" : "summary",
      title,
      description,
      images: article.image ? [article.image] : undefined
    }
  };
}
