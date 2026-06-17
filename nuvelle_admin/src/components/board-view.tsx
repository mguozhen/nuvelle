import { useMemo, useState } from "react";
import { Film, Flame, Layers, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DramaModal } from "@/components/drama-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { nuvelleScore } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { DramaRecord, VoteVerdict } from "@/types/drama";

type BoardFilter = "top" | "video" | "all";

type BoardViewProps = {
  dramas: DramaRecord[];
  votes: Record<string, VoteVerdict>;
  onGenerate: (drama: DramaRecord, duration: number, prompt?: string, episode?: number, videoUrl?: string) => void | Promise<void>;
  onGenerateBatch: (drama: DramaRecord, duration: number) => void | Promise<void>;
  onLoadDramaDetail?: (drama: DramaRecord) => Promise<DramaRecord>;
  onVote: (drama: DramaRecord, verdict: VoteVerdict) => void;
};

function values(items: Array<string | null | undefined>): string[] {
  return Array.from(new Set(items.filter((item): item is string => Boolean(item)))).sort((a, b) => a.localeCompare(b));
}

function episodeCount(drama: DramaRecord): number {
  if (Array.isArray(drama.episode_list)) {
    return drama.episode_list.length;
  }

  if (Array.isArray(drama.episodes)) {
    return drama.episodes.length;
  }

  if (drama.episodes) {
    return Object.keys(drama.episodes).length;
  }

  if (Number(drama.episode_count) > 0) {
    return Number(drama.episode_count);
  }

  return drama.video_url ? 1 : 0;
}

function optionLabel(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}

const durationOptions = [8, 13, 20, 30, 45, 60].map((value) => ({
  value: String(value),
  label: `${value}s`
}));

export function BoardView({ dramas, votes, onGenerate, onGenerateBatch, onLoadDramaDetail, onVote }: BoardViewProps) {
  const { formatCompact, formatDate, t } = useI18n();
  const [filter, setFilter] = useState<BoardFilter>("video");
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("");
  const [language, setLanguage] = useState("");
  const [tag, setTag] = useState("");
  const [selectedDrama, setSelectedDrama] = useState<DramaRecord | null>(null);
  const [duration, setDuration] = useState(30);
  const openDrama = async (drama: DramaRecord) => {
    setSelectedDrama(drama);
    if (!onLoadDramaDetail) {
      return;
    }

    try {
      setSelectedDrama(await onLoadDramaDetail(drama));
    } catch {
      setSelectedDrama(drama);
    }
  };
  const options = useMemo(
    () => ({
      platforms: values(dramas.map((drama) => drama.platform)),
      languages: values(dramas.map((drama) => drama.language)),
      tags: values(dramas.flatMap((drama) => [...(drama.tags || []), ...(drama.show_tags || [])]))
    }),
    [dramas]
  );
  const ranked = useMemo(
    () => {
      const needle = query.trim().toLowerCase();

      return dramas
        .map((drama) => ({ drama, score: nuvelleScore(drama) }))
        .filter((item) => (filter === "video" ? Boolean(item.drama.has_video || item.drama.video_url || episodeCount(item.drama)) : true))
        .filter((item) => (filter === "top" ? item.score >= 70 : true))
        .filter((item) => (platform ? item.drama.platform === platform : true))
        .filter((item) => (language ? item.drama.language === language : true))
        .filter((item) => (tag ? [...(item.drama.tags || []), ...(item.drama.show_tags || [])].includes(tag) : true))
        .filter((item) =>
          needle
            ? [item.drama.title, item.drama.synopsis_or_hook, item.drama.platform]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(needle))
            : true
        )
        .sort((a, b) => b.score - a.score);
    },
    [dramas, filter, language, platform, query, tag]
  );

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{t("board.title")}</h1>
        <div className="flex rounded-xl border border-white/10 bg-[#0e1119] p-1">
          {[
            ["video", t("board.allVideos")],
            ["top", t("board.topPicks")],
            ["all", t("board.all")]
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
          {t("board.scoreFormula")}
        </Badge>
        <div className="ml-auto flex items-center gap-2 text-xs text-[#9aa2c0]">
          <span>{t("board.duration")}</span>
          <Select
            aria-label={t("board.duration")}
            className="h-9 w-28 px-3"
            options={durationOptions}
            value={String(duration)}
            onValueChange={(value) => setDuration(Number(value))}
          />
        </div>
      </div>
      <div className="mb-5 grid gap-2 md:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(140px,1fr))]">
        <Input placeholder={t("board.searchPlaceholder")} value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select
          aria-label={t("board.allPlatforms")}
          options={[{ value: "", label: t("board.allPlatforms") }, ...options.platforms.map((value) => ({ value, label: optionLabel(value) }))]}
          value={platform}
          onValueChange={setPlatform}
        />
        <Select
          aria-label={t("board.allLanguages")}
          options={[{ value: "", label: t("board.allLanguages") }, ...options.languages.map((value) => ({ value, label: value }))]}
          value={language}
          onValueChange={setLanguage}
        />
        <Select
          aria-label={t("board.allTags")}
          options={[{ value: "", label: t("board.allTags") }, ...options.tags.map((value) => ({ value, label: value }))]}
          value={tag}
          onValueChange={setTag}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {ranked.map(({ drama, score }) => {
          const verdict = votes[String(drama.id)];
          const count = episodeCount(drama);

          return (
            <article key={drama.id} className="overflow-hidden rounded-[14px] border border-white/10 bg-[#11141f]">
              <button className="relative block w-full text-left" type="button" onClick={() => void openDrama(drama)}>
                <span className="relative block aspect-[2/3] bg-[#171b28]">
                  {drama.cover_image_url ? (
                    <img
                      alt={drama.title || t("common.dramaCover")}
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
                <h2 className="line-clamp-2 text-[13.5px] font-semibold leading-tight">{drama.title || t("common.untitled")}</h2>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#9aa2c0]">
                  {count ? (
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {t("board.eps", { count })}
                    </span>
                  ) : null}
                  {verdict ? (
                    <span className="inline-flex items-center gap-1 text-[#ff5fbf]">
                      <Flame className="h-3 w-3" />
                      {verdict === "fire" ? t("swipe.fire") : verdict === "ok" ? t("swipe.solid") : t("swipe.pass")}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[10.5px] text-[#7f88a6]">
                  <span>{t("board.revenue", { value: formatCompact(drama.recent_revenue) })}</span>
                  <span>{t("board.promoters", { value: formatCompact(drama.promoters_cnt) })}</span>
                  <span className="col-span-2">{t("board.published", { value: formatDate(drama.platform_publish_at) })}</span>
                  {drama.generated_count ? <span className="col-span-2">{t("board.generated", { count: drama.generated_count })}</span> : null}
                </div>
                <div className="mt-3 grid gap-2">
                  <Button size="sm" variant="gradient" onClick={() => onGenerate(drama, duration)}>
                    <WandSparkles className="h-3.5 w-3.5" />
                    {t("board.generatePromo")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void openDrama(drama)}>
                    <Film className="h-3.5 w-3.5" />
                    {t("board.details")}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
        {ranked.length ? null : <div className="col-span-full py-12 text-center text-sm text-[#9aa2c0]">{t("board.noMatch")}</div>}
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
