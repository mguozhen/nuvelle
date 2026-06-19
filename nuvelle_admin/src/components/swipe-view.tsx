import { useRef, useState } from "react";
import { Flame, ThumbsDown, ThumbsUp, Triangle, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPreview } from "@/components/video-preview";
import { generationLabel } from "@/lib/generation";
import { useI18n } from "@/i18n";
import { nuvelleScore, tasteScore } from "@/lib/scoring";
import type { DramaEpisodeRecord, DramaRecord, GenerationEpisodeRef, GenerationState, VoteVerdict } from "@/types/drama";

type SwipeViewProps = {
  current: DramaRecord | null;
  isLoading?: boolean;
  onGenerate: (drama: DramaRecord, duration: number) => void | Promise<void>;
  getGenerationState: (drama: DramaRecord, episode?: GenerationEpisodeRef) => GenerationState;
  onSeen: (drama: DramaRecord) => void | Promise<void>;
  onVote: (drama: DramaRecord, verdict: VoteVerdict) => void;
};

const durationOptions = [8, 13, 20, 30, 45, 60].map((value) => ({
  value: String(value),
  label: `${value}s`
}));

function toEpisodeList(drama: DramaRecord): DramaEpisodeRecord[] {
  if (Array.isArray(drama.episode_list)) {
    return drama.episode_list;
  }

  if (Array.isArray(drama.episodes)) {
    return drama.episodes;
  }

  if (drama.episodes && typeof drama.episodes === "object") {
    return Object.entries(drama.episodes).map(([episode, url]) => ({
      id: Number(episode),
      episode_no: Number(episode),
      play_url: url
    }));
  }

  if (drama.video_url) {
    return [{ id: Number(drama.id) || 1, episode_no: 1, play_url: drama.video_url }];
  }

  return [];
}

function firstPlayableEpisode(drama: DramaRecord): DramaEpisodeRecord | null {
  const episodes = toEpisodeList(drama)
    .filter((episode) => Boolean(episode.play_url || episode.iframe_src))
    .sort((a, b) => a.episode_no - b.episode_no);

  return episodes[0] || null;
}

function SwipeSkeleton() {
  return (
    <section
      aria-busy="true"
      className="mx-auto h-[calc(100vh-132px)] min-h-[620px] max-w-[460px] overflow-hidden rounded-[24px] border border-white/10 bg-black shadow-2xl shadow-black/40"
      data-testid="swipe-skeleton"
    >
      <div className="relative h-full">
        <Skeleton className="h-full rounded-none bg-white/[0.07]" />
        <div className="absolute inset-x-0 bottom-0 space-y-4 bg-gradient-to-t from-black via-black/55 to-transparent p-5 pt-24">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <Skeleton className="h-7 w-4/5" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        </div>
        <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-3" data-testid="swipe-actions">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-11 rounded-full bg-white/12" />
          ))}
        </div>
        <div className="absolute left-4 right-4 top-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="ml-auto h-8 w-24" />
        </div>
      </div>
    </section>
  );
}

