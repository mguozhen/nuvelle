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

const jsonLdScriptEscapes: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};

export function serializeJsonLd(value: unknown) {
  return (JSON.stringify(value) ?? "null").replace(/[<>&\u2028\u2029]/g, (character) => jsonLdScriptEscapes[character]);
}

const htmlEntityMap: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: "\""
};

function decodeHtmlEntities(value: string) {
  const fromCodePoint = (parsed: number) =>
    Number.isFinite(parsed) && parsed >= 0 && parsed <= 0x10ffff ? String.fromCodePoint(parsed) : undefined;

  return value.replace(/&(#\d+|#x[\da-f]+|[a-z][\w]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x")) {
      const parsed = Number.parseInt(code.slice(2), 16);
      return fromCodePoint(parsed) ?? entity;
    }

    if (code.startsWith("#")) {
      const parsed = Number.parseInt(code.slice(1), 10);
      return fromCodePoint(parsed) ?? entity;
    }

    return htmlEntityMap[code.toLowerCase()] ?? entity;
  });
}

function normalizeSeoText(value: string | null | undefined) {
  return decodeHtmlEntities(stripHtml(decodeHtmlEntities(value || ""))).trim();
}

function normalizeSeoDescription(value: string | null | undefined) {
  return normalizeSeoText(value).slice(0, 160);
}

function excerptDescription(article: BlogArticleDetail) {
  return normalizeSeoDescription(article.excerpt || article.contentHtml);
}

export function blogPostingJsonLd(article: BlogArticleDetail, canonical: string) {
  const description = article.meta.desc ? normalizeSeoDescription(article.meta.desc) : excerptDescription(article);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: normalizeSeoText(article.title),
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
  const title = normalizeSeoText(article.meta.title || article.title);
  const description = article.meta.desc ? normalizeSeoDescription(article.meta.desc) : excerptDescription(article);

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
