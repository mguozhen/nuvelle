import type { MetadataRoute } from "next";
import { blogPath } from "@/lib/blog/urls";
import { siteOrigin, siteUrl } from "@/lib/site/seo";
import { localeOptions } from "@/lib/i18n";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: localeOptions.map((locale) => blogPath(locale.key, { kind: "search" }))
    },
    sitemap: siteUrl("/sitemap.xml"),
    host: siteOrigin
  };
}
