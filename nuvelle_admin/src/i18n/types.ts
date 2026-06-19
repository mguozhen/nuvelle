import type { en } from "./locales/en";

export type Locale = "en" | "zh";
export type TranslationKey = keyof typeof en;
export type TranslationValues = Record<string, string | number>;

export type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
  formatCompact: (value?: number | null) => string;
  formatDate: (value?: string | null) => string;
};
