import { blogDetailMetadata, renderBlogDetail, resolveLocaleParam } from "@/lib/blog/page-data";

type LocalizedBlogDetailPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: LocalizedBlogDetailPageProps) {
  const { locale, slug } = await params;
  const localeKey = await resolveLocaleParam(locale);

  return blogDetailMetadata(localeKey, slug);
}

export default async function LocalizedBlogDetailPage({ params }: LocalizedBlogDetailPageProps) {
  const { locale, slug } = await params;
  const localeKey = await resolveLocaleParam(locale);

  return renderBlogDetail(localeKey, slug);
}
