"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ListPlus, Play, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BannerItem, Drama } from "@/data/dramas";
import { getDramaBySlug, statForDrama } from "@/data/dramas";
import { cn } from "@/lib/utils";

type HeroCarouselProps = {
  items: BannerItem[];
  onOpen: (drama: Drama) => void;
};

export function HeroCarousel({ items, onOpen }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = useMemo(
    () =>
      items
        .map((item) => {
          const drama = getDramaBySlug(item.slug);
          return drama ? { ...item, drama, stats: statForDrama(item.slug) } : null;
        })
        .filter(Boolean) as Array<BannerItem & { drama: Drama; stats: { views: string; rating: string } }>,
    [items]
  );

  useEffect(() => {
    if (slides.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  function go(offset: number) {
    setActiveIndex((index) => (index + offset + slides.length) % slides.length);
  }

  if (!slides.length) {
    return null;
  }

  return (
    <section className="relative min-h-[33rem] overflow-hidden border-b border-white/10 bg-[#06070d] sm:min-h-[38rem]">
      {slides.map(({ badge, drama, stats }, index) => {
        const active = index === activeIndex;

        return (
          <div
            key={drama.slug}
            className={cn(
              "absolute inset-0 opacity-0 transition-opacity duration-700",
              active ? "pointer-events-auto opacity-100" : "pointer-events-none"
            )}
            aria-hidden={!active}
          >
            <img
              className="absolute inset-0 h-full w-full scale-105 object-cover object-center brightness-[0.58]"
              src={`/posters/${drama.slug}.png`}
              alt=""
            />
            <div className="absolute inset-0 bg-[linear-gradient(96deg,rgba(9,11,20,0.96)_0%,rgba(9,11,20,0.78)_34%,rgba(9,11,20,0.35)_58%,rgba(9,11,20,0.08)_82%),linear-gradient(0deg,#090b14_4%,rgba(9,11,20,0)_45%)]" />

            <button
              type="button"
              tabIndex={active ? 0 : -1}
              className="absolute right-[7%] top-1/2 hidden w-56 -translate-y-1/2 overflow-hidden rounded-lg border border-white/15 shadow-2xl shadow-black/50 outline-none transition-transform duration-300 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-white/70 lg:block"
              onClick={() => onOpen(drama)}
            >
              <img className="aspect-[2/3] w-full object-cover" src={`/posters/${drama.slug}.png`} alt={drama.title} />
            </button>

            <div className="relative z-10 mx-auto flex min-h-[33rem] max-w-[1320px] flex-col justify-center px-5 py-20 sm:min-h-[38rem] sm:px-7">
              <div className="max-w-2xl">
                <Badge className="mb-5 border-white/20 bg-[#a14bff33] px-4 py-1.5 text-[0.72rem] uppercase tracking-[0.12em] text-white backdrop-blur">
                  {badge}
                </Badge>
                <button
                  type="button"
                  tabIndex={active ? 0 : -1}
                  className="block text-left text-4xl font-bold leading-[1.04] tracking-normal text-white outline-none drop-shadow-2xl focus-visible:ring-2 focus-visible:ring-white/70 sm:text-6xl"
                  onClick={() => onOpen(drama)}
                >
                  {drama.title}
                </button>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-[#dce0ef]">{drama.synopsis}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-white/90">
                  <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1">{drama.genre}</span>
                  <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1">{drama.episodes}</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/18 bg-white/10 px-3 py-1">
                    <Star className="h-3.5 w-3.5 fill-[#ffcf5c] text-[#ffcf5c]" />
                    {stats.rating}
                  </span>
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    size="lg"
                    variant="gradient"
                    tabIndex={active ? 0 : -1}
                    onClick={() => onOpen(drama)}
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Watch Now
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="ghost"
                    tabIndex={active ? 0 : -1}
                    onClick={() => onOpen(drama)}
                  >
                    <ListPlus className="h-4 w-4" />
                    My List
                  </Button>
                </div>
                <div className="mt-7 flex flex-wrap gap-7 text-xs text-[#a8b0cc]">
                  <span>
                    <b className="block text-xl text-white">{stats.views}</b> views
                  </span>
                  <span>
                    <b className="block text-xl text-white">{stats.rating}</b> rating
                  </span>
                  <span>
                    <b className="block text-xl text-white">{drama.episodes}</b> streaming
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        aria-label="Previous banner"
        className="absolute left-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/16 bg-black/35 text-white opacity-75 backdrop-blur transition hover:bg-white/12 hover:opacity-100 sm:flex"
        onClick={() => go(-1)}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Next banner"
        className="absolute right-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/16 bg-black/35 text-white opacity-75 backdrop-blur transition hover:bg-white/12 hover:opacity-100 sm:flex"
        onClick={() => go(1)}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {slides.map(({ drama }, index) => (
          <button
            key={drama.slug}
            type="button"
            aria-label={`Show ${drama.title}`}
            className={cn(
              "h-2 rounded-full transition-all",
              index === activeIndex ? "w-7 bg-[linear-gradient(135deg,#b25cff,#ff5fbf)]" : "w-2 bg-white/35"
            )}
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>
    </section>
  );
}
