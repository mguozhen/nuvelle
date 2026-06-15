export type VoteVerdict = "fire" | "ok" | "pass";

export type DramaRecord = {
  id: number | string;
  title?: string;
  platform?: string;
  genre?: string;
  cover_image_url?: string | null;
  video_url?: string | null;
  source_url?: string | null;
  episode_count?: number | string | null;
  synopsis_or_hook?: string | null;
  signal?: string | null;
  rs_book_id?: string | number;
  episodes?: Record<string, string>;
};

export type VoteRecord = {
  dramaId: number | string;
  verdict: VoteVerdict;
  score: number;
};

export type PromoRequest = {
  url: string;
  title: string;
  ep: number;
  dur: number;
  beats?: number[];
  prompt?: string;
  cover_image?: string;
};
