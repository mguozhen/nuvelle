import { notFound } from "next/navigation";
import WebsiteHome from "@/components/website-home";
import { getLocaleByRouteParam, localeOptions } from "@/lib/i18n";
import { generateHomeMetadata } from "@/lib/site/seo";

type LocaleHomePageProps = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return localeOptions.filter((locale) => locale.prefix).map((locale) => ({ locale: locale.key }));
}

export async function generateMetadata({ params }: LocaleHomePageProps) {
  const { locale } = await params;
  const localeInfo = getLocaleByRouteParam(locale);
  if (!localeInfo) {
    return {};
  }

  return generateHomeMetadata(localeInfo.key);
}

export default async function LocaleHomePage({ params }: LocaleHomePageProps) {
  const { locale } = await params;
  const localeInfo = getLocaleByRouteParam(locale);
  if (!localeInfo) {
    notFound();
  }

  return <WebsiteHome locale={localeInfo.key} />;
}
