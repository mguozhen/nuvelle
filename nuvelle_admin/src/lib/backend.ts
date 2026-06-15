import type { PromoRequest, VoteRecord } from "@/types/drama";

export const DEFAULT_BACKEND_URL = "http://localhost:8799";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

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

  constructor(baseUrl = DEFAULT_BACKEND_URL, fetcher: FetchLike = fetch) {
    this.baseUrl = normalizeBackendUrl(baseUrl);
    this.fetcher = fetcher;
  }

  health<T = unknown>(): Promise<T> {
    return this.request<T>("/health");
  }

  getVotes<T = unknown>(): Promise<T> {
    return this.request<T>("/votes");
  }

  postVote(vote: VoteRecord): Promise<unknown> {
    return this.request("/vote", {
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
    return this.request<T>("/gen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
  }

  getJob<T = unknown>(jobId: string): Promise<T> {
    return this.request<T>(`/job?id=${encodeURIComponent(jobId)}`);
  }

  generateBatch<T = unknown>(payload: { items: PromoRequest[]; prompt?: string }): Promise<T> {
    return this.request<T>("/gen-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  getBatch<T = unknown>(batchId: string): Promise<T> {
    return this.request<T>(`/batch?id=${encodeURIComponent(batchId)}`);
  }

  downloadBatch<T = unknown>(batchId: string): Promise<T> {
    return this.request<T>(`/batch-download?id=${encodeURIComponent(batchId)}`);
  }

  getRsVideo<T = unknown>(bookId: string | number, episode?: string | number): Promise<T> {
    const params = new URLSearchParams({ book_id: String(bookId) });

    if (episode !== undefined) {
      params.set("ep", String(episode));
    }

    return this.request<T>(`/rs-video?${params.toString()}`);
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