export function SwipeView({ current, isLoading = false, onGenerate, getGenerationState, onSeen, onVote }: SwipeViewProps) {
  const { t } = useI18n();
  const [duration, setDuration] = useState(30);
  const touchStartY = useRef<number | null>(null);

  if (isLoading) {
    return <SwipeSkeleton />;
  }

  if (!current) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d0f17] p-10 text-center text-[#9aa2c0]">
        <b className="block text-lg text-white">{t("swipe.allCaughtUp")}</b>
        {t("swipe.currentQueueRated")}
      </div>
    );
  }

  const score = nuvelleScore(current);
  const taste = tasteScore(current);
  const firstEpisode = firstPlayableEpisode(current);
  const videoUrl = firstEpisode?.play_url || current.video_url || null;
  const embedUrl = firstEpisode?.iframe_src || null;
  const posterUrl = firstEpisode?.poster_url || current.cover_image_url || null;
  const generation = getGenerationState(current, firstEpisode || undefined);
  const markSeen = () => {
    void onSeen(current);
  };

  return (
    <section
      className="mx-auto flex h-[calc(100vh-132px)] min-h-[620px] max-w-[460px] snap-y snap-mandatory overflow-hidden rounded-[24px] border border-white/10 bg-black shadow-2xl shadow-black/40"
      data-testid="swipe-feed"
      onTouchEnd={(event) => {
        if (touchStartY.current === null) {
          return;
        }

        const delta = touchStartY.current - event.changedTouches[0].clientY;
        touchStartY.current = null;
        if (delta > 80) {
          markSeen();
        }
      }}
      onTouchStart={(event) => {
        touchStartY.current = event.touches[0].clientY;
      }}
      onWheel={(event) => {
        if (event.deltaY > 120) {
          markSeen();
        }
      }}
    >
      <article className="relative h-full w-full snap-start">
        <VideoPreview
          ariaLabel={current.title ? `${current.title} video` : t("common.dramaVideo")}
          autoPlay
          className="h-full rounded-none border-0"
          controls={false}
          embedUrl={embedUrl}
          poster={posterUrl}
          title={current.title}
          url={videoUrl}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/55 to-transparent p-5 pt-24">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{current.platform || t("common.unknown")}</Badge>
            <Badge className="border-[#ff5fbf55] bg-black/35 text-[#ff5fbf]">{t("swipe.nuvelleScore", { score })}</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-semibold leading-tight drop-shadow">{current.title || t("common.untitled")}</h1>
          <p className="mt-2 text-sm text-white/72">
            {[current.genre, current.episode_count ? t("swipe.episodes", { count: current.episode_count }) : ""].filter(Boolean).join(" - ")}
          </p>
          {current.synopsis_or_hook ? (
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/72">{current.synopsis_or_hook}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {taste.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-white/16 bg-white/10 px-3 py-1.5 text-xs text-white">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-3" data-testid="swipe-actions">
          <Button
            aria-label={t("swipe.fire")}
            className="h-11 w-11 rounded-full bg-black/45 text-[#ff8f4d]"
            size="icon"
            variant="ghost"
            onClick={() => onVote(current, "fire")}
          >
            <Flame className="h-5 w-5 fill-current stroke-[2.25]" />
          </Button>
          <Button
            aria-label={t("swipe.solid")}
            className="h-11 w-11 rounded-full bg-black/45 text-[#5fd39a]"
            size="icon"
            variant="ghost"
            onClick={() => onVote(current, "ok")}
          >
            <ThumbsUp className="h-5 w-5 fill-current stroke-[2.25]" />
          </Button>
          <Button
            aria-label={t("swipe.pass")}
            className="h-11 w-11 rounded-full bg-black/45 text-[#ff7a7a]"
            size="icon"
            variant="ghost"
            onClick={() => onVote(current, "pass")}
          >
            <ThumbsDown className="h-5 w-5 fill-current stroke-[2.25]" />
          </Button>
          <Button aria-label={t("swipe.nextVideo")} className="h-11 w-11 rounded-full bg-black/45" size="icon" variant="ghost" onClick={markSeen}>
            <Triangle className="h-4 w-4 rotate-180 fill-current stroke-[2.25]" />
          </Button>
        </div>
        <div className="absolute left-4 right-4 top-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur">
          <span className="text-xs text-white/70">{t("swipe.duration")}</span>
          <Select
            aria-label={t("swipe.duration")}
            className="h-9 w-28 bg-black/45"
            options={durationOptions}
            value={String(duration)}
            onValueChange={(value) => setDuration(Number(value))}
          />
          <Button className="ml-auto" disabled={generation.disabled} size="sm" variant="gradient" onClick={() => onGenerate(current, duration)}>
            <WandSparkles className="h-4 w-4" />
            {generationLabel(t, generation, t("common.promo"))}
          </Button>
        </div>
      </article>
    </section>
  );
}
