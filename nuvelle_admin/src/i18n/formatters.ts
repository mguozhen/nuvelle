import type { Locale } from "./types";

function intlLocale(locale: Locale) {
  return locale === "zh" ? "zh-CN" : "en";
}

export function formatCompact(locale: Locale, value?: number | null) {
  if (value === null || value === undefined) {
    return "-";
  }

  return new Intl.NumberFormat(intlLocale(locale), {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function formatDate(locale: Locale, value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
