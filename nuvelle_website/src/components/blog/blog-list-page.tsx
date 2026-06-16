import { BlogArticleCard } from "@/components/blog/blog-article-card";
import type { BlogListResult } from "@/lib/blog/types";
import { blogPath } from "@/lib/blog/urls";
import type { LocaleKey } from "@/lib/i18n";

type BlogListPageProps = {
  locale: LocaleKey;
  result: BlogListResult;
  emptyTitle: string;
  emptyBody: string;
};

export function BlogListPage({ locale, result, emptyTitle, emptyBody }: BlogListPageProps) {
  if (!result.articles.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.04] px-5 py-10 text-center">
        <h2 className="text-2xl font-semibold tracking-normal text-white">{emptyTitle}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#a8b0cc]">{emptyBody}</p>
      </div>
    );
  }

  const pageStart = Math.max(0, result.pageNum - 1) * result.pageSize + 1;
  const pageEnd = Math.min(result.total, pageStart + result.articles.length - 1);

  return (
    <div>
      {result.total > result.pageSize ? (
        <p className="mb-5 text-sm text-[#8f98b6]">
          Showing {pageStart}-{pageEnd} of {result.total}
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {result.articles.map((article) => (
          <BlogArticleCard
            key={article.slug || article.id}
            article={article}
            locale={locale}
            href={blogPath(locale, { kind: "detail", slug: article.slug })}
          />
        ))}
      </div>
    </div>
  );
}
