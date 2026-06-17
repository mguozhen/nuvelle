import { useState } from "react";
import { Download, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GeneratedJob } from "@/types/drama";

type GeneratedLibraryProps = {
  assetBaseUrl: string;
  generated: GeneratedJob[];
  onRegenerate: (item: GeneratedJob, prompt: string) => void;
};

function assetUrl(baseUrl: string, value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${baseUrl}${value.startsWith("/") ? value : `/${value}`}`;
}

export function GeneratedLibrary({ assetBaseUrl, generated, onRegenerate }: GeneratedLibraryProps) {
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
          const key = item.job_id || item.id || `${item.title}-${index}`;
          const prompt = prompts[key] ?? item.prompt ?? "";
          const teaserUrl = assetUrl(assetBaseUrl, item.files?.teaser);
          const coverUrl = assetUrl(assetBaseUrl, item.files?.cover);
          const title = item.drama?.title || item.title || "Untitled promo";

          return (
            <article key={key} className="rounded-2xl border border-white/10 bg-[#0d0f17] p-4">
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                {teaserUrl ? (
                  <video className="h-full w-full object-cover" controls poster={coverUrl} src={teaserUrl} />
                ) : coverUrl ? (
                  <img alt={title} className="h-full w-full object-cover" src={coverUrl} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#9aa2c0]">No preview yet</div>
                )}
              </div>
              <h2 className="mt-3 line-clamp-2 font-semibold">{title}</h2>
              <p className="mt-1 text-xs text-[#9aa2c0]">
                EP{item.episode || item.episode_ref?.episode_no || 1} - {item.duration || 30}s {item.status ? `- ${item.status}` : ""}
              </p>
              {item.caption ? (
                <textarea
                  className="mt-3 h-20 w-full resize-none rounded-lg border border-white/10 bg-[#0c0f1a] p-2 text-xs text-[#dfe3ee]"
                  readOnly
                  value={item.caption}
                />
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {teaserUrl ? (
                  <Button asChild size="sm" variant="outline">
                    <a download href={teaserUrl}>
                      <Download className="h-3.5 w-3.5" />
                      Teaser
                    </a>
                  </Button>
                ) : null}
                {coverUrl ? (
                  <Button asChild size="sm" variant="outline">
                    <a download href={coverUrl}>
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
