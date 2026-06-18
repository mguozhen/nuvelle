import { useState } from "react";
import { Download, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { generationProgress, isActiveGeneration } from "@/lib/generation";
import { useI18n } from "@/lib/i18n";
import type { GeneratedJob } from "@/types/drama";

type GeneratedLibraryProps = {
  assetBaseUrl: string;
  generated: GeneratedJob[];
  isLoading?: boolean;
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

function GeneratedSkeletonGrid() {
  return (
    <section aria-busy="true">
      <h1 className="mb-4 text-xl font-semibold">
        <Skeleton className="h-6 w-40" />
      </h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <article
            key={index}
            className="rounded-2xl border border-white/10 bg-[#0d0f17] p-4"
            data-testid="generated-skeleton-card"
          >
            <Skeleton className="aspect-video rounded-xl bg-white/[0.07]" />
            <div className="mt-3 space-y-3">
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-20" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-20" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function statusText(t: ReturnType<typeof useI18n>["t"], status: string | undefined, progress: number): string {
  if (status === "done") {
    return t("generation.done");
  }
  if (status === "downloading") {
    return t("generation.downloading", { progress });
  }
  if (status === "rendering") {
    return t("generation.rendering", { progress });
  }
  if (status === "queued") {
    return t("generation.queued", { progress });
  }
  return status || "";
}

export function GeneratedLibrary({ assetBaseUrl, generated, isLoading = false, onRegenerate }: GeneratedLibraryProps) {
  const { t } = useI18n();
  const [prompts, setPrompts] = useState<Record<string, string>>({});

  if (isLoading && !generated.length) {
    return <GeneratedSkeletonGrid />;
  }

  if (!generated.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d0f17] p-10 text-center text-[#9aa2c0]">
        <b className="block text-lg text-white">{t("generated.emptyTitle")}</b>
        {t("generated.emptyBody")}
      </div>
    );
  }

  return (
    <section>
      <h1 className="mb-4 text-xl font-semibold">{t("generated.libraryTitle")}</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {generated.map((item, index) => {
          const key = item.job_id || item.id || `${item.title}-${index}`;
          const prompt = prompts[key] ?? item.prompt ?? "";
          const teaserUrl = assetUrl(assetBaseUrl, item.files?.teaser);
          const coverUrl = assetUrl(assetBaseUrl, item.files?.cover);
          const title = item.drama?.title || item.title || t("common.untitledPromo");
          const progress = generationProgress(item.status, item.progress);
          const active = isActiveGeneration(item.status);

          return (
            <article key={key} className="rounded-2xl border border-white/10 bg-[#0d0f17] p-4">
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                {teaserUrl ? (
                  <video className="h-full w-full object-cover" controls poster={coverUrl} src={teaserUrl} />
                ) : coverUrl ? (
                  <img alt={title} className="h-full w-full object-cover" src={coverUrl} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#9aa2c0]">{t("generated.noPreview")}</div>
                )}
              </div>
              <h2 className="mt-3 line-clamp-2 font-semibold">{title}</h2>
              <p className="mt-1 text-xs text-[#9aa2c0]">
                EP{item.episode || item.episode_ref?.episode_no || 1} - {item.duration || 30}s {item.status ? `- ${statusText(t, item.status, progress)}` : ""}
              </p>
              {active ? (
                <div
                  aria-label={statusText(t, item.status, progress)}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={progress}
                  className="mt-3"
                  role="progressbar"
                >
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#a14bff,#ff5fbf)]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : null}
              {item.caption ? (
                <Textarea
                  className="mt-3 h-20 min-h-20 resize-none text-xs text-[#dfe3ee]"
                  readOnly
                  value={item.caption}
                />
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {teaserUrl ? (
                  <Button asChild size="sm" variant="outline">
                    <a download href={teaserUrl}>
                      <Download className="h-3.5 w-3.5" />
                      {t("generated.teaser")}
                    </a>
                  </Button>
                ) : null}
                {coverUrl ? (
                  <Button asChild size="sm" variant="outline">
                    <a download href={coverUrl}>
                      <Download className="h-3.5 w-3.5" />
                      {t("generated.cover")}
                    </a>
                  </Button>
                ) : null}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder={t("generated.regenPlaceholder")}
                  value={prompt}
                  onChange={(event) => setPrompts((current) => ({ ...current, [key]: event.target.value }))}
                />
                <Button disabled={active} size="sm" variant="outline" onClick={() => onRegenerate(item, prompt)}>
                  <RefreshCcw className="h-3.5 w-3.5" />
                  {t("generated.regen")}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
