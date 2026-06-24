import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BACKEND_URL, PromoBackendClient, normalizeBackendUrl } from "../lib/backend";

describe("admin backend client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes backend URLs", () => {
    expect(DEFAULT_BACKEND_URL).toBe("http://localhost:8000/api/v1");
    expect(normalizeBackendUrl("https://example.com/")).toBe("https://example.com");
    expect(normalizeBackendUrl("  http://localhost:8000/api/v1/// ")).toBe("http://localhost:8000/api/v1");
  });

  it("authenticates and stores bearer tokens on API requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    const client = new PromoBackendClient("http://localhost:8000/api/v1", fetchMock, "token-1");
    await client.postDramaEvent({ drama_id: 7, event_type: "vote", verdict: "fire", score: 82 });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/v1/admin/drama-events", {
      method: "POST",
      headers: { Authorization: "Bearer token-1", "Content-Type": "application/json" },
      body: JSON.stringify({ drama_id: 7, event_type: "vote", verdict: "fire", score: 82 })
    });
  });

  it("loads admin dramas with query parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [], total: 0 })));
    const client = new PromoBackendClient("http://localhost:8000/api/v1", fetchMock, "token-1");
    await client.listAdminDramas({ q: "bride", language: "English", tag: "Female", has_video: true, min_score: 70 });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/admin/dramas?q=bride&language=English&tag=Female&has_video=true&min_score=70&limit=50&offset=0",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-1" }) })
    );
  });

  it("loads admin drama filter options", async () => {
    const filters = { platforms: ["ReelShort"], languages: ["English", "Spanish"], tags: ["Female"] };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(filters)));
    const client = new PromoBackendClient("http://localhost:8000/api/v1", fetchMock, "token-1");
    await expect(client.getAdminDramaFilters()).resolves.toEqual(filters);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/admin/dramas/filters",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-1" }) })
    );
  });

  it("requests signed video download URLs with bearer tokens", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ url: "https://storage.example/signed-video" }))));
    const client = new PromoBackendClient("http://localhost:8000/api/v1", fetchMock, "token-1");

    await expect(client.getAdminEpisodeDownloadUrl(1, 10)).resolves.toEqual({ url: "https://storage.example/signed-video" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/admin/dramas/1/episodes/10/download-url",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-1" }) })
    );

    await client.getPromoJobFileDownloadUrl("job-1", "teaser.mp4");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/promo/jobs/job-1/files/teaser.mp4/download-url",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-1" }) })
    );
  });

  it("creates promo generation requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, id: "job-1" })));
    const client = new PromoBackendClient("http://localhost:8000/api/v1", fetchMock, "token-1");
    const result = await client.generatePromo({
      url: "https://cdn.example/video.m3u8",
      title: "Demo",
      ep: 1,
      dur: 30,
      beats: [1.2, 3.4],
      prompt: "angrier hook",
      cover_image: "https://cdn.example/cover.jpg",
      drama_id: 1,
      episode_id: 10
    });
    expect(result).toEqual({ ok: true, id: "job-1" });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/v1/promo/jobs", expect.any(Object));
  });
});
