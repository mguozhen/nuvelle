import type { MetadataRoute } from "next";
import { blogPath } from "@/lib/blog/urls";
import { homePath, siteUrl } from "@/lib/site/seo";
import { localeOptions } from "@/lib/i18n";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const homeEntries = localeOptions.map((locale) => ({
    url: siteUrl(homePath(locale.key)),
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: locale.key === "en" ? 1 : 0.9
  }));
  const blogEntries = localeOptions.map((locale) => ({
    url: siteUrl(blogPath(locale.key, { kind: "list" })),
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7
  }));

  return [...homeEntries, ...blogEntries];
}
