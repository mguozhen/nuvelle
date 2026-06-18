import type {
  AdminDramaListResponse,
  AuthResponse,
  DramaEventRequest,
  DramaRecord,
  GeneratedListResponse,
  LoginRequest,
  PromoRequest,
  RegisterRequest,
  VoteRecord
} from "@/types/drama";

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

  private readonly token?: string;

  constructor(baseUrl = DEFAULT_BACKEND_URL, fetcher: FetchLike = defaultFetch, token?: string) {
    this.baseUrl = normalizeBackendUrl(baseUrl);
    this.fetcher = fetcher;
    this.token = token;
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

  register(payload: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/register", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload)
    });
  }

  login(payload: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload)
    });
  }

  me(): Promise<AuthResponse["user"]> {
    return this.request<AuthResponse["user"]>("/auth/me", {
      headers: this.headers(false)
    });
  }

  listAdminDramas(params: {
    q?: string;
    platform?: string;
    language?: string;
    tag?: string;
    has_video?: boolean;
    min_score?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<AdminDramaListResponse> {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.platform) query.set("platform", params.platform);
    if (params.language) query.set("language", params.language);
    if (params.tag) query.set("tag", params.tag);
    if (params.has_video !== undefined) query.set("has_video", String(params.has_video));
    if (params.min_score !== undefined) query.set("min_score", String(params.min_score));
    query.set("limit", String(params.limit ?? 50));
    query.set("offset", String(params.offset ?? 0));
    return this.request<AdminDramaListResponse>(`/admin/dramas?${query.toString()}`, {
      headers: this.headers(false)
    });
  }

  getAdminDrama(id: string | number): Promise<DramaRecord> {
    return this.request<DramaRecord>(`/admin/dramas/${encodeURIComponent(String(id))}`, {
      headers: this.headers(false)
    });
  }

  swipeNext(): Promise<DramaRecord> {
    return this.request<DramaRecord>("/admin/swipe/next", {
      headers: this.headers(false)
    });
  }

  postDramaEvent(payload: DramaEventRequest): Promise<unknown> {
    return this.request("/admin/drama-events", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload)
    });
  }

  listGenerated(params: { status?: string; q?: string; limit?: number; offset?: number } = {}): Promise<GeneratedListResponse> {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.q) query.set("q", params.q);
    query.set("limit", String(params.limit ?? 50));
    query.set("offset", String(params.offset ?? 0));
    return this.request<GeneratedListResponse>(`/admin/generated?${query.toString()}`, {
      headers: this.headers(false)
    });
  }

  generatePromo<T = unknown>(request: PromoRequest): Promise<T> {
    return this.request<T>("/promo/jobs", {
      method: "POST",
      headers: this.headers(),
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

  private headers(json = true): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    if (json) {
      headers["Content-Type"] = "application/json";
    }
    return headers;
  }
}
