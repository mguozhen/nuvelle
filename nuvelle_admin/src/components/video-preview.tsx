import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type VideoPreviewProps = {
  ariaLabel?: string;
  autoPlay?: boolean;
  className?: string;
  controls?: boolean;
  embedUrl?: string | null;
  muted?: boolean;
  playRequestKey?: number;
  poster?: string | null;
  title?: string;
  url?: string | null;
};

export function VideoPreview({
  ariaLabel,
  autoPlay = false,
  className,
  controls = true,
  embedUrl,
  muted = true,
  playRequestKey = 0,
  poster,
  title,
  url
}: VideoPreviewProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const shouldUseEmbed = Boolean(embedUrl && (!url || videoFailed));

  useEffect(() => {
    setVideoFailed(false);
  }, [embedUrl, url]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || shouldUseEmbed) {
      return undefined;
    }

    const handleVideoError = () => setVideoFailed(true);
    video.addEventListener("error", handleVideoError);

    return () => {
      video.removeEventListener("error", handleVideoError);
    };
  }, [shouldUseEmbed, url]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !url || shouldUseEmbed) {
      return undefined;
    }

    let hls: Hls | null = null;

    if (url.endsWith(".m3u8") && Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 6, maxMaxBufferLength: 12 });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setVideoFailed(true);
        }
      });
    } else {
      video.src = url;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }

      video.removeAttribute("src");
      video.load();
    };
  }, [shouldUseEmbed, url]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !url || shouldUseEmbed || !playRequestKey) {
      return;
    }

    void video.play().catch(() => undefined);
  }, [playRequestKey, shouldUseEmbed, url]);

  return (
    <div className={cn("relative aspect-[9/16] overflow-hidden rounded-[18px] border border-white/10 bg-black", className)}>
      {shouldUseEmbed ? (
        <>
          <iframe
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer"
            src={embedUrl || undefined}
            title={t("common.embeddedPlayer", { title: title || t("common.untitled") })}
          />
          {videoFailed ? (
            <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg bg-black/75 px-3 py-2 text-xs leading-5 text-white">
              {t("common.videoFallback")}
            </div>
          ) : null}
        </>
      ) : url ? (
        <video
          ref={videoRef}
          aria-label={ariaLabel || (title ? `${title} video` : t("common.dramaVideo"))}
          className="h-full w-full object-cover"
          autoPlay={autoPlay}
          controls={controls}
          loop
          muted={muted}
          onError={() => setVideoFailed(true)}
          onErrorCapture={() => setVideoFailed(true)}
          playsInline
          poster={poster || undefined}
        />
      ) : poster ? (
        <img alt={title || t("common.dramaCover")} className="h-full w-full object-cover" referrerPolicy="no-referrer" src={poster} />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-[#9aa2c0]">{t("common.noPreview")}</div>
      )}
    </div>
  );
}
