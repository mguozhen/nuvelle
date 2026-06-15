import { describe, expect, it } from "vitest";
import { nuvelleScore, tasteScore } from "../lib/scoring";
import type { DramaRecord } from "../types/drama";

const drama: DramaRecord = {
  id: 1,
  title: "Demo",
  platform: "ReelShort",
  genre: "Hidden Identity",
  cover_image_url: "",
  video_url: "https://cdn.example/video.m3u8",
  episode_count: 12,
  signal: "revenue $1,000,000 | 12,000 promoters",
  synopsis_or_hook: "A secret billionaire revenge story"
};

describe("admin scoring", () => {
  it("scores high-signal dramas above low-signal dramas", () => {
    expect(nuvelleScore(drama)).toBeGreaterThan(70);
    expect(nuvelleScore({ ...drama, signal: "revenue $2,000 | 1,000 promoters" })).toBeLessThan(
      nuvelleScore(drama)
    );
  });

  it("detects taste tags from text", () => {
    expect(tasteScore(drama).tags).toContain("revenue");
    expect(tasteScore(drama).tags).toContain("hidden identity");
  });
});
