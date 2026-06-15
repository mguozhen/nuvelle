import type { PromoRequest, VoteRecord } from "@/types/drama";

export const DEFAULT_BACKEND_URL =
  import.meta.env.VITE_NUVELLE_API_URL || import.meta.env.VITE_NUVELLE_BACKEND_URL || "http://localhost:8000/api/v1";
export const LEGACY_PROMO_BACKEND_URL = "http://localhost:8799";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const defaultFetch: FetchLike = (input, init) => fetch(input, init);

export function normalizeBackendUrl(url: string): string {
  const trimmed = url.trim();

  if (!trimmed) {
    return DEFAULT_BACKEND_URL;
  }

  return trimmed.replace(/\/+$/g, "");
}

export class PromoBackendClient {
  private readonly baseUrl: string;

  private readonly fetcher: FetchLike;

  constructor(baseUrl = DEFAULT_BACKEND_URL, fetcher: FetchLike = defaultFetch) {
    this.baseUrl = normalizeBackendUrl(baseUrl);
    this.fetcher = fetcher;
  }

  health<T = unknown>(): Promise<T> {
    return this.request<T>("/health/live");
  }

  getVotes<T = unknown>(): Promise<T> {
    return this.request<T>("/votes");
  }

  postVote(vote: VoteRecord): Promise<unknown> {
    return this.request("/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drama_id: vote.dramaId,
        verdict: vote.verdict,
        score: vote.score
      })
    });
  }

  generatePromo<T = unknown>(request: PromoRequest): Promise<T> {
    return this.request<T>("/promo/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...request,
        video_url: request.url,
        cover_url: request.cover_image
      })
    });
  }

  getJob<T = unknown>(jobId: string): Promise<T> {
    return this.request<T>(`/promo/jobs/${encodeURIComponent(jobId)}`);
  }

  generateBatch<T = unknown>(payload: { items: PromoRequest[]; prompt?: string }): Promise<T> {
    const firstItem = payload.items[0];
    const episodes = Object.fromEntries(payload.items.map((item) => [String(item.ep), item.url]));

    return this.request<T>("/promo/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        title: firstItem?.title || "Promo",
        dur: firstItem?.dur || 30,
        cover_url: firstItem?.cover_image || "",
        episodes
      })
    });
  }

  getBatch<T = unknown>(batchId: string): Promise<T> {
    return this.request<T>(`/promo/batches/${encodeURIComponent(batchId)}`);
  }

  downloadBatch<T = unknown>(batchId: string): Promise<T> {
    return this.request<T>(`/promo/batches/${encodeURIComponent(batchId)}/download`);
  }

  getRsVideo<T = unknown>(bookId: string | number, episode?: string | number): Promise<T> {
    const params = new URLSearchParams({ book_id: String(bookId) });

    if (episode !== undefined) {
      params.set("ep", String(episode));
    }

    return this.request<T>(`/dramas/rs-video?${params.toString()}`);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, init);
    const text = await response.text();

    if (!response.ok) {
      throw new Error(text || `Request failed with ${response.status}`);
    }

    if (!text) {
      return null as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }
}
