import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "./resources";
import { readStoredLocale } from "./storage";

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    resources,
    lng: readStoredLocale(),
    fallbackLng: "en",
    interpolation: {
      prefix: "{",
      suffix: "}",
      escapeValue: false
    },
    initAsync: false
  });
}

export const adminI18n = i18next;
