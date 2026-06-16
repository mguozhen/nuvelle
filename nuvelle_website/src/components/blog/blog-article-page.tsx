import { BlogBreadcrumbs } from "@/components/blog/blog-breadcrumbs";
import { blogConfig } from "@/lib/blog/config";
import { breadcrumbJsonLd, blogPostingJsonLd, type BreadcrumbItem } from "@/lib/blog/seo";
import { sanitizeArticleHtml } from "@/lib/blog/sanitize";
import type { BlogArticleDetail } from "@/lib/blog/types";
import { blogPath, canonicalUrl } from "@/lib/blog/urls";
import { homePathForLocale, type LocaleKey, websiteCopy } from "@/lib/i18n";

type BlogArticlePageProps = {
  locale: LocaleKey;
  article: BlogArticleDetail;
};

function parseBackendJsonLd(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function BlogArticlePage({ locale, article }: BlogArticlePageProps) {
  const copy = websiteCopy[locale];
  const canonical = article.canonicalUrl || canonicalUrl(blogConfig.siteOrigin, locale, { kind: "detail", slug: article.slug });
  const blogUrl = canonicalUrl(blogConfig.siteOrigin, locale, { kind: "list" });
  const homeUrl = blogUrl.replace(blogPath(locale, { kind: "list" }), homePathForLocale(locale));
  const breadcrumbs: BreadcrumbItem[] = [
    { name: copy.nav.home, url: homeUrl },
    { name: copy.nav.blog, url: blogUrl },
    { name: article.title }
  ];
  const backendJsonLd = parseBackendJsonLd(article.schemaJsonTrimmed);
  const articleJsonLd = backendJsonLd ?? blogPostingJsonLd(article, canonical);
  const sanitizedHtml = sanitizeArticleHtml(article.contentHtml);

  return (
    <article className="mx-auto max-w-4xl">
      <BlogBreadcrumbs items={breadcrumbs} />

      <header className="mt-8">
        {article.category ? (
          <a
            className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff96d0] transition-colors hover:text-[#ffd0e8]"
            href={blogPath(locale, { kind: "category", slug: article.category.slug })}
          >
            {article.category.name}
          </a>
        ) : null}
        <h1 className="mt-3 text-4xl font-bold leading-tight tracking-normal text-white sm:text-5xl">{article.title}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[#8f98b6]">
          {article.authorName ? <span>{article.authorName}</span> : null}
          {article.authorName ? <span className="text-[#4e5674]">/</span> : null}
          <time dateTime={article.date}>{article.date}</time>
        </div>
      </header>

      {article.image ? (
        <div className="mt-8 aspect-[16/9] overflow-hidden rounded-lg border border-white/10 bg-[#111626]">
          <img alt={article.title} className="h-full w-full object-cover" src={article.image} />
        </div>
      ) : null}

      <div
        className="blog-article-content mt-9"
        dangerouslySetInnerHTML={{
          __html: sanitizedHtml
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs))
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd)
        }}
      />
    </article>
  );
}
