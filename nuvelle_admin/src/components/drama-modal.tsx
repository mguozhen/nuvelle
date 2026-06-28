import { useEffect, useMemo, useState } from "react";
import { Download, Flame, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { VideoPreview } from "@/components/video-preview";
import { generationLabel } from "@/lib/generation";
import { useI18n } from "@/i18n";
import { nuvelleScore } from "@/lib/scoring";
import type { DramaRecord, GenerationEpisodeRef, GenerationState, VoteVerdict } from "@/types/drama";

type EpisodeOption = {
  id?: number;
  episode: number;
  iframeSrc?: string | null;
  posterUrl?: string | null;
  url?: string | null;
  hasVideo?: boolean;
  generationStatus?: string | null;
  generationProgress?: number;
};

type DramaModalProps = {
  drama: DramaRecord | null;
  duration: number;
  onDownloadEpisode: (drama: DramaRecord, episode: EpisodeOption) => void | Promise<void>;
  onResolveEpisodePlayUrl: (drama: DramaRecord, episode: EpisodeOption) => Promise<string | null>;
  onGenerate: (drama: DramaRecord, duration: number, prompt?: string, episode?: number, videoUrl?: string) => void | Promise<void>;
  onGenerateBatch: (drama: DramaRecord, duration: number) => void | Promise<void>;
  getGenerationState: (drama: DramaRecord, episode?: GenerationEpisodeRef) => GenerationState;
  onOpenChange: (open: boolean) => void;
  onVote: (drama: DramaRecord, verdict: VoteVerdict) => void;
};

export function DramaModal({ drama, duration, onDownloadEpisode, onResolveEpisodePlayUrl, onGenerate, onGenerateBatch, getGenerationState, onOpenChange, onVote }: DramaModalProps) {
  const { formatCompact, formatDate, t } = useI18n();
  const [playRequestKey, setPlayRequestKey] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [selectedEpisodeNo, setSelectedEpisodeNo] = useState<number | null>(null);
  const [signedPlayUrls, setSignedPlayUrls] = useState<Record<number, string>>({});
  const episodes = useMemo<EpisodeOption[]>(() => {
    if (!drama) {
      return [];
    }

    const fromEpisodeList = Array.isArray(drama.episode_list)
      ? drama.episode_list.map((episode) => ({
          id: episode.id,
          episode: episode.episode_no,
          iframeSrc: episode.iframe_src || "",
          url: episode.play_url || "",
          posterUrl: episode.poster_url || "",
          hasVideo: episode.has_video ?? Boolean(episode.play_url || episode.iframe_src),
          generationStatus: episode.generation_status || null,
          generationProgress: episode.generation_progress || 0
        }))
      : [];

    const fromEpisodes = Array.isArray(drama.episodes)
      ? drama.episodes.map((episode) => ({
          id: episode.id,
          episode: episode.episode_no,
          iframeSrc: episode.iframe_src || "",
          url: episode.play_url || "",
          posterUrl: episode.poster_url || "",
          hasVideo: episode.has_video ?? Boolean(episode.play_url || episode.iframe_src),
          generationStatus: episode.generation_status || null,
          generationProgress: episode.generation_progress || 0
        }))
      : Object.entries(drama.episodes || {}).map(([episode, url]) => ({
          episode: Number(episode),
          iframeSrc: "",
          url,
          posterUrl: "",
          hasVideo: Boolean(url)
        }));

    const combined = fromEpisodeList.length ? fromEpisodeList : fromEpisodes;

    if (!combined.length && drama.video_url) {
      return [{ episode: 1, iframeSrc: "", posterUrl: "", url: drama.video_url, hasVideo: true }];
    }

    return combined.sort((a, b) => a.episode - b.episode);
  }, [drama]);
  const selectedEpisode = episodes.find((episode) => episode.episode === selectedEpisodeNo) || episodes[0];
  const selectedEpisodeUrl = selectedEpisode ? signedPlayUrls[selectedEpisode.episode] || selectedEpisode.url || "" : "";
  const selectedGeneration = drama && selectedEpisode
    ? getGenerationState(drama, {
        id: selectedEpisode.id || selectedEpisode.episode,
        episode_no: selectedEpisode.episode,
        generation_status: selectedEpisode.generationStatus,
        generation_progress: selectedEpisode.generationProgress
      })
    : { disabled: false };
  const playableEpisodes = episodes.filter((episode) => episode.url || episode.iframeSrc || (episode.hasVideo && episode.id !== undefined));
  const allPlayableEpisodesGenerated = drama
    ? Boolean(playableEpisodes.length) && playableEpisodes.every((episode) =>
      getGenerationState(drama, {
        id: episode.id || episode.episode,
        episode_no: episode.episode,
        generation_status: episode.generationStatus,
        generation_progress: episode.generationProgress
      }).disabled
    )
    : false;
  const tags = useMemo(() => {
    if (!drama) {
      return [];
    }

    return Array.from(new Set([...(drama.tags || []), ...(drama.show_tags || [])].filter(Boolean)));
  }, [drama]);

  useEffect(() => {
    setSelectedEpisodeNo(null);
    setPlayRequestKey(0);
    setPrompt("");
    setSignedPlayUrls({});
  }, [drama?.id]);

  const playEpisode = (episode: EpisodeOption) => {
    setSelectedEpisodeNo(episode.episode);

    if (episode.url || episode.iframeSrc || signedPlayUrls[episode.episode]) {
      setPlayRequestKey((current) => current + 1);
      return;
    }

    void onResolveEpisodePlayUrl(drama!, episode)
      .then((url) => {
        if (!url) {
          return;
        }
        setSignedPlayUrls((current) => ({ ...current, [episode.episode]: url }));
        setPlayRequestKey((current) => current + 1);
      })
      .catch(() => undefined);
  };
  const generationStatusClass = (status?: string | null) => {
    if (status === "done") {
      return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
    }
    if (status) {
      return "border-[#ff5fbf44] bg-[#ff5fbf18] text-[#ffd5ef]";
    }
    return "border-white/10 bg-white/[0.04] text-[#9aa2c0]";
  };

  return (
    <Dialog open={Boolean(drama)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto lg:flex lg:h-[calc(100vh-1rem)] lg:max-h-[calc(100vh-1rem)] lg:flex-col lg:gap-3 lg:overflow-hidden lg:p-4">
        {drama ? (
          <>
            <DialogHeader className="lg:shrink-0">
              <DialogTitle className="pr-8 text-2xl">{drama.title || t("common.untitled")}</DialogTitle>
              <DialogDescription>
                {[drama.platform, drama.genre, drama.episode_count ? t("swipe.episodes", { count: drama.episode_count }) : ""]
                  .filter(Boolean)
                  .join(" - ")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[240px_minmax(0,1fr)]">
              <VideoPreview
                autoPlay={playRequestKey > 0}
                className="lg:self-start"
                embedUrl={selectedEpisode?.iframeSrc}
                poster={selectedEpisode?.posterUrl || drama.cover_image_url}
                playRequestKey={playRequestKey}
                title={drama.title}
                url={selectedEpisodeUrl || drama.video_url}
              />
              <div className="min-h-0 lg:flex lg:flex-col">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] px-3 py-1 text-sm font-bold">
                    {t("swipe.nuvelleScore", { score: nuvelleScore(drama) })}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => onVote(drama, "fire")}>
                    <Flame className="h-3.5 w-3.5" />
                    {t("detail.markFire")}
                  </Button>
                </div>
                {drama.synopsis_or_hook ? (
                  <p className="mt-3 text-sm leading-6 text-[#9aa2c0] lg:line-clamp-2">{drama.synopsis_or_hook}</p>
                ) : null}
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#0e1119] p-3 text-xs text-[#9aa2c0] md:grid-cols-4">
                  <span>
                    <b className="block text-white">{formatCompact(drama.recent_revenue)}</b>
                    {t("detail.revenue")}
                  </span>
                  <span>
                    <b className="block text-white">{formatCompact(drama.promoters_cnt)}</b>
                    {t("detail.promoters")}
                  </span>
                  <span>
                    <b className="block text-white">{formatDate(drama.platform_publish_at)}</b>
                    {t("detail.published")}
                  </span>
                  <span>
                    <b className="block text-white">{drama.generated_count || 0}</b>
                    {t("detail.generated")}
                  </span>
                  {drama.promotion_code ? (
                    <span className="md:col-span-2">
                      <b className="block text-white">{drama.promotion_code}</b>
                      {t("detail.promotionCode")}
                    </span>
                  ) : null}
                  {drama.app_promotion_link || drama.book_promotion_link ? (
                    <span className="min-w-0 md:col-span-2">
                      <b className="block truncate text-white">{drama.app_promotion_link || drama.book_promotion_link}</b>
                      {t("detail.appPromotionLink")}
                    </span>
                  ) : null}
                </div>
                {tags.length ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-[#0e1119] p-3">
                    <h3 className="mb-2 text-xs font-bold uppercase text-[#6b7290]">{t("detail.sourceTags")}</h3>
                    <div className="flex max-h-20 flex-wrap gap-2 overflow-y-auto overscroll-contain pr-1">
                      {tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-[#a14bff44] bg-[#a14bff18] px-3 py-1.5 text-xs text-white">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 min-h-0 lg:flex lg:flex-1 lg:flex-col">
                  <h3 className="mb-2 shrink-0 text-sm font-semibold">{t("detail.episodes")}</h3>
                  <div className="grid gap-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
                    {episodes.map((episode) => {
                      const generation = getGenerationState(drama, {
                        id: episode.id || episode.episode,
                        episode_no: episode.episode,
                        generation_status: episode.generationStatus,
                        generation_progress: episode.generationProgress
                      });
                      const isPlayable = Boolean(episode.url || episode.iframeSrc || (episode.hasVideo && episode.id !== undefined));

                      return (
                        <div
                          key={episode.episode}
                          aria-disabled={!isPlayable}
                          aria-label={t("detail.playEpisode", { episode: episode.episode })}
                          className={[
                            "grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 rounded-xl border p-3 transition-colors sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-center",
                            isPlayable ? "cursor-pointer hover:border-[#ff5fbf66] hover:bg-[#ff5fbf0d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5fbf66]" : "cursor-not-allowed opacity-60",
                            selectedEpisode?.episode === episode.episode
                              ? "border-[#ff5fbf66] bg-[#ff5fbf12]"
                              : "border-white/10 bg-[#0e1119]"
                          ].join(" ")}
                          role="button"
                          tabIndex={isPlayable ? 0 : -1}
                          onClick={() => {
                            if (isPlayable) {
                              playEpisode(episode);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (!isPlayable || (event.key !== "Enter" && event.key !== " ")) {
                              return;
                            }
                            event.preventDefault();
                            playEpisode(episode);
                          }}
                        >
                          <span className="w-14 text-sm font-bold text-[#ff5fbf]">EP {episode.episode}</span>
                          <div className="min-w-0 space-y-1">
                            <div className="truncate text-xs text-[#9aa2c0]">
                              {isPlayable ? t("detail.playable") : t("detail.noEpisodeVideo")}
                            </div>
                            <span className={[
                              "inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              generationStatusClass(generation.status)
                            ].join(" ")}>
                              {generationLabel(t, generation, t("detail.notGenerated"))}
                            </span>
                          </div>
                          <div className="col-span-2 flex flex-wrap justify-end gap-2 sm:col-span-1">
                            {episode.url || (episode.hasVideo && episode.id !== undefined) ? (
                              <Button
                                aria-label={t("detail.downloadEpisode", { episode: episode.episode })}
                                className="whitespace-nowrap"
                                size="sm"
                                variant="outline"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void onDownloadEpisode(drama, episode);
                                }}
                                onKeyDown={(event) => event.stopPropagation()}
                              >
                                <Download className="h-3.5 w-3.5" />
                                {t("detail.download")}
                              </Button>
                            ) : (
                              <Button
                                aria-label={t("detail.downloadEpisode", { episode: episode.episode })}
                                className="whitespace-nowrap"
                                disabled
                                size="sm"
                                variant="outline"
                              >
                                <Download className="h-3.5 w-3.5" />
                                {t("detail.download")}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {!episodes.length ? <p className="text-sm text-[#9aa2c0]">{t("detail.noEpisodeUrls")}</p> : null}
                  </div>
                </div>
                <Input
                  className="mt-4 lg:shrink-0"
                  placeholder={t("detail.promptPlaceholder")}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                />
                <div className="mt-4 grid gap-2 lg:grid-cols-2 lg:shrink-0">
                  <Button disabled={selectedGeneration.disabled} variant="gradient" onClick={() => onGenerate(drama, duration, prompt, selectedEpisode?.episode)}>
                    <WandSparkles className="h-4 w-4" />
                    {generationLabel(t, selectedGeneration, t("detail.generateCurrent"))}
                  </Button>
                  <Button disabled={allPlayableEpisodesGenerated} variant="outline" onClick={() => onGenerateBatch(drama, duration)}>
                    {t("detail.generateAll")}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
