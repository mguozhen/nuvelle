import { beforeEach, describe, expect, it } from "vitest";
import { getSavedDramas, isSavedDrama, toggleSavedDrama } from "../lib/my-list";

describe("mobile My List storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("uses the existing localStorage key", () => {
    toggleSavedDrama("ceo_secret_wife");
    expect(JSON.parse(localStorage.getItem("nuvelle_list") || "[]")).toEqual(["ceo_secret_wife"]);
  });

  it("toggles saved dramas", () => {
    expect(isSavedDrama("mafia_wife")).toBe(false);
    expect(toggleSavedDrama("mafia_wife")).toEqual(["mafia_wife"]);
    expect(isSavedDrama("mafia_wife")).toBe(true);
    expect(toggleSavedDrama("mafia_wife")).toEqual([]);
    expect(getSavedDramas()).toEqual([]);
  });
});
