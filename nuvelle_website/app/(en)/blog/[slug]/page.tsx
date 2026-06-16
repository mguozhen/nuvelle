import { blogDetailMetadata, renderBlogDetail } from "@/lib/blog/page-data";

type EnglishBlogDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: EnglishBlogDetailPageProps) {
  const { slug } = await params;

  return blogDetailMetadata("en", slug);
}

export default async function EnglishBlogDetailPage({ params }: EnglishBlogDetailPageProps) {
  const { slug } = await params;

  return renderBlogDetail("en", slug);
}
