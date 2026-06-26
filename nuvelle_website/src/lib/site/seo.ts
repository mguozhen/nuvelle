import type { Metadata } from "next";
import { getLocale, homePathForLocale, localeOptions, type LocaleKey } from "@/lib/i18n";

export const siteOrigin = "https://nuvelle.ai";
export const siteName = "Nuvelle";
export const defaultShareImagePath = "/posters/_lead.jpg";

export const homeTitle = "Nuvelle AI Short Dramas - Watch Vertical Series Online";
export const homeDescription =
  "Watch Nuvelle AI short dramas across romance, revenge, werewolf, billionaire, and hidden identity story worlds. Discover vertical series made for fast mobile viewing.";

export const blogListTitle = "Nuvelle AI Short Drama Journal and Creator Playbooks";
export const blogListDescription =
  "Explore Nuvelle story notes, AI short drama release updates, creator playbooks, and fandom trends for vertical series viewers.";

export function homePath(locale: LocaleKey) {
  return homePathForLocale(locale);
}

export function posterPath(slug: string) {
  return `/posters/${slug}.jpg`;
}

export function siteUrl(path = "/") {
  return new URL(path, siteOrigin).toString();
}

export function siteImageUrl(path = defaultShareImagePath) {
  return siteUrl(path);
}

function languageAlternates(pathForLocale: (locale: LocaleKey) => string) {
  const languages = Object.fromEntries(
    localeOptions.map((locale) => [locale.hrefLang, siteUrl(pathForLocale(locale.key))])
  );

  return {
    ...languages,
    "x-default": siteUrl(pathForLocale("en"))
  };
}

export function homeLanguageAlternates() {
  return languageAlternates(homePath);
}

export function homeCanonicalUrl(locale: LocaleKey) {
  return siteUrl(homePath(locale));
}

function openGraphLocale(locale: LocaleKey) {
  return getLocale(locale).hrefLang.replace("-", "_");
}

export function defaultShareImage() {
  return {
    url: siteImageUrl(),
    width: 1200,
    height: 630,
    alt: "Nuvelle AI short drama posters"
  };
}

export function generateHomeMetadata(locale: LocaleKey): Metadata {
  const canonical = homeCanonicalUrl(locale);

  return {
    metadataBase: new URL(siteOrigin),
    title: homeTitle,
    description: homeDescription,
    keywords: [
      "Nuvelle",
      "AI short dramas",
      "vertical series",
      "romance shorts",
      "werewolf dramas",
      "billionaire dramas"
    ],
    alternates: {
      canonical,
      languages: homeLanguageAlternates()
    },
    openGraph: {
      title: homeTitle,
      description: homeDescription,
      url: canonical,
      siteName,
      type: "website",
      locale: openGraphLocale(locale),
      images: [defaultShareImage()]
    },
    twitter: {
      card: "summary_large_image",
      title: homeTitle,
      description: homeDescription,
      images: [siteImageUrl()]
    },
    robots: {
      index: true,
      follow: true
    },
    other: {
      "facebook-domain-verification": "14ygh3kdihl9u9q638hyy6zls7gqzr"
    }
  };
}
