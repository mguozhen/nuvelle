import { BlogArticleCard } from "@/components/blog/blog-article-card";
import type { BlogListResult } from "@/lib/blog/types";
import { blogPath } from "@/lib/blog/urls";
import { homePathForLocale, type LocaleKey } from "@/lib/i18n";

type BlogListPageProps = {
  locale: LocaleKey;
  result: BlogListResult;
  emptyTitle: string;
  emptyBody: string;
};

export function BlogListPage({ locale, result, emptyTitle, emptyBody }: BlogListPageProps) {
  if (!result.articles.length) {
    return (
      <div>
        <BlogEditorialContext locale={locale} />
        <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] px-5 py-10 text-center">
          <h2 className="text-2xl font-semibold tracking-normal text-white">{emptyTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#a8b0cc]">{emptyBody}</p>
        </div>
      </div>
    );
  }

  const pageStart = Math.max(0, result.pageNum - 1) * result.pageSize + 1;
  const pageEnd = Math.min(result.total, pageStart + result.articles.length - 1);

  return (
    <div>
      <BlogEditorialContext locale={locale} />
      {result.total > result.pageSize ? (
        <p className="mb-5 mt-6 text-sm text-[#8f98b6]">
          Showing {pageStart}-{pageEnd} of {result.total}
        </p>
      ) : null}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

function BlogEditorialContext({ locale }: { locale: LocaleKey }) {
  const homeHref = homePathForLocale(locale);

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] px-5 py-6">
      <h2 className="text-2xl font-semibold tracking-normal text-white">What Nuvelle covers</h2>
      <p className="mt-3 max-w-4xl text-sm leading-relaxed text-[#a8b0cc] sm:text-base">
        Follow AI short drama production notes, vertical series release updates, creator playbooks, and story-world
        analysis from the Nuvelle team. The journal connects romance, revenge, werewolf, billionaire, and hidden
        identity trends with practical guidance for mobile-first drama viewers and creators.
      </p>
      <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
        <a className="rounded-md border border-white/12 px-3 py-2 text-white transition-colors hover:bg-white/10" href={homeHref}>
          Browse Nuvelle dramas
        </a>
        <a
          className="rounded-md border border-white/12 px-3 py-2 text-white transition-colors hover:bg-white/10"
          href={`${homeHref}#categories`}
        >
          Explore story categories
        </a>
      </div>
    </section>
  );
}
