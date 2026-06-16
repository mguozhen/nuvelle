import type { ReactNode } from "react";
import { Search, Smartphone } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { BlogBreadcrumbs } from "@/components/blog/blog-breadcrumbs";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { breadcrumbJsonLd, serializeJsonLd, type BreadcrumbItem } from "@/lib/blog/seo";
import { blogPath } from "@/lib/blog/urls";
import { getLocale, homePathForLocale, type LocaleKey, websiteCopy } from "@/lib/i18n";

type BlogShellProps = {
  locale: LocaleKey;
  title: string;
  description: string;
  searchValue?: string;
  breadcrumbs?: BreadcrumbItem[];
  showHero?: boolean;
  children: ReactNode;
};

export function BlogShell({ locale, title, description, searchValue, breadcrumbs, showHero = true, children }: BlogShellProps) {
  const copy = websiteCopy[locale];
  const localeInfo = getLocale(locale);
  const homeHref = homePathForLocale(locale);
  const appHref = `${homeHref}#app`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0d16]/80 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1320px] flex-wrap items-center gap-4 px-5 py-3 sm:flex-nowrap sm:px-7 sm:py-0">
          <a href={homeHref} aria-label={copy.homeAriaLabel}>
            <BrandMark />
          </a>
          <SiteNav locale={locale} />
          <div className="flex-1" />
          <form
            action={blogPath(locale, { kind: "search" })}
            className="order-last flex w-full items-center gap-2 rounded-full border border-white/10 bg-[#0c0f1a] px-4 py-2 text-[#8f98b6] sm:order-none sm:min-w-[13rem] sm:max-w-xs"
          >
            <Search className="h-4 w-4" />
            <input
              aria-label={`${copy.search.label} (${localeInfo.label})`}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#6b7290]"
              defaultValue={searchValue}
              name="value"
              placeholder={copy.search.placeholder}
            />
          </form>
          <Button asChild variant="gradient">
            <a href={appHref}>
              <Smartphone className="h-4 w-4" />
              {copy.hero.getApp}
            </a>
          </Button>
        </div>
      </header>

      <main className="min-h-screen bg-[#0b0d16] text-white">
        {showHero ? (
          <section className="border-b border-white/10 bg-[#0f1320]">
            <div className="mx-auto max-w-[1320px] px-5 py-12 sm:px-7 sm:py-16">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff96d0]">{copy.nav.blog}</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-bold leading-tight tracking-normal text-white sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#a8b0cc] sm:text-lg">{description}</p>
            </div>
          </section>
        ) : null}
        <section className="mx-auto max-w-[1320px] px-5 py-10 sm:px-7 sm:py-12">
          {breadcrumbs?.length ? (
            <div className="mb-6">
              <BlogBreadcrumbs items={breadcrumbs} />
            </div>
          ) : null}
          {children}
        </section>
      </main>
      {breadcrumbs?.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(breadcrumbJsonLd(breadcrumbs))
          }}
        />
      ) : null}
    </>
  );
}
