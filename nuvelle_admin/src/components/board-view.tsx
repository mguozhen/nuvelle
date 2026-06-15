import { useMemo, useState } from "react";
import { Film, Flame, Layers, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DramaModal } from "@/components/drama-modal";
import { nuvelleScore } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { DramaRecord, VoteVerdict } from "@/types/drama";

type BoardFilter = "top" | "video" | "all";

type BoardViewProps = {
  dramas: DramaRecord[];
  votes: Record<string, VoteVerdict>;
  onGenerate: (drama: DramaRecord, duration: number, prompt?: string, episode?: number, videoUrl?: string) => void;
  onGenerateBatch: (drama: DramaRecord, duration: number) => void;
  onVote: (drama: DramaRecord, verdict: VoteVerdict) => void;
};

export function BoardView({ dramas, votes, onGenerate, onGenerateBatch, onVote }: BoardViewProps) {
  const [filter, setFilter] = useState<BoardFilter>("video");
  const [selectedDrama, setSelectedDrama] = useState<DramaRecord | null>(null);
  const [duration, setDuration] = useState(30);
  const ranked = useMemo(
    () =>
      dramas
        .map((drama) => ({ drama, score: nuvelleScore(drama) }))
        .filter((item) => (filter === "video" ? Boolean(item.drama.video_url || item.drama.episodes) : true))
        .filter((item) => (filter === "top" ? item.score >= 70 : true))
        .sort((a, b) => b.score - a.score),
    [dramas, filter]
  );

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Board</h1>
        <div className="flex rounded-xl border border-white/10 bg-[#0e1119] p-1">
          {[
            ["video", "All videos"],
            ["top", "Top picks"],
            ["all", "All"]
          ].map(([id, label]) => (
            <button
              key={id}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold",
                filter === id ? "bg-[#a14bff22] text-white" : "text-[#9aa2c0]"
              )}
              type="button"
              onClick={() => setFilter(id as BoardFilter)}
            >
              {label}
            </button>
          ))}
        </div>
        <Badge className="border-[#ffc16b33] bg-[#ffc16b18] text-[#ffc16b]">
          Nuvelle Score = signal + taste + video readiness
        </Badge>
        <label className="ml-auto flex items-center gap-2 text-xs text-[#9aa2c0]">
          Duration
          <select
            className="h-9 rounded-lg border border-white/10 bg-[#0e1119] px-2 text-white"
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
          >
            {[8, 13, 20, 30, 45, 60].map((value) => (
              <option key={value} value={value}>
                {value}s
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {ranked.map(({ drama, score }) => {
          const verdict = votes[String(drama.id)];
          const episodeCount = Object.keys(drama.episodes || {}).length || (drama.video_url ? 1 : 0);

          return (
            <article key={drama.id} className="overflow-hidden rounded-[14px] border border-white/10 bg-[#11141f]">
              <button className="relative block w-full text-left" type="button" onClick={() => setSelectedDrama(drama)}>
                <span className="relative block aspect-[2/3] bg-[#171b28]">
                  {drama.cover_image_url ? (
                    <img
                      alt={drama.title || "Drama cover"}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      src={drama.cover_image_url}
                    />
                  ) : null}
                  <span className="absolute left-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-sm font-bold">{score}</span>
                  <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px]">{drama.platform || ""}</span>
                </span>
              </button>
              <div className="p-3">
                <h2 className="line-clamp-2 text-[13.5px] font-semibold leading-tight">{drama.title || "Untitled"}</h2>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#9aa2c0]">
                  {episodeCount ? (
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {episodeCount} eps
                    </span>
                  ) : null}
                  {verdict ? (
                    <span className="inline-flex items-center gap-1 text-[#ff5fbf]">
                      <Flame className="h-3 w-3" />
                      {verdict}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-2">
                  <Button size="sm" variant="gradient" onClick={() => onGenerate(drama, duration)}>
                    <WandSparkles className="h-3.5 w-3.5" />
                    Generate promo
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedDrama(drama)}>
                    <Film className="h-3.5 w-3.5" />
                    Details
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
        {ranked.length ? null : <div className="col-span-full py-12 text-center text-sm text-[#9aa2c0]">No dramas match this filter.</div>}
      </div>
      <DramaModal
        drama={selectedDrama}
        duration={duration}
        onGenerate={onGenerate}
        onGenerateBatch={onGenerateBatch}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDrama(null);
          }
        }}
        onVote={onVote}
      />
    </section>
  );
}
