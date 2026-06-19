import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { formatCompact as formatCompactValue, formatDate as formatDateValue } from "./formatters";
import { writeStoredLocale } from "./storage";
import type { I18nContextValue, Locale, TranslationKey, TranslationValues } from "./types";

function normalizeLocale(language?: string): Locale {
  return language === "zh" ? "zh" : "en";
}

export function useI18n(): I18nContextValue {
  const { i18n, t: translate } = useTranslation();
  const locale = normalizeLocale(i18n.resolvedLanguage ?? i18n.language);

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      writeStoredLocale(nextLocale);
      void i18n.changeLanguage(nextLocale);
    },
    [i18n]
  );

  const t = useCallback(
    (key: TranslationKey, values?: TranslationValues) => String(translate(key, values)),
    [translate]
  );

  const formatCompact = useCallback((value?: number | null) => formatCompactValue(locale, value), [locale]);
  const formatDate = useCallback((value?: string | null) => formatDateValue(locale, value), [locale]);

  return { locale, setLocale, t, formatCompact, formatDate };
}
