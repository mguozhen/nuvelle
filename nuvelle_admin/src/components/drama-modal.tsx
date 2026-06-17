import { useEffect, useMemo, useState } from "react";
import { Flame, Play, WandSparkles } from "lucide-react";
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
import { nuvelleScore } from "@/lib/scoring";
import type { DramaRecord, VoteVerdict } from "@/types/drama";

type DramaModalProps = {
  drama: DramaRecord | null;
  duration: number;
  onGenerate: (drama: DramaRecord, duration: number, prompt?: string, episode?: number, videoUrl?: string) => void | Promise<void>;
  onGenerateBatch: (drama: DramaRecord, duration: number) => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  onVote: (drama: DramaRecord, verdict: VoteVerdict) => void;
};

type EpisodeOption = {
  episode: number;
  posterUrl: string;
  url: string;
};

function formatCompact(value?: number | null): string {
  if (value === null || value === undefined) {
    return "-";
  }

  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function DramaModal({ drama, duration, onGenerate, onGenerateBatch, onOpenChange, onVote }: DramaModalProps) {
  const [customUrl, setCustomUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selectedEpisodeNo, setSelectedEpisodeNo] = useState<number | null>(null);
  const episodes = useMemo<EpisodeOption[]>(() => {
    if (!drama) {
      return [];
    }

    const fromEpisodeList = Array.isArray(drama.episode_list)
      ? drama.episode_list.map((episode) => ({
          episode: episode.episode_no,
          url: episode.play_url || "",
          posterUrl: episode.poster_url || ""
        }))
      : [];

    const fromEpisodes = Array.isArray(drama.episodes)
      ? drama.episodes.map((episode) => ({
          episode: episode.episode_no,
          url: episode.play_url || "",
          posterUrl: episode.poster_url || ""
        }))
      : Object.entries(drama.episodes || {}).map(([episode, url]) => ({
          episode: Number(episode),
          url,
          posterUrl: ""
        }));

    const combined = fromEpisodeList.length ? fromEpisodeList : fromEpisodes;

    if (!combined.length && drama.video_url) {
      return [{ episode: 1, posterUrl: "", url: drama.video_url }];
    }

    return combined.sort((a, b) => a.episode - b.episode);
  }, [drama]);
  const selectedEpisode = episodes.find((episode) => episode.episode === selectedEpisodeNo) || episodes[0];
  const tags = useMemo(() => {
    if (!drama) {
      return [];
    }

    return Array.from(new Set([...(drama.tags || []), ...(drama.show_tags || [])].filter(Boolean)));
  }, [drama]);

  useEffect(() => {
    setSelectedEpisodeNo(null);
    setPrompt("");
    setCustomUrl("");
  }, [drama?.id]);

  return (
    <Dialog open={Boolean(drama)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        {drama ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8 text-2xl">{drama.title || "Untitled"}</DialogTitle>
              <DialogDescription>
                {[drama.platform, drama.genre, drama.episode_count ? `${drama.episode_count} episodes` : ""]
                  .filter(Boolean)
                  .join(" - ")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
              <VideoPreview
                poster={selectedEpisode?.posterUrl || drama.cover_image_url}
                title={drama.title}
                url={selectedEpisode?.url || drama.video_url}
              />
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] px-3 py-1 text-sm font-bold">
                    Nuvelle Score {nuvelleScore(drama)}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => onVote(drama, "fire")}>
                    <Flame className="h-3.5 w-3.5" />
                    Mark fire
                  </Button>
                </div>
                {drama.synopsis_or_hook ? <p className="mt-3 text-sm leading-6 text-[#9aa2c0]">{drama.synopsis_or_hook}</p> : null}
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#0e1119] p-3 text-xs text-[#9aa2c0] md:grid-cols-4">
                  <span>
                    <b className="block text-white">{formatCompact(drama.recent_revenue)}</b>
                    Revenue
                  </span>
                  <span>
                    <b className="block text-white">{formatCompact(drama.promoters_cnt)}</b>
                    Promoters
                  </span>
                  <span>
                    <b className="block text-white">{formatDate(drama.platform_publish_at)}</b>
                    Published
                  </span>
                  <span>
                    <b className="block text-white">{drama.generated_count || 0}</b>
                    Generated
                  </span>
                  {drama.promotion_code ? (
                    <span className="md:col-span-2">
                      <b className="block text-white">{drama.promotion_code}</b>
                      Promotion code
                    </span>
                  ) : null}
                  {drama.app_promotion_link || drama.book_promotion_link ? (
                    <span className="min-w-0 md:col-span-2">
                      <b className="block truncate text-white">{drama.app_promotion_link || drama.book_promotion_link}</b>
                      Promotion link
                    </span>
                  ) : null}
                </div>
                {tags.length ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-[#0e1119] p-3">
                    <h3 className="mb-2 text-xs font-bold uppercase text-[#6b7290]">Source tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-[#a14bff44] bg-[#a14bff18] px-3 py-1.5 text-xs text-white">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                <Input
                  className="mt-4"
                  placeholder="Prompt for this promo"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                />
                <div className="mt-4 grid gap-2">
                  <Button variant="gradient" onClick={() => onGenerate(drama, duration, prompt, selectedEpisode?.episode)}>
                    <WandSparkles className="h-4 w-4" />
                    Generate current episode
                  </Button>
                  <Button variant="outline" onClick={() => onGenerateBatch(drama, duration)}>
                    Generate all available episodes
                  </Button>
                </div>
                <div className="mt-5">
                  <h3 className="mb-2 text-sm font-semibold">Episodes</h3>
                  <div className="grid gap-2">
                    {episodes.map((episode) => (
                      <div
                        key={episode.episode}
                        className={[
                          "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                          selectedEpisode?.episode === episode.episode
                            ? "border-[#ff5fbf66] bg-[#ff5fbf12]"
                            : "border-white/10 bg-[#0e1119]"
                        ].join(" ")}
                      >
                        <span className="w-14 text-sm font-bold text-[#ff5fbf]">EP {episode.episode}</span>
                        <span className="min-w-0 flex-1 truncate text-xs text-[#9aa2c0]">{episode.url}</span>
                        <Button
                          aria-label={`Play EP ${episode.episode}`}
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedEpisodeNo(episode.episode)}
                        >
                          <Play className="h-3.5 w-3.5" />
                          Play
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onGenerate(drama, duration, prompt, episode.episode)}>
                          Generate
                        </Button>
                      </div>
                    ))}
                    {!episodes.length ? <p className="text-sm text-[#9aa2c0]">No episode URLs found.</p> : null}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Input
                    placeholder="Paste an episode video URL"
                    value={customUrl}
                    onChange={(event) => setCustomUrl(event.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (customUrl.trim()) {
                        onGenerate(drama, duration, prompt, 1, customUrl.trim());
                      }
                    }}
                  >
                    Generate
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
