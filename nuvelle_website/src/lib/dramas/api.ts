export type PublicDramaEpisode = {
  id: number;
  episode_no: number;
  play_url: string | null;
  poster_url: string | null;
  video_transfer_status: string | null;
};

export type PublicDramaDetail = {
  id: number;
  title: string;
  platform: string | null;
  genre: string | null;
  cover_image_url: string | null;
  video_url: string | null;
  source_url: string | null;
  episode_count: number | null;
  synopsis_or_hook: string | null;
  signal: string | null;
  rs_book_id: string | null;
  created_at: string;
  updated_at: string;
  language: string | null;
  episodes: PublicDramaEpisode[];
};

type Fetcher = typeof fetch;

type FetchDramaDetailOptions = {
  apiUrl?: string;
  fetcher?: Fetcher;
};

export function dramaApiBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return trimTrailingSlash(env.NUVELLE_API_URL || env.NEXT_PUBLIC_NUVELLE_API_URL || "");
}

export async function fetchDramaDetail(
  dramaId: number | string,
  options: FetchDramaDetailOptions = {}
): Promise<PublicDramaDetail | null> {
  const apiUrl = trimTrailingSlash(options.apiUrl ?? dramaApiBaseUrl());
  if (!apiUrl) {
    return null;
  }

  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${apiUrl}/dramas/${encodeURIComponent(String(dramaId))}`, {
    cache: "no-store"
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Nuvelle drama API failed with ${response.status}`);
  }
  return (await response.json()) as PublicDramaDetail;
}

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, "");
}
