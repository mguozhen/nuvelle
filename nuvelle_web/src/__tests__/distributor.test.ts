import { describe, expect, it } from "vitest";
import { distributorCode, promoLink } from "../lib/distributor";

describe("distributor helpers", () => {
  it("keeps deterministic Nuvelle Boost codes", () => {
    expect(distributorCode("creator@example.com")).toMatch(/^NB[A-Z0-9]+$/);
    expect(distributorCode("creator@example.com")).toBe(distributorCode("creator@example.com"));
  });

  it("builds existing promo links", () => {
    expect(promoLink("ceo_secret_wife", "NB123")).toBe("https://nuvelle.ai/d/ceo_secret_wife?ref=NB123");
  });
});
