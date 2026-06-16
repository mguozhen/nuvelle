import { blogCategoryMetadata, renderBlogCategory, resolveLocaleParam } from "@/lib/blog/page-data";

type LocalizedBlogCategoryPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export const dynamicParams = false;

export async function generateStaticParams(): Promise<Array<{ locale: string; slug: string }>> {
  return [];
}

export async function generateMetadata({ params }: LocalizedBlogCategoryPageProps) {
  const { locale, slug } = await params;
  const localeKey = await resolveLocaleParam(locale);

  return blogCategoryMetadata(localeKey, slug);
}

export default async function LocalizedBlogCategoryPage({ params }: LocalizedBlogCategoryPageProps) {
  const { locale, slug } = await params;
  const localeKey = await resolveLocaleParam(locale);

  return renderBlogCategory(localeKey, slug);
}
