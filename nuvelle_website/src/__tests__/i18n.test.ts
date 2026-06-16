import { describe, expect, it } from "vitest";
import {
  categoryRowKeys,
  getLocaleByRouteParam,
  homePathForLocale,
  isLocaleKey,
  localeOptions,
  websiteCopy
} from "../lib/i18n";

describe("website i18n model", () => {
  it("maps supported route prefixes and html languages", () => {
    expect(localeOptions.map((locale) => locale.key)).toEqual(["en", "cn", "jp", "de", "fr", "es", "pt"]);
    expect(localeOptions.map((locale) => locale.prefix)).toEqual(["", "/cn", "/jp", "/de", "/fr", "/es", "/pt"]);
    expect(localeOptions.map((locale) => locale.htmlLang)).toEqual(["en", "zh", "ja", "de", "fr", "es", "pt"]);
  });

  it("resolves route params safely", () => {
    expect(getLocaleByRouteParam(undefined).key).toBe("en");
    expect(getLocaleByRouteParam("cn").htmlLang).toBe("zh");
    expect(getLocaleByRouteParam("pt").hrefLang).toBe("pt-PT");
    expect(getLocaleByRouteParam("bad")).toBeNull();
    expect(isLocaleKey("jp")).toBe(true);
    expect(isLocaleKey("bad")).toBe(false);
  });

  it("builds home paths and exposes localized navigation copy", () => {
    expect(homePathForLocale("en")).toBe("/");
    expect(homePathForLocale("fr")).toBe("/fr");
    expect(websiteCopy.en.homeAriaLabel).toBe("Nuvelle home");
    expect(websiteCopy.en.nav.blog).toBe("Blog");
    expect(websiteCopy.cn.nav.blog).toBe("博客");
    expect(websiteCopy.jp.search.placeholder).toContain("検索");
  });

  it("exposes localized home row and footer copy for every locale", () => {
    for (const locale of localeOptions) {
      const copy = websiteCopy[locale.key];
      expect(Object.keys(copy.rowTitles)).toEqual([...categoryRowKeys]);
      expect(copy.footerLinks).toHaveLength(3);
      expect(copy.footerLinks.every((group) => group.heading && group.links.length > 0)).toBe(true);
    }

    expect(websiteCopy.cn.rowTitles["Hidden Identity"]).toBe("隐藏身份");
    expect(websiteCopy.cn.footerLinks[1]).toEqual({
      heading: "公司",
      links: ["关于 Nuvelle", "招贤纳士", "媒体报道", "联系我们"]
    });
  });
});
