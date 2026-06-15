import { DramaTile } from "@/components/home-view";
import { getDramaBySlug, type Drama } from "@/data/dramas";

type MyListViewProps = {
  savedSlugs: string[];
  onSelectDrama: (drama: Drama) => void;
};

export function MyListView({ savedSlugs, onSelectDrama }: MyListViewProps) {
  const savedDramas = savedSlugs.map(getDramaBySlug).filter((drama): drama is Drama => Boolean(drama));

  return (
    <div>
      <div className="px-4 pb-2 pt-3">
        <h1 className="text-2xl font-bold tracking-normal">My List</h1>
        <p className="mt-1 text-[13.5px] text-[#9aa2c0]">Dramas you saved to binge later.</p>
      </div>
      {savedDramas.length ? (
        <div className="grid grid-cols-3 gap-3 px-4 py-3">
          {savedDramas.map((drama) => (
            <DramaTile key={drama.slug} drama={drama} layout="grid" onSelectDrama={onSelectDrama} />
          ))}
        </div>
      ) : (
        <p className="px-5 py-8 text-center text-sm leading-6 text-[#9aa2c0]">
          Nothing saved yet.
          <br />
          Tap + on any drama to add it here.
        </p>
      )}
    </div>
  );
}
