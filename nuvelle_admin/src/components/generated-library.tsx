import { useState } from "react";
import { Download, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { generationProgress, isActiveGeneration } from "@/lib/generation";
import { useI18n } from "@/i18n";
import type { GeneratedJob } from "@/types/drama";

type GeneratedLibraryProps = {
  assetBaseUrl: string;
  generated: GeneratedJob[];
  isLoading?: boolean;
  onDownloadVideo: (item: GeneratedJob) => void | Promise<void>;
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

function downloadUrl(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const url = new URL(value, window.location.origin);
  url.searchParams.set("download", "1");
  return url.toString();
}

function generatedAssetDownloadUrl(
  baseUrl: string,
  previewUrl?: string,
  jobId?: string,
  filename?: "cover.jpg",
): string | undefined {
  if (!previewUrl || !jobId || !filename) {
    return undefined;
  }

  return downloadUrl(assetUrl(baseUrl, `/promo/jobs/${encodeURIComponent(jobId)}/files/${filename}`));
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
            <div className="flex justify-center rounded-xl border border-white/10 bg-black/80 p-2">
              <Skeleton className="aspect-[9/16] h-[360px] max-h-[56vh] w-auto max-w-full rounded-lg bg-white/[0.07]" />
            </div>
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

function GeneratedPreview({ coverUrl, teaserUrl, title }: { coverUrl?: string; teaserUrl?: string; title: string }) {
  const { t } = useI18n();

  return (
    <div className="flex justify-center rounded-xl border border-white/10 bg-black/80 p-2" data-testid="generated-preview-frame">
      <div className="aspect-[9/16] h-[360px] max-h-[56vh] w-auto max-w-full overflow-hidden rounded-lg bg-black">
        {teaserUrl ? (
          <video
            aria-label={t("generated.videoPreview", { title })}
            className="h-full w-full object-contain"
            controls
            poster={coverUrl}
            src={teaserUrl}
          />
        ) : coverUrl ? (
          <img alt={title} className="h-full w-full object-contain" src={coverUrl} />
        ) : (
          <div className="flex h-full w-[202px] items-center justify-center text-sm text-[#9aa2c0]">{t("generated.noPreview")}</div>
        )}
      </div>
    </div>
  );
}

export function GeneratedLibrary({ assetBaseUrl, generated, isLoading = false, onDownloadVideo, onRegenerate }: GeneratedLibraryProps) {
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
          const canDownloadTeaser = Boolean(teaserUrl && (item.job_id || item.id));
          const coverDownloadUrl = generatedAssetDownloadUrl(assetBaseUrl, coverUrl, item.job_id || item.id, "cover.jpg");
          const title = item.drama?.title || item.title || t("common.untitledPromo");
          const progress = generationProgress(item.status, item.progress);
          const active = isActiveGeneration(item.status);

          return (
            <article
              key={key}
              className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#0d0f17] p-4"
              data-testid="generated-card"
            >
              <GeneratedPreview coverUrl={coverUrl} teaserUrl={teaserUrl} title={title} />
              <h2 className="mt-3 line-clamp-1 h-6 text-lg font-semibold leading-6">{title}</h2>
              <p className="mt-1 h-4 truncate text-xs text-[#9aa2c0]">
                EP{item.episode || item.episode_ref?.episode_no || 1} - {item.duration || 30}s {item.status ? `- ${statusText(t, item.status, progress)}` : ""}
              </p>
              {active ? (
                <div
                  aria-label={statusText(t, item.status, progress)}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={progress}
                  className="mt-3 h-2"
                  role="progressbar"
                >
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#a14bff,#ff5fbf)]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : null}
              <div className="mt-3 h-24">
                {item.caption ? (
                  <Textarea
                    className="h-full min-h-24 resize-none overflow-y-auto text-xs text-[#dfe3ee]"
                    readOnly
                    value={item.caption}
                  />
                ) : null}
              </div>
              <div className="mt-3 flex h-8 flex-wrap gap-2 overflow-hidden">
                {canDownloadTeaser ? (
                  <Button size="sm" variant="outline" onClick={() => void onDownloadVideo(item)}>
                    <Download className="h-3.5 w-3.5" />
                    {t("generated.teaser")}
                  </Button>
                ) : null}
                {coverDownloadUrl ? (
                  <Button asChild size="sm" variant="outline">
                    <a download="cover.jpg" href={coverDownloadUrl}>
                      <Download className="h-3.5 w-3.5" />
                      {t("generated.cover")}
                    </a>
                  </Button>
                ) : null}
              </div>
              <div className="mt-auto flex gap-2 pt-3">
                <Input
                  placeholder={t("generated.regenPlaceholder")}
                  value={prompt}
                  onChange={(event) => setPrompts((current) => ({ ...current, [key]: event.target.value }))}
                />
                <Button className="h-11 px-4" disabled={active} variant="gradient" onClick={() => onRegenerate(item, prompt)}>
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
