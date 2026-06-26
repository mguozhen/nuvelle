import { describe, expect, it } from "vitest";
import sitemap from "../../app/sitemap";
import robots from "../../app/robots";

describe("metadata routes", () => {
  it("lists indexable home and blog locale routes in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain("https://nuvelle.ai/");
    expect(urls).toContain("https://nuvelle.ai/cn");
    expect(urls).toContain("https://nuvelle.ai/blog");
    expect(urls).toContain("https://nuvelle.ai/cn/blog");
    expect(urls).not.toContain("https://www.nuvelle.ai/");
  });

  it("points robots.txt at the generated sitemap", () => {
    expect(robots()).toMatchObject({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/blog/search", "/cn/blog/search", "/jp/blog/search", "/de/blog/search", "/fr/blog/search", "/es/blog/search", "/pt/blog/search"]
      },
      sitemap: "https://nuvelle.ai/sitemap.xml",
      host: "https://nuvelle.ai"
    });
  });
});
