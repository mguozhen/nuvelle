import { notFound } from "next/navigation";
import { createElement } from "react";
import { BlogArticlePage } from "@/components/blog/blog-article-page";
import { BlogListPage } from "@/components/blog/blog-list-page";
import { BlogShell } from "@/components/blog/blog-shell";
import { fetchBlogDetail, fetchBlogList } from "@/lib/blog/api";
import { blogConfig } from "@/lib/blog/config";
import type { BreadcrumbItem } from "@/lib/blog/seo";
import { metadataForBlogDetail, metadataForBlogList } from "@/lib/blog/seo";
import type { BlogListResult } from "@/lib/blog/types";
import { canonicalUrl, type BlogRoute } from "@/lib/blog/urls";
import { getLocaleByRouteParam, homePathForLocale, type LocaleKey, websiteCopy } from "@/lib/i18n";

type SafeListFetchOptions = {
  locale: LocaleKey;
  pageNum?: number;
  pageSize?: number;
  search?: string;
  type?: string;
};

export type SearchParamValue = string | string[] | undefined;

function titleFromSlug(slug: string) {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function searchQuery(query: SearchParamValue) {
  const value = Array.isArray(query) ? query[0] : query;

  return value?.trim() ?? "";
}

function emptyListResult(options: SafeListFetchOptions): BlogListResult {
  return {
    articles: [],
    total: 0,
    pageNum: options.pageNum ?? 1,
    pageSize: options.pageSize ?? blogConfig.pageSize
  };
}

async function safeListFetch(options: SafeListFetchOptions): Promise<BlogListResult> {
  try {
    return await fetchBlogList(options);
  } catch (error) {
    console.warn("Failed to fetch blog list", { options, error });

    return emptyListResult(options);
  }
}

function listText(locale: LocaleKey) {
  const copy = websiteCopy[locale];

  return {
    title: copy.nav.blog,
    description: "Read the latest Nuvelle story notes, release updates, and creator insights.",
    emptyTitle: "No blog posts yet",
    emptyBody: "Check back soon for Nuvelle updates and story recommendations."
  };
}

function categoryText(locale: LocaleKey, slug: string) {
  const label = titleFromSlug(slug) || slug;

  return {
    title: label,
    description: `Browse ${label} posts from the Nuvelle blog.`,
    emptyTitle: "No posts in this category yet",
    emptyBody: "This category is ready, but there are no published posts to show yet."
  };
}

function searchText(locale: LocaleKey, query: string) {
  const copy = websiteCopy[locale];
  const label = query || copy.search.results;

  return {
    title: query ? `${copy.search.results}: ${query}` : copy.search.results,
    description: query ? `Search results for ${query} on the Nuvelle blog.` : "Search the Nuvelle blog.",
    emptyTitle: "No matching posts",
    emptyBody: query ? `No blog posts match "${label}".` : "Enter a search term to find Nuvelle blog posts."
  };
}

function homeUrl(locale: LocaleKey) {
  return new URL(homePathForLocale(locale), blogConfig.siteOrigin).toString();
}

function blogBreadcrumbs(locale: LocaleKey, currentName: string, route: Exclude<BlogRoute, { kind: "detail" }>): BreadcrumbItem[] {
  const copy = websiteCopy[locale];
  const listUrl = canonicalUrl(blogConfig.siteOrigin, locale, { kind: "list" });
  const routeUrl = canonicalUrl(blogConfig.siteOrigin, locale, route);

  if (route.kind === "list") {
    return [
      { name: copy.nav.home, url: homeUrl(locale) },
      { name: copy.nav.blog }
    ];
  }

  return [
    { name: copy.nav.home, url: homeUrl(locale) },
    { name: copy.nav.blog, url: listUrl },
    { name: currentName, url: routeUrl }
  ];
}

export async function resolveLocaleParam(locale: string | undefined): Promise<LocaleKey> {
  const localeInfo = getLocaleByRouteParam(locale);

  if (!localeInfo) {
    notFound();
  }

  return localeInfo.key;
}

export async function renderBlogList(locale: LocaleKey) {
  const text = listText(locale);
  const result = await safeListFetch({ locale });

  return createElement(BlogShell, {
    locale,
    title: text.title,
    description: text.description,
    breadcrumbs: blogBreadcrumbs(locale, text.title, { kind: "list" }),
    children: createElement(BlogListPage, {
      locale,
      result,
      emptyTitle: text.emptyTitle,
      emptyBody: text.emptyBody
    })
  });
}

export async function renderBlogCategory(locale: LocaleKey, slug: string) {
  const text = categoryText(locale, slug);
  const result = await safeListFetch({ locale, type: slug });

  return createElement(BlogShell, {
    locale,
    title: text.title,
    description: text.description,
    breadcrumbs: blogBreadcrumbs(locale, text.title, { kind: "category", slug }),
    children: createElement(BlogListPage, {
      locale,
      result,
      emptyTitle: text.emptyTitle,
      emptyBody: text.emptyBody
    })
  });
}

export async function renderBlogSearch(locale: LocaleKey, query: SearchParamValue) {
  const value = searchQuery(query);
  const text = searchText(locale, value);
  const result = await safeListFetch({ locale, search: value });

  return createElement(BlogShell, {
    locale,
    title: text.title,
    description: text.description,
    searchValue: value,
    breadcrumbs: blogBreadcrumbs(locale, text.title, { kind: "search", query: value }),
    children: createElement(BlogListPage, {
      locale,
      result,
      emptyTitle: text.emptyTitle,
      emptyBody: text.emptyBody
    })
  });
}

export async function renderBlogDetail(locale: LocaleKey, slug: string) {
  const article = await fetchBlogDetail({ locale, slug });

  if (!article || (article.type && article.type !== "blog")) {
    notFound();
  }

  return createElement(BlogShell, {
    locale,
    title: article.title,
    description: article.excerpt,
    showHero: false,
    children: createElement(BlogArticlePage, { locale, article })
  });
}

export function blogListMetadata(locale: LocaleKey) {
  const text = listText(locale);

  return metadataForBlogList(locale, { kind: "list" }, text.title, text.description);
}

export function blogCategoryMetadata(locale: LocaleKey, slug: string) {
  const text = categoryText(locale, slug);

  return metadataForBlogList(locale, { kind: "category", slug }, text.title, text.description);
}

export function blogSearchMetadata(locale: LocaleKey, query: SearchParamValue) {
  const value = searchQuery(query);
  const text = searchText(locale, value);

  return metadataForBlogList(locale, { kind: "search", query: value }, text.title, text.description);
}

export async function blogDetailMetadata(locale: LocaleKey, slug: string) {
  const article = await fetchBlogDetail({ locale, slug });

  if (!article || (article.type && article.type !== "blog")) {
    return {};
  }

  return metadataForBlogDetail(locale, article, slug);
}
