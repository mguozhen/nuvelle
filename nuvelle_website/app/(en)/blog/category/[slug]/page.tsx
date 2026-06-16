import { blogCategoryMetadata, renderBlogCategory } from "@/lib/blog/page-data";

type EnglishBlogCategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: EnglishBlogCategoryPageProps) {
  const { slug } = await params;

  return blogCategoryMetadata("en", slug);
}

export default async function EnglishBlogCategoryPage({ params }: EnglishBlogCategoryPageProps) {
  const { slug } = await params;

  return renderBlogCategory("en", slug);
}
