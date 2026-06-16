import { blogListMetadata, renderBlogList } from "@/lib/blog/page-data";

export const metadata = blogListMetadata("en");

export default function EnglishBlogPage() {
  return renderBlogList("en");
}
