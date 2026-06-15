import { useMemo, useState } from "react";
import { Flame, WandSparkles } from "lucide-react";
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
  onGenerate: (drama: DramaRecord, duration: number, prompt?: string, episode?: number, videoUrl?: string) => void;
  onGenerateBatch: (drama: DramaRecord, duration: number) => void;
  onOpenChange: (open: boolean) => void;
  onVote: (drama: DramaRecord, verdict: VoteVerdict) => void;
};

export function DramaModal({ drama, duration, onGenerate, onGenerateBatch, onOpenChange, onVote }: DramaModalProps) {
  const [customUrl, setCustomUrl] = useState("");
  const episodes = useMemo(() => {
    if (!drama) {
      return [];
    }

    const fromEpisodes = Object.entries(drama.episodes || {}).map(([episode, url]) => ({
      episode: Number(episode),
      url
    }));

    if (!fromEpisodes.length && drama.video_url) {
      return [{ episode: 1, url: drama.video_url }];
    }

    return fromEpisodes.sort((a, b) => a.episode - b.episode);
  }, [drama]);

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
              <VideoPreview poster={drama.cover_image_url} title={drama.title} url={drama.video_url || episodes[0]?.url} />
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
                <div className="mt-4 grid gap-2">
                  <Button variant="gradient" onClick={() => onGenerate(drama, duration)}>
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
                      <div key={episode.episode} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0e1119] p-3">
                        <span className="w-14 text-sm font-bold text-[#ff5fbf]">EP {episode.episode}</span>
                        <span className="min-w-0 flex-1 truncate text-xs text-[#9aa2c0]">{episode.url}</span>
                        <Button size="sm" variant="outline" onClick={() => onGenerate(drama, duration, "", episode.episode, episode.url)}>
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
                        onGenerate(drama, duration, "", 1, customUrl.trim());
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
