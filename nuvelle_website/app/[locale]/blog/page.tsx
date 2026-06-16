import { blogListMetadata, renderBlogList, resolveLocaleParam } from "@/lib/blog/page-data";
import { localeOptions } from "@/lib/i18n";

type LocalizedBlogPageProps = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return localeOptions.filter((locale) => locale.prefix).map((locale) => ({ locale: locale.key }));
}

export async function generateMetadata({ params }: LocalizedBlogPageProps) {
  const { locale } = await params;
  const localeKey = await resolveLocaleParam(locale);

  return blogListMetadata(localeKey);
}

export default async function LocalizedBlogPage({ params }: LocalizedBlogPageProps) {
  const { locale } = await params;
  const localeKey = await resolveLocaleParam(locale);

  return renderBlogList(localeKey);
}
