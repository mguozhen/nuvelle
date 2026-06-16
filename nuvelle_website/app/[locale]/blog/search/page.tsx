import { blogSearchMetadata, renderBlogSearch, resolveLocaleParam } from "@/lib/blog/page-data";
import { localeOptions } from "@/lib/i18n";

type LocalizedBlogSearchPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ value?: string }>;
};

export function generateStaticParams() {
  return localeOptions.filter((locale) => locale.prefix).map((locale) => ({ locale: locale.key }));
}

export async function generateMetadata({ params, searchParams }: LocalizedBlogSearchPageProps) {
  const { locale } = await params;
  const { value } = await searchParams;
  const localeKey = await resolveLocaleParam(locale);

  return blogSearchMetadata(localeKey, value);
}

export default async function LocalizedBlogSearchPage({ params, searchParams }: LocalizedBlogSearchPageProps) {
  const { locale } = await params;
  const { value } = await searchParams;
  const localeKey = await resolveLocaleParam(locale);

  return renderBlogSearch(localeKey, value);
}
