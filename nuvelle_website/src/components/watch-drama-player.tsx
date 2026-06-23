"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Play } from "lucide-react";
import type { PublicDramaDetail, PublicDramaEpisode } from "@/lib/dramas/api";
import { homePathForLocale, type LocaleKey } from "@/lib/i18n";

type WatchDramaPlayerProps = {
  drama: PublicDramaDetail;
  locale: LocaleKey;
};

export function WatchDramaPlayer({ drama, locale }: WatchDramaPlayerProps) {
  const playableEpisodes = useMemo(
    () => drama.episodes.filter((episode) => Boolean(episode.play_url)),
    [drama.episodes]
  );
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(playableEpisodes[0]?.id ?? null);
  const selectedEpisode =
    playableEpisodes.find((episode) => episode.id === selectedEpisodeId) ?? playableEpisodes[0] ?? null;
  const homeHref = homePathForLocale(locale);

  return (
    <main className="min-h-screen bg-[#080a12] text-white">
      <div className="mx-auto grid min-h-screen max-w-[1320px] gap-8 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_22rem] lg:py-8">
        <section className="min-w-0">
          <a
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#9aa2c0] transition-colors hover:text-white"
            href={homeHref}
          >
            <ArrowLeft className="h-4 w-4" />
            Nuvelle
          </a>

          <div className="overflow-hidden bg-black">
            {selectedEpisode?.play_url ? (
              <video
                key={selectedEpisode.id}
                aria-label={`${drama.title} episode ${selectedEpisode.episode_no}`}
                className="aspect-video max-h-[78vh] w-full bg-black object-contain"
                controls
                playsInline
                preload="metadata"
                poster={selectedEpisode.poster_url || drama.cover_image_url || undefined}
                src={selectedEpisode.play_url}
              />
            ) : (
              <div className="grid aspect-video place-items-center bg-[#101421] text-sm text-[#9aa2c0]">
                Video unavailable
              </div>
            )}
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7f89ad]">
              {drama.platform || "Nuvelle"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white md:text-4xl">{drama.title}</h1>
            {drama.synopsis_or_hook ? (
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#b3bad2]">{drama.synopsis_or_hook}</p>
            ) : null}
          </div>
        </section>

        <aside className="min-w-0 border-t border-white/10 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-11">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold tracking-normal text-white">Episodes</h2>
            <span className="text-sm text-[#7f89ad]">{playableEpisodes.length}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-3">
            {playableEpisodes.map((episode) => (
              <EpisodeButton
                key={episode.id}
                episode={episode}
                selected={selectedEpisode?.id === episode.id}
                onSelect={() => setSelectedEpisodeId(episode.id)}
              />
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}

function EpisodeButton({
  episode,
  selected,
  onSelect
}: {
  episode: PublicDramaEpisode;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={[
        "inline-flex h-11 items-center justify-center gap-1.5 rounded-md border text-sm font-semibold transition-colors",
        selected
          ? "border-[#ff5fbf] bg-[#ff5fbf] text-white"
          : "border-white/10 bg-white/5 text-[#b3bad2] hover:border-white/25 hover:bg-white/10 hover:text-white"
      ].join(" ")}
      type="button"
      onClick={onSelect}
    >
      {selected ? <Play className="h-3.5 w-3.5 fill-current" /> : null}
      EP {episode.episode_no}
    </button>
  );
}
