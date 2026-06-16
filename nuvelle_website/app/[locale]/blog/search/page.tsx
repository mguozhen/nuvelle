import { blogSearchMetadata, renderBlogSearch, resolveLocaleParam, type SearchParamValue } from "@/lib/blog/page-data";

export const dynamic = "force-dynamic";

type LocalizedBlogSearchPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ value?: SearchParamValue }>;
};

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
