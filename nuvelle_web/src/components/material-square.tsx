import { Clipboard, Download, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { catalog, packAssetPath, packs, posterPath } from "@/data/catalog";
import { promoLink } from "@/lib/distributor";

type MaterialSquareProps = {
  code: string;
  onCopyCaption: (slug: string) => void;
  onGrabLink: (slug: string, title: string) => void;
};

export function MaterialSquare({ code, onCopyCaption, onGrabLink }: MaterialSquareProps) {
  return (
    <div>
      <section>
        <h1 className="text-lg font-semibold">Ready to post - full material packs</h1>
        <p className="mt-1 text-sm text-[#9aa2c0]">
          Each pack includes a 13s vertical clip, cover, caption, and hashtags. Download, add your link, post.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {packs.map((pack) => (
            <article
              key={pack.slug}
              className="grid grid-cols-[120px_minmax(0,1fr)] gap-3.5 rounded-2xl border border-white/10 bg-[linear-gradient(160deg,#141826,#0d0f17)] p-3.5"
            >
              <div className="overflow-hidden rounded-[10px] border border-white/10">
                <img alt={pack.title} className="aspect-[9/16] h-full w-full object-cover" src={packAssetPath(pack.slug, "cover.jpg")} />
              </div>
              <div className="min-w-0">
                <h2 className="text-[15.5px] font-semibold leading-tight">{pack.title}</h2>
                <p className="mt-1 text-[11.5px] text-[#6b7290]">{pack.genre}</p>
                <p className="mt-2 text-xs font-semibold text-[#5fd39a]">Full pack ready</p>
                <div className="mt-3 grid gap-2">
                  <Button asChild className="h-9 rounded-[10px]" size="sm" variant="gradient">
                    <a download href={packAssetPath(pack.slug, "teaser_13s.mp4")}>
                      <Download className="h-4 w-4" />
                      13s clip
                    </a>
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild className="h-8 rounded-[10px]" size="sm" variant="outline">
                      <a download href={packAssetPath(pack.slug, "cover.jpg")}>
                        <Download className="h-3.5 w-3.5" />
                        Cover
                      </a>
                    </Button>
                    <Button className="h-8 rounded-[10px]" size="sm" variant="outline" onClick={() => onCopyCaption(pack.slug)}>
                      <Clipboard className="h-3.5 w-3.5" />
                      Caption
                    </Button>
                  </div>
                  <Button className="h-8 rounded-[10px]" size="sm" variant="outline" onClick={() => onGrabLink(pack.slug, pack.title)}>
                    <Link2 className="h-3.5 w-3.5" />
                    Grab link
                  </Button>
                  <p className="rounded-lg border border-dashed border-[#1c3a2a] bg-[#0c0f1a] px-2.5 py-2 font-mono text-[11px] leading-5 text-[#5fd39a]">
                    {promoLink(pack.slug, code)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="text-lg font-semibold">Full catalog - 414 dramas</h2>
        <p className="mt-1 text-sm text-[#9aa2c0]">
          Browse everything. Tap any drama to grab your link now. Material packs roll out continuously.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {catalog.map((drama) => (
            <button key={drama.slug} className="text-left" type="button" onClick={() => onGrabLink(drama.slug, drama.title)}>
              <span className="relative block aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-[#111827]">
                <img alt={drama.title} className="h-full w-full object-cover" loading="lazy" src={posterPath(drama.slug)} />
                <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] text-white backdrop-blur">
                  {drama.genre}
                </span>
              </span>
              <span className="mt-2 line-clamp-2 block text-[13px] font-semibold leading-tight">{drama.title}</span>
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#6b7290]">
                <Link2 className="h-3 w-3" />
                Grab link
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
