import { describe, expect, it } from "vitest";
import { siteRedirectUrl } from "../lib/site/redirects";

describe("site redirects", () => {
  it("redirects www.nuvelle.ai requests to the canonical root domain", () => {
    expect(siteRedirectUrl(new URL("https://www.nuvelle.ai/blog?x=1"))).toBe(
      "https://nuvelle.ai/blog?x=1"
    );
    expect(siteRedirectUrl(new URL("http://localhost:48080/blog?x=1"), { host: "www.nuvelle.ai:48080" })).toBe(
      "https://nuvelle.ai:48080/blog?x=1"
    );
  });

  it("redirects legacy PNG poster URLs to compressed JPG assets", () => {
    expect(siteRedirectUrl(new URL("https://nuvelle.ai/posters/runaway_bride.png"))).toBe(
      "https://nuvelle.ai/posters/runaway_bride.jpg"
    );
  });

  it("redirects canonical HTTP traffic to HTTPS when the proxy receives it", () => {
    expect(siteRedirectUrl(new URL("http://nuvelle.ai/blog"))).toBe("https://nuvelle.ai/blog");
    expect(siteRedirectUrl(new URL("https://nuvelle.ai/blog"), { forwardedProto: "http" })).toBe(
      "https://nuvelle.ai/blog"
    );
    expect(
      siteRedirectUrl(new URL("http://0.0.0.0:48080/blog"), {
        forwardedProto: "http",
        host: "nuvelle.ai"
      })
    ).toBe("https://nuvelle.ai:48080/blog");
  });

  it("combines www and legacy poster redirects in one canonical URL", () => {
    expect(siteRedirectUrl(new URL("http://www.nuvelle.ai/posters/_lead.png?x=1"))).toBe(
      "https://nuvelle.ai/posters/_lead.jpg?x=1"
    );
  });

  it("does not redirect canonical or preview hosts", () => {
    expect(siteRedirectUrl(new URL("https://nuvelle.ai/blog"))).toBeNull();
    expect(siteRedirectUrl(new URL("http://localhost:48080/blog"))).toBeNull();
    expect(siteRedirectUrl(new URL("https://nuvelle-website.run.app/blog"))).toBeNull();
  });
});
