import { BookmarkCheck, BookmarkPlus, Play, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { posterPath, type Drama } from "@/data/dramas";
import { cn } from "@/lib/utils";

type DramaActionProps = {
  onSelectDrama: (drama: Drama) => void;
};

type HomeViewProps = DramaActionProps & {
  hero: Drama;
  rows: Array<{ title: string; dramas: Drama[] }>;
  savedSlugs: string[];
  top10: Drama[];
  onToggleSaved: (slug: string) => void;
};

export function DramaTile({
  drama,
  layout = "row",
  onSelectDrama
}: DramaActionProps & { drama: Drama; layout?: "row" | "grid" }) {
  return (
    <button
      className={cn(layout === "grid" ? "w-full min-w-0" : "w-32 flex-none scroll-ml-4", "text-left")}
      type="button"
      onClick={() => onSelectDrama(drama)}
    >
      <span className="relative block aspect-[2/3] overflow-hidden rounded-[13px] border border-white/10 bg-[#111827]">
        <img alt={drama.title} className="h-full w-full object-cover" loading="lazy" src={posterPath(drama.slug)} />
        <span className="absolute right-2 top-2 rounded-full bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] px-2 py-0.5 text-[10px] font-bold text-white">
          {drama.episodes}
        </span>
      </span>
      <span className="mt-2 line-clamp-2 block text-[13px] font-semibold leading-tight text-white">{drama.title}</span>
      <span className="mt-1 block truncate text-[11px] text-[#6b7290]">{drama.genre}</span>
    </button>
  );
}

function RankedTile({ drama, index, onSelectDrama }: DramaActionProps & { drama: Drama; index: number }) {
  return (
    <button
      className="flex flex-none scroll-ml-4 items-end text-left"
      type="button"
      onClick={() => onSelectDrama(drama)}
    >
      <span className="mr-[-0.25rem] bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] bg-clip-text text-[84px] font-black leading-[0.74] tracking-normal text-transparent [-webkit-text-stroke:2px_#2a3050]">
        {index + 1}
      </span>
      <span className="relative block w-[92px] overflow-hidden rounded-[11px] border border-white/10 bg-[#111827]">
        <img alt={drama.title} className="aspect-[2/3] h-full w-full object-cover" loading="lazy" src={posterPath(drama.slug)} />
      </span>
      <span className="sr-only">{drama.title}</span>
    </button>
  );
}

function DramaRow({ title, dramas, onSelectDrama }: DramaActionProps & { title: string; dramas: Drama[] }) {
  return (
    <section className="mt-5">
      <div className="flex items-center justify-between px-4 pb-3">
        <h2 className="text-[17px] font-semibold">{title}</h2>
        <span className="text-xs font-medium text-[#9aa2c0]">See all</span>
      </div>
      <div className="flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {dramas.map((drama) => (
          <DramaTile key={drama.slug} drama={drama} onSelectDrama={onSelectDrama} />
        ))}
      </div>
    </section>
  );
}

export function HomeView({ hero, rows, savedSlugs, top10, onSelectDrama, onToggleSaved }: HomeViewProps) {
  const heroSaved = savedSlugs.includes(hero.slug);

  return (
    <div>
      <section className="relative mb-2 mt-1 h-[64vh] max-h-[560px] min-h-[430px] overflow-hidden">
        <img alt={hero.title} className="h-full w-full object-cover object-[center_22%]" src={posterPath(hero.slug)} />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,#0b0d16_3%,rgba(11,13,22,0)_46%,rgba(11,13,22,0)_70%,rgba(11,13,22,0.55))]" />
        <div className="absolute bottom-5 left-[18px] right-[18px]">
          <Badge className="mb-3 border-white/20 bg-[#a14bff44] uppercase tracking-[0.1em]">
            <Star className="mr-1 h-3 w-3 fill-white text-white" />
            Now Trending
          </Badge>
          <button className="block text-left" type="button" onClick={() => onSelectDrama(hero)}>
            <h1 className="text-[34px] font-bold leading-[1.05] tracking-normal">{hero.title}</h1>
          </button>
          <p className="mt-2 line-clamp-2 text-[13.5px] leading-6 text-[#dcdfeb]">{hero.synopsis}</p>
          <div className="mt-4 flex gap-2.5">
            <Button className="h-[50px] flex-1 rounded-[14px] text-[15px]" variant="gradient" onClick={() => onSelectDrama(hero)}>
              <Play className="h-4 w-4 fill-white text-white" />
              Play Episode 1
            </Button>
            <button
              aria-label={heroSaved ? `Remove ${hero.title} from My List` : `Add ${hero.title} to My List`}
              aria-pressed={heroSaved}
              className={cn(
                "flex h-[50px] w-[54px] items-center justify-center rounded-[14px] border border-white/10 bg-white/10 text-white backdrop-blur",
                heroSaved ? "text-[#ff5fbf]" : "text-white"
              )}
              type="button"
              onClick={() => onToggleSaved(hero.slug)}
            >
              {heroSaved ? <BookmarkCheck className="h-5 w-5" /> : <BookmarkPlus className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <div className="px-4 pb-3">
          <h2 className="text-[17px] font-semibold">Top 10 This Week</h2>
        </div>
        <div className="flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {top10.map((drama, index) => (
            <RankedTile key={drama.slug} drama={drama} index={index} onSelectDrama={onSelectDrama} />
          ))}
        </div>
      </section>

      {rows.map((row) => (
        <DramaRow key={row.title} dramas={row.dramas} title={row.title} onSelectDrama={onSelectDrama} />
      ))}
    </div>
  );
}
