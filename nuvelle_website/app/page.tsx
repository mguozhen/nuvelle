"use client";

import { useMemo, useState } from "react";
import { Search, Smartphone, X } from "lucide-react";
import { AppBand } from "@/components/app-band";
import { BrandMark } from "@/components/brand-mark";
import { DramaCard } from "@/components/drama-card";
import { DramaModal } from "@/components/drama-modal";
import { HeroCarousel } from "@/components/hero-carousel";
import { Button } from "@/components/ui/button";
import {
  bannerItems,
  getDramaBySlug,
  rows,
  searchDramas,
  top10,
  type Drama
} from "@/data/dramas";

const footerLinks = {
  Explore: ["New Releases", "Categories", "Trending", "For Creators"],
  Company: ["About Nuvelle", "Careers", "Press", "Contact"],
  Legal: ["Terms of Service", "Privacy Policy", "Content Policy", "Support"]
};

const searchDisplayAliases: Record<string, string> = {
  mafia_wife: "Mafia Wife"
};

function scrollToApp() {
  document.getElementById("app")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function WebsiteHome() {
  const [query, setQuery] = useState("");
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null);
  const searchResults = useMemo(() => searchDramas(query), [query]);

  function openDrama(drama: Drama) {
    setSelectedDrama(drama);
  }

  function appAndClose() {
    setSelectedDrama(null);
    window.requestAnimationFrame(scrollToApp);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0d16]/80 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1320px] flex-wrap items-center gap-4 px-5 py-3 sm:flex-nowrap sm:px-7 sm:py-0">
          <a href="#" aria-label="Nuvelle home">
            <BrandMark />
          </a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-[#a8b0cc] md:flex">
            <a className="transition-colors hover:text-white" href="#new">
              Home
            </a>
            <a className="transition-colors hover:text-white" href="#categories">
              Categories
            </a>
            <a className="transition-colors hover:text-white" href="#app">
              Fandom
            </a>
            <a className="transition-colors hover:text-white" href="#app">
              Creators
            </a>
          </nav>
          <div className="flex-1" />
          <label className="order-last flex w-full items-center gap-2 rounded-full border border-white/10 bg-[#0c0f1a] px-4 py-2 text-[#8f98b6] sm:order-none sm:min-w-[13rem] sm:max-w-xs">
            <Search className="h-4 w-4" />
            <input
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#6b7290]"
              placeholder="Search dramas"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <Button type="button" variant="gradient" onClick={scrollToApp}>
            <Smartphone className="h-4 w-4" />
            Get the App
          </Button>
        </div>
      </header>

      <main className="min-h-screen bg-[#0b0d16] text-white">
        <HeroCarousel items={bannerItems} onOpen={openDrama} />

        <section className="mx-auto max-w-[1320px] px-5 py-12 sm:px-7">
          {query.trim() ? (
            <section className="mb-11" aria-label="Search results">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-end gap-3">
                  <h2 className="text-2xl font-semibold tracking-normal text-white">Results</h2>
                  <span className="pb-0.5 text-sm text-[#8f98b6]">{searchResults.length}</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setQuery("")}>
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              </div>
              {searchResults.length ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {searchResults.map((drama) => (
                    <DramaCard
                      key={drama.slug}
                      drama={drama}
                      onOpen={openDrama}
                      searchAlias={searchDisplayAliases[drama.slug]}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-white/10 bg-white/5 px-4 py-5 text-sm text-[#a8b0cc]">
                  No dramas match “{query}”.
                </p>
              )}
            </section>
          ) : null}

          <CatalogRow id="new" title="New Releases" slugs={rows["New Releases"]} onOpen={openDrama} />

          <section className="mb-11">
            <RowHeader title="Top 10 This Week" />
            <div className="flex snap-x gap-5 overflow-x-auto pb-3 [scrollbar-color:#2a3050_transparent]">
              {top10.map((slug, index) => {
                const drama = getDramaBySlug(slug);
                return drama ? <DramaCard key={slug} drama={drama} rank={index + 1} onOpen={openDrama} /> : null;
              })}
            </div>
          </section>

          <div id="categories">
            {Object.entries(rows)
              .filter(([title]) => title !== "New Releases" && title !== "Second Chance")
              .map(([title, slugs]) => (
                <CatalogRow key={title} title={title} slugs={slugs} onOpen={openDrama} />
              ))}
          </div>

          <AppBand />

          <CatalogRow title="Second Chance" slugs={rows["Second Chance"]} onOpen={openDrama} />
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#0f1320] text-[#a8b0cc]">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-10 sm:px-7 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <BrandMark compact />
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              The home of AI shorts. Premium vertical dramas, reimagined daily. Every story, reimagined.
            </p>
          </div>
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7290]">{heading}</h3>
              <ul className="mt-4 space-y-2 text-sm">
                {links.map((link) => (
                  <li key={link}>
                    <a className="transition-colors hover:text-white" href="#">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 px-5 py-4 text-xs text-[#6b7290] sm:px-7">
          <div className="mx-auto flex max-w-[1320px] flex-wrap justify-between gap-3">
            <span>© 2026 Nuvelle, Inc. · nuvelle.ai</span>
            <span>Every story, reimagined.</span>
          </div>
        </div>
      </footer>

      <DramaModal drama={selectedDrama} onClose={() => setSelectedDrama(null)} onGetApp={appAndClose} />
    </>
  );
}

function RowHeader({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-2xl font-semibold tracking-normal text-white">{title}</h2>
      <a className="text-sm font-medium text-[#8f98b6] transition-colors hover:text-white" href="#">
        View all
      </a>
    </div>
  );
}

function CatalogRow({
  id,
  title,
  slugs,
  onOpen
}: {
  id?: string;
  title: string;
  slugs: string[];
  onOpen: (drama: Drama) => void;
}) {
  return (
    <section id={id} className="mb-11">
      <RowHeader title={title} />
      <div className="flex snap-x gap-4 overflow-x-auto pb-3 [scrollbar-color:#2a3050_transparent]">
        {slugs.map((slug) => {
          const drama = getDramaBySlug(slug);
          return drama ? <DramaCard key={slug} drama={drama} onOpen={onOpen} /> : null;
        })}
      </div>
    </section>
  );
}
