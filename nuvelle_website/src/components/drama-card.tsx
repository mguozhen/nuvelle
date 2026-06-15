import { Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Drama } from "@/data/dramas";
import { cn } from "@/lib/utils";

type DramaCardProps = {
  drama: Drama;
  onOpen: (drama: Drama) => void;
  rank?: number;
  searchAlias?: string;
};

export function DramaCard({ drama, onOpen, rank, searchAlias }: DramaCardProps) {
  if (rank) {
    return (
      <button
        type="button"
        className="group flex w-[15.5rem] flex-none snap-start items-end gap-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:w-[18.5rem]"
        onClick={() => onOpen(drama)}
      >
        <span className="min-w-[4.6rem] bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] bg-clip-text text-[5.7rem] font-black leading-[0.78] tracking-normal text-transparent [-webkit-text-stroke:1px_rgba(154,162,192,0.45)] sm:min-w-[6rem] sm:text-8xl">
          {rank}
        </span>
        <span className="relative block w-24 flex-none overflow-hidden rounded-md border border-white/12 bg-zinc-900 shadow-xl shadow-black/35 sm:w-32">
          <img
            className="aspect-[2/3] h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            src={`/posters/${drama.slug}.png`}
            alt={drama.title}
            loading="lazy"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </span>
        <span className="sr-only">{drama.title}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="group flex w-44 flex-none snap-start flex-col text-left outline-none transition-transform duration-200 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-white/70 sm:w-52"
      onClick={() => onOpen(drama)}
    >
      <span className="relative block overflow-hidden rounded-lg border border-white/12 bg-[#141826] shadow-xl shadow-black/25">
        <img
          className="aspect-[2/3] h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          src={`/posters/${drama.slug}.png`}
          alt={drama.title}
          loading="lazy"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-[#090b14]/95 via-transparent to-transparent" />
        <Badge className="absolute left-2 top-2 max-w-[8rem] border-white/20 bg-black/45 px-2 py-0.5 text-[0.68rem] text-white backdrop-blur">
          {drama.genre}
        </Badge>
        <span className="absolute right-2 top-2 rounded-full bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] px-2 py-0.5 text-[0.68rem] font-semibold text-white">
          {drama.episodes}
        </span>
        <span className="absolute bottom-3 left-1/2 inline-flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-white/35 bg-white/15 text-white opacity-0 backdrop-blur transition-opacity duration-200 group-hover:opacity-100">
          <Play className="h-4 w-4 fill-current" />
        </span>
      </span>
      <span className="mt-3 text-[0.95rem] font-semibold leading-snug text-white">{drama.title}</span>
      {searchAlias ? (
        <span className="mt-1 inline-flex w-fit rounded-full border border-white/12 bg-white/8 px-2 py-0.5 text-xs font-semibold text-white/70">
          {searchAlias}
        </span>
      ) : null}
      <span className={cn("mt-1 line-clamp-2 text-xs leading-relaxed text-[#8f98b6]")}>{drama.synopsis}</span>
    </button>
  );
}
