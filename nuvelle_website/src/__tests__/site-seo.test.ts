import { describe, expect, it } from "vitest";
import { generateHomeMetadata, homePath, siteImageUrl, siteUrl } from "../lib/site/seo";

describe("site seo", () => {
  it("builds canonical root-domain URLs and social metadata for localized home pages", () => {
    expect(siteUrl("/cn")).toBe("https://nuvelle.ai/cn");
    expect(siteImageUrl("/posters/_lead.jpg")).toBe("https://nuvelle.ai/posters/_lead.jpg");

    const metadata = generateHomeMetadata("cn");

    expect(metadata).toMatchObject({
      title: "Nuvelle AI Short Dramas - Watch Vertical Series Online",
      description:
        "Watch Nuvelle AI short dramas across romance, revenge, werewolf, billionaire, and hidden identity story worlds. Discover vertical series made for fast mobile viewing.",
      alternates: {
        canonical: "https://nuvelle.ai/cn",
        languages: {
          en: "https://nuvelle.ai/",
          "zh-CN": "https://nuvelle.ai/cn",
          "x-default": "https://nuvelle.ai/"
        }
      },
      openGraph: {
        url: "https://nuvelle.ai/cn",
        images: [
          {
            url: "https://nuvelle.ai/posters/_lead.jpg",
            width: 1200,
            height: 630,
            alt: "Nuvelle AI short drama posters"
          }
        ]
      },
      twitter: {
        card: "summary_large_image",
        images: ["https://nuvelle.ai/posters/_lead.jpg"]
      }
    });
  });

  it("keeps the English home route at the root", () => {
    expect(homePath("en")).toBe("/");
    expect(homePath("pt")).toBe("/pt");
  });
});
