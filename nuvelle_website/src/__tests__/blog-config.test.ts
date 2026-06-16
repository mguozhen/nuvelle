import { describe, expect, it } from "vitest";
import { createBlogConfig, parseCategoryIds } from "../lib/blog/config";

describe("blog config", () => {
  it("parses category ids and filters invalid values", () => {
    expect(parseCategoryIds("1, 2, x, 0, 7")).toEqual([1, 2, 7]);
    expect(parseCategoryIds("")).toEqual([]);
    expect(parseCategoryIds(undefined)).toEqual([]);
  });

  it("uses nuvelle defaults and env overrides", () => {
    const defaultConfig = createBlogConfig({});

    expect(defaultConfig.slxHost).toBe("https://apps.voc.ai");
    expect(defaultConfig.siteKey).toBe("nuvelle.ai");
    expect(defaultConfig.pageSize).toBe(12);
    expect(defaultConfig.siteOrigin).toBe("https://nuvelle.ai");
    expect(defaultConfig.categoryIdsByLocale.en).toEqual([]);

    const config = createBlogConfig({
      BLOG_SLX_HOST: "https://blog.example.com",
      BLOG_SITE_KEY: "custom.example",
      BLOG_PAGE_SIZE: "24",
      NEXT_PUBLIC_SITE_ORIGIN: "https://example.com",
      BLOG_CATEGORY_IDS_EN: "1,2",
      BLOG_CATEGORY_IDS_CN: "3"
    });

    expect(config.slxHost).toBe("https://blog.example.com");
    expect(config.siteKey).toBe("custom.example");
    expect(config.pageSize).toBe(24);
    expect(config.siteOrigin).toBe("https://example.com");
    expect(config.categoryIdsByLocale.en).toEqual([1, 2]);
    expect(config.categoryIdsByLocale.cn).toEqual([3]);
    expect(config.categoryIdsByLocale.jp).toEqual([]);
  });
});
