import { useState } from "react";
import { Flame, ThumbsDown, ThumbsUp, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { VideoPreview } from "@/components/video-preview";
import { nuvelleScore, tasteScore } from "@/lib/scoring";
import type { DramaRecord, VoteVerdict } from "@/types/drama";

type SwipeViewProps = {
  current: DramaRecord | null;
  onGenerate: (drama: DramaRecord, duration: number) => void | Promise<void>;
  onVote: (drama: DramaRecord, verdict: VoteVerdict) => void;
};

export function SwipeView({ current, onGenerate, onVote }: SwipeViewProps) {
  const [duration, setDuration] = useState(30);

  if (!current) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d0f17] p-10 text-center text-[#9aa2c0]">
        <b className="block text-lg text-white">All caught up</b>
        Every drama in the current queue is rated.
      </div>
    );
  }

  const score = nuvelleScore(current);
  const taste = tasteScore(current);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="lg:sticky lg:top-[130px]">
        <VideoPreview poster={current.cover_image_url} title={current.title} url={current.video_url} />
      </div>
      <section className="rounded-2xl border border-white/10 bg-[#0d0f17] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{current.platform || "Unknown"}</Badge>
          <Badge className="border-[#ff5fbf55] text-[#ff5fbf]">Nuvelle Score {score}</Badge>
        </div>
        <h1 className="mt-3 text-2xl font-semibold leading-tight">{current.title || "Untitled"}</h1>
        <p className="mt-2 text-sm text-[#9aa2c0]">
          {[current.genre, current.episode_count ? `${current.episode_count} episodes` : ""].filter(Boolean).join(" - ")}
        </p>
        {current.synopsis_or_hook ? (
          <p className="mt-3 line-clamp-5 text-sm leading-6 text-[#9aa2c0]">{current.synopsis_or_hook}</p>
        ) : null}
        <div className="mt-5">
          <div className="mb-2 text-xs font-bold uppercase text-[#6b7290]">Taste tags</div>
          <div className="flex flex-wrap gap-2">
            {taste.tags.length ? (
              taste.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-[#a14bff66] bg-[#a14bff22] px-3 py-1.5 text-xs text-white">
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-sm text-[#6b7290]">No tags detected</span>
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Button className="h-12 rounded-[13px] text-[#ff7a7a]" variant="outline" onClick={() => onVote(current, "pass")}>
            <ThumbsDown className="h-4 w-4" />
            Pass
          </Button>
          <Button className="h-12 rounded-[13px] text-[#5fd39a]" variant="outline" onClick={() => onVote(current, "ok")}>
            <ThumbsUp className="h-4 w-4" />
            Solid
          </Button>
          <Button className="h-12 rounded-[13px] text-[#ff8f4d]" variant="outline" onClick={() => onVote(current, "fire")}>
            <Flame className="h-4 w-4" />
            Fire
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-[#0c0f1a] p-3">
          <span className="text-xs text-[#9aa2c0]">Duration</span>
          <Select className="max-w-28" value={String(duration)} onChange={(event) => setDuration(Number(event.target.value))}>
            {[8, 13, 20, 30, 45, 60].map((value) => (
              <option key={value} value={value}>
                {value}s
              </option>
            ))}
          </Select>
          <Button className="ml-auto" variant="gradient" onClick={() => onGenerate(current, duration)}>
            <WandSparkles className="h-4 w-4" />
            One-click promo
          </Button>
        </div>
      </section>
    </div>
  );
}
