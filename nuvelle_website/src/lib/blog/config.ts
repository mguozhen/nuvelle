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
  return {
    en: env.BLOGGER_LANGUAGE_EN || env.BLOGGER_LANGUAGE || "en",
    cn: env.BLOGGER_LANGUAGE_CN || "cn",
    jp: env.BLOGGER_LANGUAGE_JP || "jp",
    de: env.BLOGGER_LANGUAGE_DE || "de",
    fr: env.BLOGGER_LANGUAGE_FR || "fr",
    es: env.BLOGGER_LANGUAGE_ES || "es",
    pt: env.BLOGGER_LANGUAGE_PT || "pt"
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
