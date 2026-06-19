import { blogConfig, type BlogConfig } from "@/lib/blog/config";
import type {
  BlogArticleDetail,
  BlogListResult,
  BloggerIntegrationPost
} from "@/lib/blog/types";
import type { LocaleKey } from "@/lib/i18n";

type Fetcher = typeof fetch;

type FetchBlogListOptions = {
  locale: LocaleKey;
  pageNum?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  config?: BlogConfig;
  fetcher?: Fetcher;
};

type FetchBlogDetailOptions = {
  locale: LocaleKey;
  slug: string;
  config?: BlogConfig;
  fetcher?: Fetcher;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function lastPathSegment(value: string | undefined) {
  return value?.split("/").filter(Boolean).pop() ?? "";
}

function categoryFromBlogger(item: BloggerIntegrationPost) {
  const slug = item.category?.slug || "";
  const name = item.category?.name || "";

  return slug || name
    ? {
        slug,
        name: name || slug
      }
    : undefined;
}

function languageForLocale(config: BlogConfig, locale: LocaleKey) {
  return config.languageByLocale[locale] || config.languageByLocale.en || "";
}

function assertBloggerConfig(config: BlogConfig) {
  const missing = [
    ["BLOGGER_API_URL", config.apiUrl],
    ["BLOGGER_ACCESS_KEY", config.accessKey],
    ["BLOGGER_SITE_SLUG", config.siteSlug]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(`Missing Blogger blog configuration: ${missing.join(", ")}`);
  }
}

function endpointUrl(config: BlogConfig, path: string, params: URLSearchParams) {
  const query = params.toString();
  return `${config.apiUrl}${path}${query ? `?${query}` : ""}`;
}

function requestOptions(config: BlogConfig) {
  return {
    cache: "no-store" as const,
    headers: {
      "X-Access-Key": config.accessKey
    }
  };
}

async function readJson<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    const status = response.status ? ` ${response.status}` : "";
    const statusText = response.statusText ? ` ${response.statusText}` : "";
    throw new Error(`${label} request failed:${status}${statusText}`.trim());
  }

  return (await response.json()) as T;
}

export function mapBloggerPost(item: BloggerIntegrationPost): BlogArticleDetail {
  const slug = item.slug || lastPathSegment(item.path);

  return {
    id: stringValue(item.id),
    slug,
    title: stringValue(item.title),
    excerpt: stringValue(item.excerpt),
    date: stringValue(item.published_at),
    image: item.cover_image_url || undefined,
    authorName: item.author?.nickname || item.author?.email || undefined,
    category: categoryFromBlogger(item),
    contentHtml: stringValue(item.html_content),
    meta: {
      title: item.meta_title || undefined,
      desc: item.meta_description || undefined
    },
    canonicalUrl: item.canonical_url || undefined,
    modifiedDate: item.updated_at || undefined,
    path: item.path || (slug ? `/blog/${slug}` : undefined)
  };
}

function matchesSearch(article: BlogArticleDetail, search: string) {
  const query = search.toLowerCase();
  const haystack = [
    article.title,
    article.excerpt,
    article.authorName,
    article.category?.name,
    article.category?.slug
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export async function fetchBlogList(options: FetchBlogListOptions): Promise<BlogListResult> {
  const config = options.config ?? blogConfig;
  const fetcher = options.fetcher ?? fetch;
  assertBloggerConfig(config);
  const pageNum = Math.max(1, Math.trunc(options.pageNum ?? 1));
  const pageSize = options.pageSize ?? config.pageSize;
  const params = new URLSearchParams({
    limit: String(pageSize),
    offset: String((pageNum - 1) * pageSize)
  });

  const language = languageForLocale(config, options.locale);
  if (language) {
    params.set("language", language);
  }

  const type = options.type?.trim();
  if (type) {
    params.set("category_slug", type);
  }

  const response = await fetcher(
    endpointUrl(config, `/api/integration/sites/${encodeURIComponent(config.siteSlug)}/posts`, params),
    requestOptions(config)
  );
  const posts = await readJson<BloggerIntegrationPost[]>(response, "Blog list");
  const search = options.search?.trim();
  const articles = (Array.isArray(posts) ? posts : [])
    .map(mapBloggerPost)
    .filter((article) => article.slug && article.title)
    .filter((article) => (search ? matchesSearch(article, search) : true));

  return {
    articles,
    total: articles.length,
    pageNum,
    pageSize
  };
}

export async function fetchBlogDetail(options: FetchBlogDetailOptions): Promise<BlogArticleDetail | null> {
  const config = options.config ?? blogConfig;
  const fetcher = options.fetcher ?? fetch;
  assertBloggerConfig(config);
  const params = new URLSearchParams();

  const language = languageForLocale(config, options.locale);
  if (language) {
    params.set("language", language);
  }

  const response = await fetcher(
    endpointUrl(
      config,
      `/api/integration/sites/${encodeURIComponent(config.siteSlug)}/posts/${encodeURIComponent(options.slug)}`,
      params
    ),
    requestOptions(config)
  );

  if (response.status === 404) {
    return null;
  }

  const detail = await readJson<BloggerIntegrationPost>(response, "Blog detail");
  const article = mapBloggerPost(detail);

  return article.slug && article.title ? article : null;
}
