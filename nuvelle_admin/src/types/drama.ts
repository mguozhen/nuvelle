export type VoteVerdict = "fire" | "ok" | "pass";

export type DramaRecord = {
  id: number | string;
  title?: string;
  platform?: string;
  genre?: string;
  cover_image_url?: string;
  video_url?: string;
  source_url?: string;
  episode_count?: number | string;
  synopsis_or_hook?: string;
  signal?: string;
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
