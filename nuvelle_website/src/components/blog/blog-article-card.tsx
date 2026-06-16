import type { BlogArticleListItem } from "@/lib/blog/types";
import { formatBlogDate } from "@/lib/blog/date";
import type { LocaleKey } from "@/lib/i18n";

type BlogArticleCardProps = {
  article: BlogArticleListItem;
  href: string;
  locale: LocaleKey;
};

export function BlogArticleCard({ article, href, locale }: BlogArticleCardProps) {
  return (
    <article className="h-full">
      <a
        href={href}
        className="group flex h-full flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] transition-colors hover:border-white/20 hover:bg-white/[0.07]"
      >
        {article.image ? (
          <div className="aspect-[16/9] overflow-hidden bg-[#111626]">
            <img
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
              src={article.image}
            />
          </div>
        ) : (
          <div className="aspect-[16/9] bg-[linear-gradient(135deg,#171225,#231426)]" aria-hidden="true" />
        )}
        <div className="flex flex-1 flex-col p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8f98b6]">
            <time dateTime={article.date}>{formatBlogDate(article.date, locale)}</time>
          </div>
          <h2 className="mt-3 text-xl font-semibold leading-snug tracking-normal text-white transition-colors group-hover:text-[#ffd0e8]">
            {article.title}
          </h2>
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#a8b0cc]">{article.excerpt}</p>
        </div>
      </a>
    </article>
  );
}
