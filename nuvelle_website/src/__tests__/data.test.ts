import { describe, expect, it } from "vitest";
import { bannerItems, getDramaBySlug, rows, searchDramas, statForDrama, top10 } from "../data/dramas";

describe("website drama data", () => {
  it("keeps the current hero and ranking data", () => {
    expect(getDramaBySlug("ceo_secret_wife")?.title).toBe("The CEO's Secret Wife");
    expect(top10[0]).toBe("ceo_secret_wife");
    expect(bannerItems.map((item) => item.slug)).toContain("ceo_secret_wife");
  });

  it("searches title, genre, and synopsis", () => {
    expect(searchDramas("mafia").map((drama) => drama.slug)).toContain("mafia_wife");
    expect(searchDramas("werewolf").length).toBeGreaterThan(0);
    expect(searchDramas("billionaire").length).toBeGreaterThan(0);
  });

  it("keeps the current row groups", () => {
    expect(Object.keys(rows)).toEqual([
      "New Releases",
      "Hidden Identity",
      "Magic & Mates",
      "Love at First Sight",
      "Revenge & Reversal",
      "Second Chance"
    ]);
  });

  it("generates stable display stats", () => {
    expect(statForDrama("ceo_secret_wife").views).toMatch(/M$/);
    expect(Number(statForDrama("ceo_secret_wife").rating)).toBeGreaterThanOrEqual(4.5);
  });
});
