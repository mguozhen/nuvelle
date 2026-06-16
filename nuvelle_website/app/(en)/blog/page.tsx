import { blogListMetadata, renderBlogList } from "@/lib/blog/page-data";

export const dynamic = "force-dynamic";

export const metadata = blogListMetadata("en");

export default function EnglishBlogPage() {
  return renderBlogList("en");
}
