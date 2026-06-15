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

  it("posts votes to the configured backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    const client = new PromoBackendClient("http://localhost:8000/api/v1", fetchMock);
    await client.postVote({ dramaId: 7, verdict: "fire", score: 82 });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/v1/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drama_id: 7, verdict: "fire", score: 82 })
    });
  });

  it("creates promo generation requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, id: "job-1" })));
    const client = new PromoBackendClient("http://localhost:8000/api/v1", fetchMock);
    const result = await client.generatePromo({
      url: "https://cdn.example/video.m3u8",
      title: "Demo",
      ep: 1,
      dur: 30,
      beats: [1.2, 3.4],
      prompt: "angrier hook",
      cover_image: "https://cdn.example/cover.jpg"
    });
    expect(result).toEqual({ ok: true, id: "job-1" });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/v1/promo/jobs", expect.any(Object));
  });
});
