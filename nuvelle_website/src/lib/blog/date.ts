import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/zh-cn";
import "dayjs/locale/ja";
import "dayjs/locale/de";
import "dayjs/locale/fr";
import "dayjs/locale/es";
import "dayjs/locale/pt";
import type { LocaleKey } from "@/lib/i18n";

const dayjsLocaleByLocale: Record<LocaleKey, string> = {
  en: "en",
  cn: "zh-cn",
  jp: "ja",
  de: "de",
  fr: "fr",
  es: "es",
  pt: "pt"
};

dayjs.extend(utc);
dayjs.extend(localizedFormat);

export function formatBlogDate(value: string, locale: LocaleKey) {
  const date = dayjs.utc(value);

  if (!date.isValid()) {
    return value;
  }

  return date.locale(dayjsLocaleByLocale[locale]).format("LLL");
}
