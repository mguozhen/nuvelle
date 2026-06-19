import type { LocaleKey } from "@/lib/i18n";

type Env = Record<string, string | undefined>;

export type BlogConfig = {
  apiUrl: string;
  accessKey: string;
  siteSlug: string;
  pageSize: number;
  siteOrigin: string;
  languageByLocale: Record<LocaleKey, string>;
};

function parsePageSize(value: string | undefined) {
  const pageSize = Number(value);
  return Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 12;
}

function trimTrailingSlash(value: string | undefined) {
  return (value || "").replace(/\/+$/, "");
}

function languageByLocale(env: Env): Record<LocaleKey, string> {
  const fallback = env.BLOGGER_LANGUAGE || "en";

  return {
    en: env.BLOGGER_LANGUAGE_EN || fallback,
    cn: env.BLOGGER_LANGUAGE_CN || fallback,
    jp: env.BLOGGER_LANGUAGE_JP || fallback,
    de: env.BLOGGER_LANGUAGE_DE || fallback,
    fr: env.BLOGGER_LANGUAGE_FR || fallback,
    es: env.BLOGGER_LANGUAGE_ES || fallback,
    pt: env.BLOGGER_LANGUAGE_PT || fallback
  };
}

export function createBlogConfig(env: Env = process.env): BlogConfig {
  return {
    apiUrl: trimTrailingSlash(env.BLOGGER_API_URL),
    accessKey: env.BLOGGER_ACCESS_KEY || "",
    siteSlug: env.BLOGGER_SITE_SLUG || "",
    pageSize: parsePageSize(env.BLOG_PAGE_SIZE),
    siteOrigin: env.NEXT_PUBLIC_SITE_ORIGIN || "https://nuvelle.ai",
    languageByLocale: languageByLocale(env)
  };
}

export const blogConfig = createBlogConfig();
