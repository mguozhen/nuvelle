import { BookmarkCheck, BookmarkPlus, Flame, Lock, Play, Star, X } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { posterPath, statForDrama, type Drama } from "@/data/dramas";

type DramaSheetProps = {
  drama: Drama | null;
  saved: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleSaved: (slug: string) => void;
  onWatch: (drama: Drama) => void;
};

function episodeCount(drama: Drama): number {
  const match = drama.episodes.match(/\d+$/);
  return match ? Number(match[0]) : 8;
}

export function DramaSheet({ drama, saved, onOpenChange, onToggleSaved, onWatch }: DramaSheetProps) {
  const stats = drama ? statForDrama(drama.slug) : null;
  const episodes = drama ? Array.from({ length: episodeCount(drama) }, (_, index) => index + 1) : [];

  return (
    <Sheet open={Boolean(drama)} onOpenChange={onOpenChange}>
      <SheetContent
        className="left-0 right-0 mx-auto h-[100dvh] max-w-[480px] overflow-y-auto border-white/10 bg-[#0b0d16] p-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] text-white"
        showClose={false}
        side="bottom"
      >
        {drama && stats ? (
          <>
            <div className="relative h-[50vh] max-h-[430px] overflow-hidden">
              <img
                alt={drama.title}
                className="h-full w-full object-cover object-[center_18%]"
                src={posterPath(drama.slug)}
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,#0b0d16,rgba(11,13,22,0)_55%)]" />
              <SheetClose className="absolute left-4 top-[calc(0.75rem+env(safe-area-inset-top,0px))] flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </SheetClose>
            </div>

            <div className="relative z-10 -mt-12 px-[18px]">
              <SheetHeader>
                <span className="mb-2 inline-flex w-fit rounded-full bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] px-3 py-1 text-[11px] font-bold text-white">
                  {drama.genre}
                </span>
                <SheetTitle className="text-[27px] font-bold leading-tight tracking-normal">{drama.title}</SheetTitle>
                <SheetDescription className="sr-only">{drama.synopsis}</SheetDescription>
              </SheetHeader>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-[#9aa2c0]">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-4 w-4 fill-[#ff5fbf] text-[#ff5fbf]" />
                  <b className="text-white">{stats.rating}</b>
                </span>
                <span>
                  <b className="text-white">{drama.episodes}</b>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Flame className="h-4 w-4 text-[#ff5fbf]" />
                  <b className="text-white">{stats.views}</b>
                </span>
              </div>

              <p className="mt-3 text-[14.5px] leading-6 text-[#9aa2c0]">{drama.synopsis}</p>

              <div className="mt-5 grid gap-2">
                <Button className="h-[52px] rounded-[14px] text-base" variant="gradient" onClick={() => onWatch(drama)}>
                  <Play className="h-4 w-4 fill-white text-white" />
                  Watch Episode 1
                </Button>
                <Button
                  aria-pressed={saved}
                  className="h-[48px] rounded-[14px] border-white/10 bg-white/10 text-[15px]"
                  variant="outline"
                  onClick={() => onToggleSaved(drama.slug)}
                >
                  {saved ? <BookmarkCheck className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
                  {saved ? "In My List" : "Add to My List"}
                </Button>
              </div>

              <section className="mt-5">
                <h3 className="mb-3 text-[15px] font-semibold">Episodes</h3>
                <div className="grid grid-cols-4 gap-2.5">
                  {episodes.map((episode) => {
                    const free = episode <= 2;

                    return (
                      <button
                        key={episode}
                        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[11px] border border-white/10 bg-[#0c0f1a] text-[15px] font-bold text-white disabled:text-[#6b7290]"
                        disabled={!free}
                        type="button"
                        onClick={() => onWatch(drama)}
                      >
                        {free ? episode : <Lock className="h-4 w-4" />}
                        <small className="h-3 text-[9px] font-bold text-[#ff5fbf]">{free ? "FREE" : episode}</small>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
