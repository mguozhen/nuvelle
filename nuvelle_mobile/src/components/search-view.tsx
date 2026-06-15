import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DramaTile } from "@/components/home-view";
import { genres, searchDramas, type Drama } from "@/data/dramas";
import { cn } from "@/lib/utils";

type SearchViewProps = {
  onSelectDrama: (drama: Drama) => void;
};

export function SearchView({ onSelectDrama }: SearchViewProps) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const genreOptions = useMemo(() => ["All", ...genres()], []);
  const results = useMemo(() => searchDramas(query, genre), [genre, query]);

  return (
    <div>
      <div className="px-4 pb-1 pt-2">
        <label className="flex h-12 items-center gap-2.5 rounded-[13px] border border-white/10 bg-[#0c0f1a] px-3.5">
          <Search className="h-5 w-5 flex-none text-[#9aa2c0]" />
          <input
            className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-[#6b7290]"
            placeholder="Search dramas, genres..."
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {genreOptions.map((option) => {
          const active = option === genre;

          return (
            <button
              key={option}
              aria-pressed={active}
              className={cn(
                "flex-none rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors",
                active
                  ? "border-transparent bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] text-white"
                  : "border-white/10 bg-[#0c0f1a] text-[#9aa2c0]"
              )}
              type="button"
              onClick={() => setGenre(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
      {results.length ? (
        <div className="grid grid-cols-3 gap-3 px-4 py-3">
          {results.map((drama) => (
            <DramaTile key={drama.slug} drama={drama} layout="grid" onSelectDrama={onSelectDrama} />
          ))}
        </div>
      ) : (
        <p className="px-5 py-8 text-center text-sm leading-6 text-[#9aa2c0]">
          No dramas match. Try "revenge", "werewolf", "billionaire"...
        </p>
      )}
    </div>
  );
}
