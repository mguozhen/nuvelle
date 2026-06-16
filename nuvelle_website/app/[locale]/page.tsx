import { notFound } from "next/navigation";
import WebsiteHome from "@/components/website-home";
import { getLocaleByRouteParam, localeOptions } from "@/lib/i18n";

type LocaleHomePageProps = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return localeOptions.filter((locale) => locale.prefix).map((locale) => ({ locale: locale.key }));
}

export default async function LocaleHomePage({ params }: LocaleHomePageProps) {
  const { locale } = await params;
  const localeInfo = getLocaleByRouteParam(locale);
  if (!localeInfo) {
    notFound();
  }

  return <WebsiteHome locale={localeInfo.key} />;
}
