import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type VideoPreviewProps = {
  ariaLabel?: string;
  autoPlay?: boolean;
  className?: string;
  controls?: boolean;
  muted?: boolean;
  poster?: string | null;
  title?: string;
  url?: string | null;
};

export function VideoPreview({ ariaLabel, autoPlay = false, className, controls = true, muted = true, poster, title, url }: VideoPreviewProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !url) {
      return undefined;
    }

    let hls: Hls | null = null;

    if (url.endsWith(".m3u8") && Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 6, maxMaxBufferLength: 12 });
      hls.loadSource(url);
      hls.attachMedia(video);
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
  }, [url]);

  return (
    <div className={cn("relative aspect-[9/16] overflow-hidden rounded-[18px] border border-white/10 bg-black", className)}>
      {url ? (
        <video
          ref={videoRef}
          aria-label={ariaLabel || (title ? `${title} video` : t("common.dramaVideo"))}
          className="h-full w-full object-cover"
          autoPlay={autoPlay}
          controls={controls}
          loop
          muted={muted}
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
