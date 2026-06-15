import { useState } from "react";
import { Download, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GeneratedPromo } from "@/lib/storage";

type GeneratedLibraryProps = {
  generated: GeneratedPromo[];
  onRegenerate: (item: GeneratedPromo, prompt: string) => void;
};

export function GeneratedLibrary({ generated, onRegenerate }: GeneratedLibraryProps) {
  const [prompts, setPrompts] = useState<Record<string, string>>({});

  if (!generated.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d0f17] p-10 text-center text-[#9aa2c0]">
        <b className="block text-lg text-white">No generated material yet</b>
        Generate a promo from Swipe or Board.
      </div>
    );
  }

  return (
    <section>
      <h1 className="mb-4 text-xl font-semibold">Generated library</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {generated.map((item, index) => {
          const key = item.id || `${item.title}-${index}`;
          const prompt = prompts[key] || "";

          return (
            <article key={key} className="rounded-2xl border border-white/10 bg-[#0d0f17] p-4">
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                {item.teaserUrl ? (
                  <video className="h-full w-full object-cover" controls poster={item.coverUrl} src={item.teaserUrl} />
                ) : item.coverUrl ? (
                  <img alt={item.title || "Generated cover"} className="h-full w-full object-cover" src={item.coverUrl} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#9aa2c0]">{item.status || "queued"}</div>
                )}
              </div>
              <h2 className="mt-3 line-clamp-2 font-semibold">{item.title || "Untitled promo"}</h2>
              <p className="mt-1 text-xs text-[#9aa2c0]">
                {item.duration || 30}s {item.status ? `- ${item.status}` : ""}
              </p>
              {item.caption ? (
                <textarea
                  className="mt-3 h-20 w-full resize-none rounded-lg border border-white/10 bg-[#0c0f1a] p-2 text-xs text-[#dfe3ee]"
                  readOnly
                  value={item.caption}
                />
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {item.teaserUrl ? (
                  <Button asChild size="sm" variant="outline">
                    <a download href={item.teaserUrl}>
                      <Download className="h-3.5 w-3.5" />
                      Teaser
                    </a>
                  </Button>
                ) : null}
                {item.coverUrl ? (
                  <Button asChild size="sm" variant="outline">
                    <a download href={item.coverUrl}>
                      <Download className="h-3.5 w-3.5" />
                      Cover
                    </a>
                  </Button>
                ) : null}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Regenerate direction"
                  value={prompt}
                  onChange={(event) => setPrompts((current) => ({ ...current, [key]: event.target.value }))}
                />
                <Button size="sm" variant="outline" onClick={() => onRegenerate(item, prompt)}>
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Regen
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
