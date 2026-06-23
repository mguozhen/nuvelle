import { describe, expect, it, vi } from "vitest";
import { fetchDramaDetail } from "../lib/dramas/api";

describe("drama api adapter", () => {
  it("fetches public drama detail from Nuvelle API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 42,
        title: "Playable Drama",
        platform: "ReelShort",
        genre: "Romance",
        cover_image_url: "https://cdn.nuvelle.ai/cover.jpg",
        video_url: "https://cdn.nuvelle.ai/videos/reelshort/42/episodes/0001.mp4",
        source_url: "https://reelslink.com/cps/example",
        episode_count: 2,
        synopsis_or_hook: "A stable playback test.",
        signal: null,
        rs_book_id: "book-42",
        created_at: "2026-06-23T00:00:00Z",
        updated_at: "2026-06-23T00:00:00Z",
        language: "English",
        episodes: [
          {
            id: 1,
            episode_no: 1,
            play_url: "https://cdn.nuvelle.ai/videos/reelshort/42/episodes/0001.mp4",
            poster_url: null,
            video_transfer_status: "transferred"
          }
        ]
      })
    });

    const drama = await fetchDramaDetail(42, {
      apiUrl: "https://api.nuvelle.ai/api/v1",
      fetcher: fetchMock as unknown as typeof fetch
    });

    expect(fetchMock).toHaveBeenCalledWith("https://api.nuvelle.ai/api/v1/dramas/42", {
      cache: "no-store"
    });
    expect(drama?.title).toBe("Playable Drama");
    expect(drama?.episodes[0]?.play_url).toBe("https://cdn.nuvelle.ai/videos/reelshort/42/episodes/0001.mp4");
  });

  it("returns null when the api base url is missing", async () => {
    const fetchMock = vi.fn();

    const drama = await fetchDramaDetail(42, {
      apiUrl: "",
      fetcher: fetchMock as unknown as typeof fetch
    });

    expect(drama).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
