import type { LocaleKey } from "@/lib/i18n";

type Env = Record<string, string | undefined>;

export type BlogConfig = {
  slxHost: string;
  siteKey: string;
  pageSize: number;
  siteOrigin: string;
  categoryIdsByLocale: Record<LocaleKey, number[]>;
};

export function parseCategoryIds(value: string | undefined): number[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function parsePageSize(value: string | undefined) {
  const pageSize = Number(value);
  return Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 12;
}

export function createBlogConfig(env: Env = process.env): BlogConfig {
  return {
    slxHost: env.BLOG_SLX_HOST || "https://apps.voc.ai",
    siteKey: env.BLOG_SITE_KEY || "nuvelle.ai",
    pageSize: parsePageSize(env.BLOG_PAGE_SIZE),
    siteOrigin: env.NEXT_PUBLIC_SITE_ORIGIN || "https://nuvelle.ai",
    categoryIdsByLocale: {
      en: parseCategoryIds(env.BLOG_CATEGORY_IDS_EN),
      cn: parseCategoryIds(env.BLOG_CATEGORY_IDS_CN),
      jp: parseCategoryIds(env.BLOG_CATEGORY_IDS_JP),
      de: parseCategoryIds(env.BLOG_CATEGORY_IDS_DE),
      fr: parseCategoryIds(env.BLOG_CATEGORY_IDS_FR),
      es: parseCategoryIds(env.BLOG_CATEGORY_IDS_ES),
      pt: parseCategoryIds(env.BLOG_CATEGORY_IDS_PT)
    }
  };
}

export const blogConfig = createBlogConfig();
