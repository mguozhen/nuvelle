import { describe, expect, it } from "vitest";
import { bannerItems, getDramaBySlug, rows, searchDramas, statForDrama, top10 } from "../data/dramas";

const expectedTop10 = [
  "ceo_secret_wife",
  "mafia_wife",
  "reborn_obsession",
  "divorce_queen",
  "rejected_alpha",
  "midnight_stranger",
  "faked_death",
  "secret_prince",
  "heiress_disguise",
  "cinderella_ceo"
];

describe("website drama data", () => {
  it("keeps the current hero and ranking data", () => {
    expect(getDramaBySlug("ceo_secret_wife")?.title).toBe("The CEO's Secret Wife");
    expect(top10).toEqual(expectedTop10);
    expect(bannerItems).toEqual([
      { slug: "ceo_secret_wife", badge: "● #1 Trending Now" },
      { slug: "mafia_wife", badge: "● Editors' Pick" },
      { slug: "reborn_obsession", badge: "● New & Hot" },
      { slug: "rejected_alpha", badge: "● Fan Favorite" },
      { slug: "midnight_stranger", badge: "● Just Added" }
    ]);
  });

  it("searches title, genre, and synopsis", () => {
    expect(searchDramas("mafia").map((drama) => drama.slug)).toContain("mafia_wife");
    expect(searchDramas("werewolf").length).toBeGreaterThan(0);
    expect(searchDramas("billionaire").length).toBeGreaterThan(0);
  });

  it("keeps the current row groups", () => {
    expect(rows).toEqual({
      "New Releases": [
        "ceo_secret_wife",
        "reborn_obsession",
        "midnight_stranger",
        "divorce_queen",
        "mafia_wife",
        "secret_prince",
        "cinderella_ceo"
      ],
      "Hidden Identity": [
        "ceo_secret_wife",
        "heiress_disguise",
        "fake_heiress",
        "runaway_bride",
        "maid_mansion",
        "twin_swap"
      ],
      "Magic & Mates": ["rejected_alpha", "returning_luna", "alpha_bodyguard", "mafia_wife"],
      "Love at First Sight": [
        "midnight_stranger",
        "runaway_bride",
        "nanny_single_dad",
        "secret_prince",
        "amnesia_love",
        "cinderella_ceo"
      ],
      "Revenge & Reversal": [
        "faked_death",
        "sister_stole_life",
        "divorce_queen",
        "returning_luna",
        "twin_swap",
        "maid_mansion"
      ],
      "Second Chance": ["reborn_obsession", "faked_death", "maid_mansion", "nanny_single_dad", "amnesia_love"]
    });
  });

  it("generates stable display stats", () => {
    expect(statForDrama("ceo_secret_wife").views).toMatch(/M$/);
    expect(Number(statForDrama("ceo_secret_wife").rating)).toBeGreaterThanOrEqual(4.5);
  });
});
