import { blogSearchMetadata, renderBlogSearch } from "@/lib/blog/page-data";

type EnglishBlogSearchPageProps = {
  searchParams: Promise<{ value?: string }>;
};

export async function generateMetadata({ searchParams }: EnglishBlogSearchPageProps) {
  const { value } = await searchParams;

  return blogSearchMetadata("en", value);
}

export default async function EnglishBlogSearchPage({ searchParams }: EnglishBlogSearchPageProps) {
  const { value } = await searchParams;

  return renderBlogSearch("en", value);
}
