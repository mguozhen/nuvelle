import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createBlogConfig } from "../lib/blog/config";

describe("blog config", () => {
  it("uses Blogger defaults and env overrides", () => {
    const defaultConfig = createBlogConfig({});

    expect(defaultConfig.apiUrl).toBe("");
    expect(defaultConfig.accessKey).toBe("");
    expect(defaultConfig.siteSlug).toBe("");
    expect(defaultConfig.pageSize).toBe(12);
    expect(defaultConfig.siteOrigin).toBe("https://nuvelle.ai");
    expect(defaultConfig.languageByLocale.en).toBe("en");
    expect(defaultConfig.languageByLocale.cn).toBe("en");

    const config = createBlogConfig({
      BLOGGER_API_URL: "https://blogger.example.com/",
      BLOGGER_ACCESS_KEY: "blog_sk_test",
      BLOGGER_SITE_SLUG: "nuvelle",
      BLOGGER_LANGUAGE: "en",
      BLOGGER_LANGUAGE_CN: "zh-Hans",
      BLOG_PAGE_SIZE: "24",
      NEXT_PUBLIC_SITE_ORIGIN: "https://example.com"
    });

    expect(config.apiUrl).toBe("https://blogger.example.com");
    expect(config.accessKey).toBe("blog_sk_test");
    expect(config.siteSlug).toBe("nuvelle");
    expect(config.pageSize).toBe(24);
    expect(config.siteOrigin).toBe("https://example.com");
    expect(config.languageByLocale.en).toBe("en");
    expect(config.languageByLocale.cn).toBe("zh-Hans");
    expect(config.languageByLocale.jp).toBe("en");
  });

  it("documents the Nuvelle Blogger site slug in runtime examples", () => {
    const rootEnvExample = readFileSync(resolve(process.cwd(), "../.env.example"), "utf8");
    const deployScript = readFileSync(resolve(process.cwd(), "../deploy/google-cloud.sh"), "utf8");
    const deployReadme = readFileSync(resolve(process.cwd(), "../deploy/README-google-cloud.md"), "utf8");

    expect(rootEnvExample).toContain("BLOGGER_SITE_SLUG=nuvelle");
    expect(deployScript).toContain("BLOGGER_SITE_SLUG=${BLOGGER_SITE_SLUG:-nuvelle}");
    expect(deployReadme).toContain("BLOGGER_SITE_SLUG=nuvelle");
    expect(`${rootEnvExample}\n${deployScript}\n${deployReadme}`).not.toContain("BLOGGER_SITE_SLUG=bai-du");
  });
});
