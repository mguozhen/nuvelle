import type { Metadata } from "next";
import { blogConfig } from "@/lib/blog/config";
import { stripHtml } from "@/lib/blog/sanitize";
import {
  buildAlternateLinks,
  buildDetailAlternateLinks,
  canonicalUrl,
  normalizeSiteOrigin,
  type BlogRoute
} from "@/lib/blog/urls";
import type { BlogArticleDetail } from "@/lib/blog/types";
import { getLocale, type LocaleKey } from "@/lib/i18n";

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

function siteOrigin() {
  return normalizeSiteOrigin(blogConfig.siteOrigin);
}

function brandedTitle(title: string) {
  const normalized = normalizeSeoText(title);

  return normalized.includes("Nuvelle") ? normalized : `${normalized} | Nuvelle`;
}

function openGraphLocale(locale: LocaleKey) {
  return getLocale(locale).hrefLang.replace("-", "_");
}

function organizationJsonLd() {
  return {
    "@type": "Organization",
    name: "Nuvelle",
    url: siteOrigin()
  };
}

function unique(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => normalizeSeoText(value)).filter(Boolean)));
}

function articleTags(article: BlogArticleDetail) {
  return unique([article.category?.name, article.category?.slug]);
}

function articleKeywords(article: BlogArticleDetail) {
  return unique([article.category?.name, article.category?.slug, "Nuvelle", "AI short dramas", "vertical dramas"]);
}

function listKeywords(title: string) {
  return unique([title, "Nuvelle", "AI short dramas", "vertical dramas", "short drama blog"]);
}

export function blogPostingJsonLd(article: BlogArticleDetail, canonical: string) {
  const description = article.meta.desc ? normalizeSeoDescription(article.meta.desc) : excerptDescription(article);
  const tags = articleTags(article);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: normalizeSeoText(article.title),
    description,
    image: article.image ? [article.image] : undefined,
    datePublished: article.date,
    dateModified: article.modifiedDate || article.date,
    author: article.authorName ? { "@type": "Person", name: article.authorName } : undefined,
    articleSection: article.category?.name,
    keywords: articleKeywords(article),
    publisher: organizationJsonLd(),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical
    },
    about: tags.map((tag) => ({ "@type": "Thing", name: tag }))
  };
}

export function blogCollectionJsonLd(
  locale: LocaleKey,
  route: Exclude<BlogRoute, { kind: "detail" }>,
  title: string,
  description: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: brandedTitle(title),
    description: normalizeSeoDescription(description),
    url: canonicalUrl(blogConfig.siteOrigin, locale, route),
    inLanguage: getLocale(locale).hrefLang,
    publisher: organizationJsonLd(),
    isPartOf: {
      "@type": "WebSite",
      name: "Nuvelle",
      url: siteOrigin()
    }
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
  const seoTitle = brandedTitle(title);
  const noindex = route.kind === "search";

  return {
    title: seoTitle,
    description,
    keywords: listKeywords(title),
    robots: {
      index: !noindex,
      follow: true
    },
    alternates: {
      canonical,
      languages: Object.fromEntries(alternates.map((item) => [item.hrefLang, item.href]))
    },
    openGraph: {
      title: seoTitle,
      description,
      url: canonical,
      siteName: "Nuvelle",
      type: "website",
      locale: openGraphLocale(locale)
    },
    twitter: {
      card: "summary",
      title: seoTitle,
      description
    }
  };
}

export function metadataForBlogDetail(locale: LocaleKey, article: BlogArticleDetail, slug: string): Metadata {
  const canonical = article.canonicalUrl || canonicalUrl(blogConfig.siteOrigin, locale, { kind: "detail", slug });
  const alternates = buildDetailAlternateLinks(blogConfig.siteOrigin, locale, slug);
  const title = normalizeSeoText(article.meta.title || article.title);
  const description = article.meta.desc ? normalizeSeoDescription(article.meta.desc) : excerptDescription(article);
  const tags = articleTags(article);

  return {
    title,
    description,
    authors: article.authorName ? [{ name: article.authorName }] : undefined,
    category: article.category?.name,
    keywords: articleKeywords(article),
    robots: {
      index: true,
      follow: true
    },
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
      modifiedTime: article.modifiedDate || article.date,
      locale: openGraphLocale(locale),
      authors: article.authorName ? [article.authorName] : undefined,
      section: article.category?.name,
      tags
    },
    twitter: {
      card: article.image ? "summary_large_image" : "summary",
      title,
      description,
      images: article.image ? [article.image] : undefined
    }
  };
}
