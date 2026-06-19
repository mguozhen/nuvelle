export type VoteVerdict = "fire" | "ok" | "pass";

export type DramaRecord = {
  id: number | string;
  title?: string;
  platform?: string;
  genre?: string;
  language?: string | null;
  tags?: string[];
  show_tags?: string[];
  cover_image_url?: string | null;
  video_url?: string | null;
  source_url?: string | null;
  episode_count?: number | string | null;
  synopsis_or_hook?: string | null;
  signal?: string | null;
  rs_book_id?: string | number;
  recent_revenue?: number | null;
  promoters_cnt?: number | null;
  pay_start?: number | null;
  promotion_code?: string | number | null;
  app_promotion_link?: string | null;
  book_promotion_link?: string | null;
  platform_publish_at?: string | null;
  has_video?: boolean;
  seen?: boolean;
  generated_count?: number;
  generation_status?: string | null;
  generation_progress?: number;
  episodes?: Record<string, string> | DramaEpisodeRecord[];
  episode_list?: DramaEpisodeRecord[];
};

export type DramaEpisodeRecord = {
  id: number;
  episode_no: number;
  chapter_id?: string | null;
  t_chapter_id?: string | null;
  play_url?: string | null;
  poster_url?: string | null;
  iframe_src?: string | null;
  generation_status?: string | null;
  generation_progress?: number;
};

export type AdminDramaListResponse = {
  items: DramaRecord[];
  total: number;
};

export type AdminDramaFilterOptions = {
  platforms: string[];
  languages: string[];
  tags: string[];
};

export type PromoRequest = {
  url: string;
  title: string;
  ep: number;
  dur: number;
  beats?: number[];
  prompt?: string;
  cover_image?: string;
  drama_id?: number | string;
  episode_id?: number;
};

export type AdminUser = {
  id: number;
  email: string;
  role: string;
  status: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AdminUser;
};

export type RegisterRequest = {
  invite_code: string;
  email: string;
  password: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type DramaEventRequest = {
  drama_id: number | string;
  episode_id?: number;
  event_type: "seen" | "vote" | "generate";
  verdict?: VoteVerdict;
  score?: number;
  metadata?: Record<string, unknown>;
};

export type GeneratedJob = {
  id: string;
  job_id: string;
  status: string;
  progress?: number;
  title?: string;
  episode?: number;
  duration?: number;
  source_url?: string | null;
  prompt?: string | null;
  caption?: string | null;
  error?: string | null;
  files?: { teaser?: string | null; cover?: string | null } | null;
  drama?: { id: number; title: string } | null;
  episode_ref?: { id: number; episode_no: number } | null;
  created_at?: string;
};

export type GeneratedListResponse = {
  items: GeneratedJob[];
  total: number;
};

export type GenerationState = {
  disabled: boolean;
  status?: string | null;
  progress?: number;
};

export type GenerationEpisodeRef = {
  id?: number;
  episode_no?: number;
  generation_status?: string | null;
  generation_progress?: number;
};
