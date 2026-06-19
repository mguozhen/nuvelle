import { useMemo, useState } from "react";
import { Film, Flame, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DramaModal } from "@/components/drama-modal";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n";
import { nuvelleScore } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { AdminDramaFilterOptions, DramaRecord, GenerationEpisodeRef, GenerationState, VoteVerdict } from "@/types/drama";

export type BoardFilter = "top" | "video" | "all";

export type BoardFilters = {
  filter: BoardFilter;
  language: string;
  platform: string;
  q: string;
  tag: string;
};

type BoardViewProps = {
  dramas: DramaRecord[];
  filterOptions?: AdminDramaFilterOptions;
  filters: BoardFilters;
  isLoading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  votes: Record<string, VoteVerdict>;
  onGenerate: (drama: DramaRecord, duration: number, prompt?: string, episode?: number, videoUrl?: string) => void | Promise<void>;
  onGenerateBatch: (drama: DramaRecord, duration: number) => void | Promise<void>;
  getGenerationState: (drama: DramaRecord, episode?: GenerationEpisodeRef) => GenerationState;
  onFiltersChange: (filters: Partial<BoardFilters>) => void;
  onLoadDramaDetail?: (drama: DramaRecord) => Promise<DramaRecord>;
  onPageChange: (page: number) => void;
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
const emptyFilterOptions: AdminDramaFilterOptions = {
  platforms: [],
  languages: [],
  tags: []
};

function BoardSkeletonGrid() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, index) => (
        <article
          key={index}
          className="overflow-hidden rounded-[14px] border border-white/10 bg-[#11141f]"
          data-testid="board-skeleton-card"
        >
          <Skeleton className="aspect-[2/3] rounded-none bg-white/[0.07]" />
          <div className="space-y-3 p-3">
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-3" />
              <Skeleton className="h-3" />
              <Skeleton className="col-span-2 h-3" />
            </div>
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        </article>
      ))}
    </>
  );
}

export function BoardView({
  dramas,
  filterOptions = emptyFilterOptions,
  filters,
  isLoading = false,
  page,
  pageSize,
  total,
  votes,
  onGenerate,
  onGenerateBatch,
  getGenerationState,
  onFiltersChange,
  onLoadDramaDetail,
  onPageChange,
  onVote
}: BoardViewProps) {
  const { formatCompact, formatDate, t } = useI18n();
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
      platforms: values([...filterOptions.platforms, filters.platform]),
      languages: values([...filterOptions.languages, filters.language]),
      tags: values([...filterOptions.tags, filters.tag])
    }),
    [filterOptions.languages, filterOptions.platforms, filterOptions.tags, filters.language, filters.platform, filters.tag]
  );
  const ranked = useMemo(
    () =>
      dramas
        .map((drama) => ({ drama, score: nuvelleScore(drama) }))
        .sort((a, b) => b.score - a.score),
    [dramas]
  );
  const pageStart = total > 0 && ranked.length > 0 ? (page - 1) * pageSize + 1 : 0;
  const pageEnd = total > 0 && ranked.length > 0 ? Math.min(total, pageStart + ranked.length - 1) : 0;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  return (
    <section aria-busy={isLoading}>
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
                filters.filter === id ? "bg-[#a14bff22] text-white" : "text-[#9aa2c0]"
              )}
              type="button"
              onClick={() => onFiltersChange({ filter: id as BoardFilter })}
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
        <Input
          placeholder={t("board.searchPlaceholder")}
          value={filters.q}
          onChange={(event) => onFiltersChange({ q: event.target.value })}
        />
        <Select
          aria-label={t("board.allPlatforms")}
          options={[{ value: "", label: t("board.allPlatforms") }, ...options.platforms.map((value) => ({ value, label: optionLabel(value) }))]}
          value={filters.platform}
          onValueChange={(value) => onFiltersChange({ platform: value })}
        />
        <Select
          aria-label={t("board.allLanguages")}
          options={[{ value: "", label: t("board.allLanguages") }, ...options.languages.map((value) => ({ value, label: value }))]}
          value={filters.language}
          onValueChange={(value) => onFiltersChange({ language: value })}
        />
        <Select
          aria-label={t("board.allTags")}
          options={[{ value: "", label: t("board.allTags") }, ...options.tags.map((value) => ({ value, label: value }))]}
          value={filters.tag}
          onValueChange={(value) => onFiltersChange({ tag: value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {isLoading ? <BoardSkeletonGrid /> : null}
        {!isLoading && ranked.map(({ drama, score }) => {
          const verdict = votes[String(drama.id)];
          const count = episodeCount(drama);

          return (
            <article key={drama.id} className="flex h-full flex-col overflow-hidden rounded-[14px] border border-white/10 bg-[#11141f]">
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
              <div className="flex flex-1 flex-col p-3">
                <h2 className="line-clamp-2 h-10 text-[13.5px] font-semibold leading-5">{drama.title || t("common.untitled")}</h2>
                <div className="mt-2 flex h-4 min-w-0 items-center gap-2 overflow-hidden text-[11px] text-[#9aa2c0]">
                  {count ? (
                    <span className="inline-flex min-w-0 items-center gap-1 truncate">
                      <Layers className="h-3 w-3 shrink-0" />
                      <span className="truncate">{t("board.eps", { count })}</span>
                    </span>
                  ) : null}
                  {verdict ? (
                    <span className="inline-flex min-w-0 items-center gap-1 truncate text-[#ff5fbf]">
                      <Flame className="h-3 w-3 shrink-0" />
                      <span className="truncate">{verdict === "fire" ? t("swipe.fire") : verdict === "ok" ? t("swipe.solid") : t("swipe.pass")}</span>
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 grid h-[3.75rem] grid-cols-2 grid-rows-3 gap-x-3 gap-y-1 text-[10.5px] leading-4 text-[#7f88a6]">
                  <span className="min-w-0 truncate">{t("board.revenue", { value: formatCompact(drama.recent_revenue) })}</span>
                  <span className="min-w-0 truncate">{t("board.promoters", { value: formatCompact(drama.promoters_cnt) })}</span>
                  <span className="col-span-2 min-w-0 truncate">{t("board.published", { value: formatDate(drama.platform_publish_at) })}</span>
                  <span className="col-span-2 min-w-0 truncate">{drama.generated_count ? t("board.generated", { count: drama.generated_count }) : ""}</span>
                </div>
                <div className="mt-auto pt-3">
                  <Button className="w-full" size="sm" variant="outline" onClick={() => void openDrama(drama)}>
                    <Film className="h-3.5 w-3.5" />
                    {t("board.details")}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
        {!isLoading && !ranked.length ? <div className="col-span-full py-12 text-center text-sm text-[#9aa2c0]">{t("board.noMatch")}</div> : null}
      </div>
      {!isLoading ? (
        <Pagination
          className="mt-5"
          firstLabel={t("board.pageFirst")}
          lastLabel={t("board.pageLast")}
          nextLabel={t("board.pageNext")}
          page={page}
          pageLabel={t("board.page", { page, totalPages })}
          pageSize={pageSize}
          previousLabel={t("board.pagePrevious")}
          summaryLabel={t("board.paginationSummary", { start: pageStart, end: pageEnd, total })}
          total={total}
          onPageChange={onPageChange}
        />
      ) : null}
      <DramaModal
        drama={selectedDrama}
        duration={duration}
        onGenerate={onGenerate}
        onGenerateBatch={onGenerateBatch}
        getGenerationState={getGenerationState}
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
