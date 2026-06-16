import { blogListMetadata, renderBlogList, resolveLocaleParam } from "@/lib/blog/page-data";

export const dynamic = "force-dynamic";

type LocalizedBlogPageProps = {
  params: Promise<{ locale: string }>;
};

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
