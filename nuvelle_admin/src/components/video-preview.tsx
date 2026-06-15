import { useEffect, useRef } from "react";
import Hls from "hls.js";

type VideoPreviewProps = {
  poster?: string | null;
  title?: string;
  url?: string | null;
};

export function VideoPreview({ poster, title, url }: VideoPreviewProps) {
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
    <div className="relative aspect-[9/16] overflow-hidden rounded-[18px] border border-white/10 bg-black">
      {url ? (
        <video
          ref={videoRef}
          aria-label={title}
          className="h-full w-full object-cover"
          controls
          loop
          muted
          playsInline
          poster={poster || undefined}
        />
      ) : poster ? (
        <img alt={title || "Drama cover"} className="h-full w-full object-cover" referrerPolicy="no-referrer" src={poster} />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-[#9aa2c0]">No preview</div>
      )}
    </div>
  );
}
