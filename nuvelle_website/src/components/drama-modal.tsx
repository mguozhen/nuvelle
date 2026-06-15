"use client";

import { Download, Eye, Play, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import type { Drama } from "@/data/dramas";
import { statForDrama } from "@/data/dramas";

type DramaModalProps = {
  drama: Drama | null;
  onClose: () => void;
  onGetApp: () => void;
};

function episodeCount(episodes: string) {
  const match = episodes.match(/\d+$/);
  return match ? Number(match[0]) : 8;
}

export function DramaModal({ drama, onClose, onGetApp }: DramaModalProps) {
  const stats = drama ? statForDrama(drama.slug) : null;
  const episodes = drama ? Array.from({ length: episodeCount(drama.episodes) }, (_, index) => index + 1) : [];

  function handleWatch() {
    if (!drama) {
      return;
    }

    if (drama.affiliateUrl && drama.affiliateUrl !== "#") {
      window.open(drama.affiliateUrl, "_blank", "noopener,noreferrer");
      return;
    }

    onGetApp();
  }

  return (
    <Dialog open={Boolean(drama)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      {drama && stats ? (
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-xl border-white/12 bg-[#0f1320] p-0">
          <div className="grid md:grid-cols-[19rem_1fr]">
            <div className="relative min-h-72 overflow-hidden md:min-h-full">
              <img
                className="h-full max-h-[34rem] w-full object-cover md:max-h-none"
                src={`/posters/${drama.slug}.png`}
                alt={drama.title}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f1320] via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#0f1320]" />
            </div>
            <div className="p-6 sm:p-8">
              <DialogHeader>
                <Badge className="w-fit border-transparent bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] text-white">
                  {drama.genre}
                </Badge>
                <DialogTitle className="text-3xl font-bold leading-tight tracking-normal text-white">
                  {drama.title}
                </DialogTitle>
                <DialogDescription className="text-base leading-relaxed text-[#a8b0cc]">
                  {drama.synopsis}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-[#a8b0cc]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/7 px-3 py-1.5">
                  <Star className="h-4 w-4 fill-[#ffcf5c] text-[#ffcf5c]" />
                  <b className="text-white">{stats.rating}</b> / 5
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/7 px-3 py-1.5">
                  <Play className="h-4 w-4 text-[#ff5fbf]" />
                  <b className="text-white">{drama.episodes}</b>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/7 px-3 py-1.5">
                  <Eye className="h-4 w-4 text-[#b25cff]" />
                  <b className="text-white">{stats.views}</b> views
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-2" aria-label="Episodes">
                {episodes.map((episode) => (
                  <span
                    key={episode}
                    className="rounded-md border border-white/12 bg-[#0b0d16] px-3 py-2 text-xs font-semibold text-[#a8b0cc]"
                  >
                    EP {episode}
                    {episode <= 2 ? <span className="text-white"> · Free</span> : null}
                  </span>
                ))}
              </div>

              <DialogFooter className="mt-7 justify-start sm:justify-start">
                <Button type="button" size="lg" variant="gradient" onClick={handleWatch}>
                  <Play className="h-4 w-4 fill-current" />
                  Watch Episode 1
                </Button>
                <Button type="button" size="lg" variant="outline" onClick={onGetApp}>
                  <Download className="h-4 w-4" />
                  Get the App
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
