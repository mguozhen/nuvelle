import { getLocale, localeOptions, type LocaleKey } from "@/lib/i18n";

export type BlogRoute =
  | { kind: "list" }
  | { kind: "category"; slug: string }
  | { kind: "search"; query?: string }
  | { kind: "detail"; slug: string };

export type AlternateLink = {
  hrefLang: string;
  href: string;
};

const productionSiteOrigin = "https://nuvelle.ai";

export function normalizeSiteOrigin(origin: string) {
  return origin.replace(/\/+$/, "");
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

export function blogPath(locale: LocaleKey, route: BlogRoute) {
  const prefix = getLocale(locale).prefix;
  const base = `${prefix}/blog`;

  if (route.kind === "category") {
    return `${base}/category/${encodePathSegment(route.slug)}`;
  }

  if (route.kind === "search") {
    const query = route.query?.trim();
    return query ? `${base}/search?value=${encodeURIComponent(query)}` : `${base}/search`;
  }

  if (route.kind === "detail") {
    return `${base}/${encodePathSegment(route.slug)}`;
  }

  return base;
}

export function canonicalUrl(origin: string, locale: LocaleKey, route: BlogRoute) {
  return `${normalizeSiteOrigin(origin)}${blogPath(locale, route)}`;
}

export function siteRelativeUrl(origin: string, href: string) {
  try {
    const url = new URL(href);
    const sameSiteOrigins = new Set([normalizeSiteOrigin(origin), productionSiteOrigin]);

    if (!sameSiteOrigins.has(url.origin)) {
      return href;
    }

    return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return href;
  }
}

export function buildAlternateLinks(origin: string, route: Exclude<BlogRoute, { kind: "detail" }>): AlternateLink[] {
  const normalizedOrigin = normalizeSiteOrigin(origin);
  const alternates = localeOptions.map((locale) => ({
    hrefLang: locale.hrefLang,
    href: `${normalizedOrigin}${blogPath(locale.key, route)}`
  }));

  alternates.push({
    hrefLang: "x-default",
    href: `${normalizedOrigin}${blogPath("en", route)}`
  });

  return alternates;
}

export function buildDetailAlternateLinks(origin: string, locale: LocaleKey, slug: string): AlternateLink[] {
  const normalizedOrigin = normalizeSiteOrigin(origin);
  const href = `${normalizedOrigin}${blogPath(locale, { kind: "detail", slug })}`;

  return [
    {
      hrefLang: getLocale(locale).hrefLang,
      href
    },
    {
      hrefLang: "x-default",
      href
    }
  ];
}
