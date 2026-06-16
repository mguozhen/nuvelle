import { blogSearchMetadata, renderBlogSearch, type SearchParamValue } from "@/lib/blog/page-data";

export const dynamic = "force-dynamic";

type EnglishBlogSearchPageProps = {
  searchParams: Promise<{ value?: SearchParamValue }>;
};

export async function generateMetadata({ searchParams }: EnglishBlogSearchPageProps) {
  const { value } = await searchParams;

  return blogSearchMetadata("en", value);
}

export default async function EnglishBlogSearchPage({ searchParams }: EnglishBlogSearchPageProps) {
  const { value } = await searchParams;

  return renderBlogSearch("en", value);
}
