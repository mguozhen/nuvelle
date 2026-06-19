import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { adminI18n } from "./i18next";
import { readStoredLocale } from "./storage";

export function I18nProvider({ children }: { children: ReactNode }) {
  const storedLocale = readStoredLocale();

  if (adminI18n.language !== storedLocale) {
    void adminI18n.changeLanguage(storedLocale);
  }

  return <I18nextProvider i18n={adminI18n}>{children}</I18nextProvider>;
}
