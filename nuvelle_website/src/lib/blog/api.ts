import { blogConfig, type BlogConfig } from "@/lib/blog/config";
import type {
  BackendBlogDetail,
  BackendBlogListItem,
  BlogArticleDetail,
  BlogArticleListItem,
  BlogListResult
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

type BlogListPayload = {
  total?: number | string;
  list?: BackendBlogListItem[];
};

type BlogApiResponse<T> = {
  data?: T;
};

const NUVELLE_BLOG_CATEGORY_IDS = "373";

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function lastPathSegment(value: string | undefined) {
  return value?.split("/").filter(Boolean).pop() ?? "";
}

function categoryFromBackend(item: BackendBlogListItem) {
  const slug = item.category?.slug || item.category_slug || "";
  const name = item.category?.name || item.category_name || "";

  return slug || name
    ? {
        slug,
        name: name || slug
      }
    : undefined;
}

function appendCategoryIds(params: URLSearchParams) {
  params.set("categoryIds", NUVELLE_BLOG_CATEGORY_IDS);
}

function endpointUrl(config: BlogConfig, path: string, params: URLSearchParams) {
  return `${config.slxHost.replace(/\/+$/, "")}${path}?${params.toString()}`;
}

async function readJson<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    const status = response.status ? ` ${response.status}` : "";
    const statusText = response.statusText ? ` ${response.statusText}` : "";
    throw new Error(`${label} request failed:${status}${statusText}`.trim());
  }

  return (await response.json()) as T;
}

export function mapBlogListItem(item: BackendBlogListItem): BlogArticleListItem {
  return {
    id: numberValue(item.ID ?? item.id),
    slug: item.slug || item.post_name || lastPathSegment(item.detailUrl),
    title: stringValue(item.post_title || item.title),
    excerpt: stringValue(item.post_excerpt || item.description),
    date: stringValue(item.post_date || item.update_time),
    image: item.twitter_image,
    authorName: item.author_name,
    category: categoryFromBackend(item)
  };
}

export function mapBlogDetail(item: BackendBlogDetail | null | undefined): BlogArticleDetail | null {
  if (!item) {
    return null;
  }

  const base = mapBlogListItem(item);
  if (!base.slug || !base.title) {
    return null;
  }

  return {
    ...base,
    contentHtml: stringValue(item.post_content),
    meta: {
      title: item.meta?.title,
      desc: item.meta?.desc
    },
    schemaJsonTrimmed: item.schemaJsonTrimmed,
    canonicalUrl: item.canonicalUrl || item.canonical_url || item.canonical || item.sourceUrl || item.source_url,
    modifiedDate: item.post_modified,
    type: item.type
  };
}

export async function fetchBlogList(options: FetchBlogListOptions): Promise<BlogListResult> {
  const config = options.config ?? blogConfig;
  const fetcher = options.fetcher ?? fetch;
  const pageNum = Math.max(1, Math.trunc(options.pageNum ?? 1));
  const requestPageNum = pageNum - 1;
  const pageSize = options.pageSize ?? config.pageSize;
  const params = new URLSearchParams({
    site: config.siteKey,
    pageNum: String(requestPageNum),
    pageSize: String(pageSize)
  });

  appendCategoryIds(params);

  const search = options.search?.trim();
  if (search) {
    params.set("search", search);
  }

  const type = options.type?.trim();
  if (type) {
    params.set("type", type);
  }

  const response = await fetcher(endpointUrl(config, "/n/blog/listDataV2", params), {
    cache: "no-store"
  });
  const json = await readJson<BlogApiResponse<BlogListPayload>>(response, "Blog list");

  const data = json.data ?? {};
  const list = Array.isArray(data.list) ? data.list : [];

  return {
    articles: list.map(mapBlogListItem).filter((article) => article.slug && article.title),
    total: numberValue(data.total),
    pageNum,
    pageSize
  };
}

export async function fetchBlogDetail(options: FetchBlogDetailOptions): Promise<BlogArticleDetail | null> {
  const config = options.config ?? blogConfig;
  const fetcher = options.fetcher ?? fetch;
  const params = new URLSearchParams({
    site: config.siteKey,
    slug: options.slug
  });

  appendCategoryIds(params);

  const response = await fetcher(endpointUrl(config, "/n/blog/detailData", params), {
    cache: "no-store"
  });
  const json = await readJson<BlogApiResponse<BackendBlogDetail | BackendBlogDetail[]>>(response, "Blog detail");
  const detail = Array.isArray(json.data) ? json.data[0] : json.data;

  return mapBlogDetail(detail);
}
