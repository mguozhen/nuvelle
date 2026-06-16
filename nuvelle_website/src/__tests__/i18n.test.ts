import { describe, expect, it } from "vitest";
import {
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
    expect(websiteCopy.en.nav.blog).toBe("Blog");
    expect(websiteCopy.cn.nav.blog).toBe("博客");
    expect(websiteCopy.jp.search.placeholder).toContain("検索");
  });
});
