# Nuvelle Multilingual Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add locale-aware Nuvelle website routes and SSR blog list/category/search/detail pages backed by the VOC/Shulex blog API.

**Architecture:** Keep the current Nuvelle visual system and drama catalog, but move the interactive home page into a reusable client component that receives locale copy. Add focused server-side blog modules for config, URL building, API mapping, HTML sanitization, and SEO JSON-LD. Replace the website static export deployment path with a Next SSR Cloud Run service while keeping the other frontends static.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library, Cloud Run, pnpm workspaces.

---

## File Structure

- Create: `nuvelle_website/src/lib/i18n.ts` - locale definitions, route prefixes, text dictionary, and locale helpers.
- Create: `nuvelle_website/src/components/website-home.tsx` - client component containing the current home page interaction, parameterized by locale copy.
- Modify: `nuvelle_website/src/components/app-band.tsx` - accept localized CTA copy.
- Modify: `nuvelle_website/src/components/drama-card.tsx` - accept localized accessibility copy where needed.
- Modify: `nuvelle_website/src/components/drama-modal.tsx` - accept localized modal copy.
- Delete/replace: `nuvelle_website/app/layout.tsx` - move root layouts into route groups so `<html lang>` can differ by locale.
- Move/replace: `nuvelle_website/app/page.tsx` to `nuvelle_website/app/(en)/page.tsx` - English root page.
- Create: `nuvelle_website/app/(en)/layout.tsx` - English root layout.
- Create: `nuvelle_website/app/[locale]/layout.tsx` - localized root layout.
- Create: `nuvelle_website/app/[locale]/page.tsx` - localized home page.
- Create: `nuvelle_website/src/lib/blog/config.ts` - server-side blog API and environment config.
- Create: `nuvelle_website/src/lib/blog/urls.ts` - canonical, relative, search, category, and hreflang URL builder.
- Create: `nuvelle_website/src/lib/blog/types.ts` - backend DTOs and frontend blog models.
- Create: `nuvelle_website/src/lib/blog/api.ts` - server-side API calls and response adapters.
- Create: `nuvelle_website/src/lib/blog/sanitize.ts` - small HTML sanitizer for backend article content.
- Create: `nuvelle_website/src/lib/blog/seo.ts` - metadata helpers and JSON-LD builders.
- Create: `nuvelle_website/src/components/blog/blog-shell.tsx` - blog page chrome, search form, and layout.
- Create: `nuvelle_website/src/components/blog/blog-list-page.tsx` - SSR list/category/search renderer.
- Create: `nuvelle_website/src/components/blog/blog-article-card.tsx` - article card component.
- Create: `nuvelle_website/src/components/blog/blog-article-page.tsx` - article detail renderer.
- Create: `nuvelle_website/src/components/blog/blog-breadcrumbs.tsx` - visible breadcrumbs.
- Create: `nuvelle_website/app/(en)/blog/page.tsx` - English blog list.
- Create: `nuvelle_website/app/(en)/blog/category/[slug]/page.tsx` - English category list.
- Create: `nuvelle_website/app/(en)/blog/search/page.tsx` - English SSR search.
- Create: `nuvelle_website/app/(en)/blog/[slug]/page.tsx` - English article detail.
- Create: `nuvelle_website/app/[locale]/blog/page.tsx` - localized blog list.
- Create: `nuvelle_website/app/[locale]/blog/category/[slug]/page.tsx` - localized category list.
- Create: `nuvelle_website/app/[locale]/blog/search/page.tsx` - localized SSR search.
- Create: `nuvelle_website/app/[locale]/blog/[slug]/page.tsx` - localized article detail.
- Modify: `nuvelle_website/app/globals.css` - add article typography and blog layout utilities.
- Modify: `nuvelle_website/next.config.mjs` - remove static export.
- Modify: `nuvelle_website/package.json` - add `start` script.
- Create: `deploy/Dockerfile.website` - Next SSR runtime image for Cloud Run.
- Create: `deploy/cloudbuild-website.yaml` - Cloud Build config for the website SSR image.
- Modify: `deploy/google-cloud.sh` - deploy website through Next SSR image and keep mobile/web/admin static.
- Modify: `deploy/README-google-cloud.md` - document website SSR service and blog environment variables.
- Modify: `nuvelle_website/src/__tests__/page.test.tsx` - point home tests at `WebsiteHome`.
- Create: `nuvelle_website/src/__tests__/i18n.test.ts`.
- Create: `nuvelle_website/src/__tests__/blog-config.test.ts`.
- Create: `nuvelle_website/src/__tests__/blog-urls.test.ts`.
- Create: `nuvelle_website/src/__tests__/blog-sanitize.test.ts`.
- Create: `nuvelle_website/src/__tests__/blog-api.test.ts`.

---

### Task 1: Add Locale Model and Tests

**Files:**
- Create: `nuvelle_website/src/lib/i18n.ts`
- Create: `nuvelle_website/src/__tests__/i18n.test.ts`

- [ ] **Step 1: Write failing locale tests**

Create `nuvelle_website/src/__tests__/i18n.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter nuvelle_website test --run src/__tests__/i18n.test.ts
```

Expected: FAIL because `src/lib/i18n.ts` does not exist.

- [ ] **Step 3: Implement locale model**

Create `nuvelle_website/src/lib/i18n.ts`:

```ts
export type LocaleKey = "en" | "cn" | "jp" | "de" | "fr" | "es" | "pt";

export type LocaleOption = {
  key: LocaleKey;
  label: string;
  nativeLabel: string;
  prefix: string;
  htmlLang: string;
  hrefLang: string;
};

export const localeOptions: LocaleOption[] = [
  { key: "en", label: "English", nativeLabel: "English", prefix: "", htmlLang: "en", hrefLang: "en" },
  { key: "cn", label: "Chinese", nativeLabel: "中文", prefix: "/cn", htmlLang: "zh", hrefLang: "zh-CN" },
  { key: "jp", label: "Japanese", nativeLabel: "日本語", prefix: "/jp", htmlLang: "ja", hrefLang: "ja-JP" },
  { key: "de", label: "German", nativeLabel: "Deutsch", prefix: "/de", htmlLang: "de", hrefLang: "de-DE" },
  { key: "fr", label: "French", nativeLabel: "Français", prefix: "/fr", htmlLang: "fr", hrefLang: "fr-FR" },
  { key: "es", label: "Spanish", nativeLabel: "Español", prefix: "/es", htmlLang: "es", hrefLang: "es-ES" },
  { key: "pt", label: "Portuguese", nativeLabel: "Português", prefix: "/pt", htmlLang: "pt", hrefLang: "pt-PT" }
];

export const localeKeys = localeOptions.map((locale) => locale.key) as LocaleKey[];

const localeByKey = new Map(localeOptions.map((locale) => [locale.key, locale]));

export function isLocaleKey(value: unknown): value is LocaleKey {
  return typeof value === "string" && localeByKey.has(value as LocaleKey);
}

export function getLocale(locale: LocaleKey): LocaleOption {
  return localeByKey.get(locale) ?? localeOptions[0];
}

export function getLocaleByRouteParam(value: string | string[] | undefined): LocaleOption | null {
  if (value === undefined) {
    return getLocale("en");
  }
  if (Array.isArray(value)) {
    return null;
  }
  return isLocaleKey(value) && value !== "en" ? getLocale(value) : null;
}

export function homePathForLocale(locale: LocaleKey) {
  const prefix = getLocale(locale).prefix;
  return prefix || "/";
}

export type WebsiteCopy = {
  nav: {
    home: string;
    categories: string;
    fandom: string;
    creators: string;
    blog: string;
  };
  search: {
    label: string;
    placeholder: string;
    results: string;
    clear: string;
    empty: (query: string) => string;
  };
  hero: {
    getApp: string;
  };
  rows: {
    newReleases: string;
    top10: string;
    secondChance: string;
    viewAll: string;
  };
  appBand: {
    title: string;
    accent: string;
    body: string;
    appStore: string;
    googlePlay: string;
    getApp: string;
  };
  modal: {
    watchEpisode: string;
    getApp: string;
    views: string;
    free: string;
  };
  footer: {
    description: string;
    copyright: string;
    tagline: string;
  };
};

const englishCopy: WebsiteCopy = {
  nav: {
    home: "Home",
    categories: "Categories",
    fandom: "Fandom",
    creators: "Creators",
    blog: "Blog"
  },
  search: {
    label: "Search dramas",
    placeholder: "Search dramas",
    results: "Results",
    clear: "Clear",
    empty: (query) => `No dramas match "${query}".`
  },
  hero: {
    getApp: "Get the App"
  },
  rows: {
    newReleases: "New Releases",
    top10: "Top 10 This Week",
    secondChance: "Second Chance",
    viewAll: "View all"
  },
  appBand: {
    title: "Unlock every episode",
    accent: "free in the app.",
    body: "Binge thousands of premium AI-crafted vertical dramas. New drops daily. Watch offline, get early access, and follow your favorite story worlds.",
    appStore: "App Store",
    googlePlay: "Google Play",
    getApp: "Get the App"
  },
  modal: {
    watchEpisode: "Watch Episode 1",
    getApp: "Get the App",
    views: "views",
    free: "Free"
  },
  footer: {
    description: "The home of AI shorts. Premium vertical dramas, reimagined daily. Every story, reimagined.",
    copyright: "© 2026 Nuvelle, Inc. · nuvelle.ai",
    tagline: "Every story, reimagined."
  }
};

export const websiteCopy: Record<LocaleKey, WebsiteCopy> = {
  en: englishCopy,
  cn: {
    ...englishCopy,
    nav: { home: "首页", categories: "分类", fandom: "粉丝社区", creators: "创作者", blog: "博客" },
    search: {
      label: "搜索短剧",
      placeholder: "搜索短剧",
      results: "搜索结果",
      clear: "清除",
      empty: (query) => `没有找到与"${query}"匹配的短剧。`
    },
    hero: { getApp: "获取 App" },
    rows: { newReleases: "最新上线", top10: "本周 Top 10", secondChance: "第二次机会", viewAll: "查看全部" },
    appBand: {
      title: "解锁全部剧集",
      accent: "在 App 免费观看。",
      body: "畅看大量 AI 短剧。每日上新，支持离线观看，并提前追踪你喜欢的故事世界。",
      appStore: "App Store",
      googlePlay: "Google Play",
      getApp: "获取 App"
    },
    modal: { watchEpisode: "观看第 1 集", getApp: "获取 App", views: "次观看", free: "免费" },
    footer: { ...englishCopy.footer, description: "AI 短剧之家。每日重塑精品竖屏故事。", tagline: "Every story, reimagined." }
  },
  jp: {
    ...englishCopy,
    nav: { home: "ホーム", categories: "カテゴリ", fandom: "ファンダム", creators: "クリエイター", blog: "ブログ" },
    search: {
      label: "ドラマを検索",
      placeholder: "ドラマを検索",
      results: "検索結果",
      clear: "クリア",
      empty: (query) => `"${query}" に一致するドラマはありません。`
    },
    hero: { getApp: "アプリを入手" },
    rows: { newReleases: "新着作品", top10: "今週の Top 10", secondChance: "セカンドチャンス", viewAll: "すべて見る" },
    appBand: { ...englishCopy.appBand, title: "全エピソードを解放", accent: "アプリで無料。" },
    modal: { watchEpisode: "第1話を見る", getApp: "アプリを入手", views: "views", free: "無料" }
  },
  de: {
    ...englishCopy,
    nav: { home: "Home", categories: "Kategorien", fandom: "Fandom", creators: "Creators", blog: "Blog" },
    search: { ...englishCopy.search, placeholder: "Dramen suchen", label: "Dramen suchen" },
    hero: { getApp: "App holen" },
    rows: { newReleases: "Neuheiten", top10: "Top 10 der Woche", secondChance: "Zweite Chance", viewAll: "Alle ansehen" },
    appBand: { ...englishCopy.appBand, title: "Alle Episoden freischalten", accent: "kostenlos in der App." },
    modal: { watchEpisode: "Episode 1 ansehen", getApp: "App holen", views: "Aufrufe", free: "Gratis" }
  },
  fr: {
    ...englishCopy,
    nav: { home: "Accueil", categories: "Catégories", fandom: "Fandom", creators: "Créateurs", blog: "Blog" },
    search: { ...englishCopy.search, placeholder: "Rechercher des séries", label: "Rechercher des séries" },
    hero: { getApp: "Obtenir l'app" },
    rows: { newReleases: "Nouveautés", top10: "Top 10 de la semaine", secondChance: "Seconde chance", viewAll: "Tout voir" },
    appBand: { ...englishCopy.appBand, title: "Débloquez tous les épisodes", accent: "gratuitement dans l'app." },
    modal: { watchEpisode: "Regarder l'épisode 1", getApp: "Obtenir l'app", views: "vues", free: "Gratuit" }
  },
  es: {
    ...englishCopy,
    nav: { home: "Inicio", categories: "Categorías", fandom: "Fandom", creators: "Creadores", blog: "Blog" },
    search: { ...englishCopy.search, placeholder: "Buscar dramas", label: "Buscar dramas" },
    hero: { getApp: "Obtener app" },
    rows: { newReleases: "Estrenos", top10: "Top 10 de la semana", secondChance: "Segunda oportunidad", viewAll: "Ver todo" },
    appBand: { ...englishCopy.appBand, title: "Desbloquea cada episodio", accent: "gratis en la app." },
    modal: { watchEpisode: "Ver episodio 1", getApp: "Obtener app", views: "vistas", free: "Gratis" }
  },
  pt: {
    ...englishCopy,
    nav: { home: "Início", categories: "Categorias", fandom: "Fandom", creators: "Criadores", blog: "Blog" },
    search: { ...englishCopy.search, placeholder: "Buscar dramas", label: "Buscar dramas" },
    hero: { getApp: "Obter app" },
    rows: { newReleases: "Lançamentos", top10: "Top 10 da semana", secondChance: "Segunda chance", viewAll: "Ver tudo" },
    appBand: { ...englishCopy.appBand, title: "Desbloqueie todos os episódios", accent: "grátis no app." },
    modal: { watchEpisode: "Assistir episódio 1", getApp: "Obter app", views: "visualizações", free: "Grátis" }
  }
};
```

- [ ] **Step 4: Run locale tests**

Run:

```bash
pnpm --filter nuvelle_website test --run src/__tests__/i18n.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit locale model**

Run:

```bash
git add nuvelle_website/src/lib/i18n.ts nuvelle_website/src/__tests__/i18n.test.ts
git commit -m "添加官网多语言模型"
```

Expected: commit succeeds.

---

### Task 2: Refactor Website Home Into a Locale-Aware Client Component

**Files:**
- Create: `nuvelle_website/src/components/website-home.tsx`
- Modify: `nuvelle_website/src/components/app-band.tsx`
- Modify: `nuvelle_website/src/components/drama-modal.tsx`
- Modify: `nuvelle_website/src/__tests__/page.test.tsx`
- Modify: `nuvelle_website/app/page.tsx` temporarily before route-group move

- [ ] **Step 1: Update failing home test imports and locale assertions**

Modify the import and add locale assertions in `nuvelle_website/src/__tests__/page.test.tsx`:

```ts
import WebsiteHome from "../components/website-home";
```

Update every render call from:

```tsx
render(<WebsiteHome />);
```

to:

```tsx
render(<WebsiteHome locale="en" />);
```

Add this test:

```ts
it("renders localized navigation and app copy", () => {
  render(<WebsiteHome locale="cn" />);
  expect(screen.getByRole("link", { name: "博客" })).toHaveAttribute("href", "/cn/blog");
  expect(screen.getByPlaceholderText("搜索短剧")).toBeInTheDocument();
  expect(screen.getByText("最新上线")).toBeInTheDocument();
  expect(screen.getAllByText("获取 App").length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run page test to verify it fails**

Run:

```bash
pnpm --filter nuvelle_website test --run src/__tests__/page.test.tsx
```

Expected: FAIL because `src/components/website-home.tsx` does not exist.

- [ ] **Step 3: Parameterize AppBand**

Modify `nuvelle_website/src/components/app-band.tsx`:

```tsx
import { Apple, Play, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WebsiteCopy } from "@/lib/i18n";

type AppBandProps = {
  copy: WebsiteCopy["appBand"];
};

export function AppBand({ copy }: AppBandProps) {
  return (
    <section
      id="app"
      className="my-10 overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(120deg,#15102a,#1a1030_55%,#241124)]"
    >
      <div className="mx-auto flex max-w-[1320px] flex-col gap-7 px-5 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="max-w-lg text-3xl font-bold leading-tight tracking-normal text-white sm:text-4xl">
            {copy.title}
            <span className="block bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] bg-clip-text text-transparent">
              {copy.accent}
            </span>
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#a8b0cc] sm:text-base">{copy.body}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" size="lg" variant="outline" className="justify-start bg-[#0c0e18]">
            <Apple className="h-5 w-5" />
            {copy.appStore}
          </Button>
          <Button type="button" size="lg" variant="outline" className="justify-start bg-[#0c0e18]">
            <Play className="h-5 w-5 fill-current" />
            {copy.googlePlay}
          </Button>
          <Button type="button" size="lg" variant="gradient" className="justify-start">
            <Smartphone className="h-5 w-5" />
            {copy.getApp}
          </Button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Parameterize DramaModal**

Modify `nuvelle_website/src/components/drama-modal.tsx` by adding the copy prop and replacing text literals:

```tsx
import type { WebsiteCopy } from "@/lib/i18n";

type DramaModalProps = {
  drama: Drama | null;
  onClose: () => void;
  onGetApp: () => void;
  copy: WebsiteCopy["modal"];
};

export function DramaModal({ drama, onClose, onGetApp, copy }: DramaModalProps) {
  // existing stats and episode logic stays unchanged
  // replace "views" with {copy.views}
  // replace "Free" with {copy.free}
  // replace "Watch Episode 1" with {copy.watchEpisode}
  // replace "Get the App" with {copy.getApp}
}
```

The final button block must be:

```tsx
<DialogFooter className="mt-7 justify-start sm:justify-start">
  <Button type="button" size="lg" variant="gradient" onClick={handleWatch}>
    <Play className="h-4 w-4 fill-current" />
    {copy.watchEpisode}
  </Button>
  <Button type="button" size="lg" variant="outline" onClick={onGetApp}>
    <Download className="h-4 w-4" />
    {copy.getApp}
  </Button>
</DialogFooter>
```

- [ ] **Step 5: Create WebsiteHome client component**

Create `nuvelle_website/src/components/website-home.tsx` by moving the current `app/page.tsx` content into this file. Keep `"use client";` at the top, add a `locale` prop, and replace text literals with `websiteCopy[locale]`.

Use this header and prop setup:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Search, Smartphone, X } from "lucide-react";
import { AppBand } from "@/components/app-band";
import { BrandMark } from "@/components/brand-mark";
import { DramaCard } from "@/components/drama-card";
import { DramaModal } from "@/components/drama-modal";
import { HeroCarousel } from "@/components/hero-carousel";
import { Button } from "@/components/ui/button";
import {
  bannerItems,
  getDramaBySlug,
  rows,
  searchDramas,
  top10,
  type Drama
} from "@/data/dramas";
import { getLocale, homePathForLocale, type LocaleKey, websiteCopy } from "@/lib/i18n";

type WebsiteHomeProps = {
  locale: LocaleKey;
};

const footerLinks = {
  Explore: ["New Releases", "Categories", "Trending", "For Creators"],
  Company: ["About Nuvelle", "Careers", "Press", "Contact"],
  Legal: ["Terms of Service", "Privacy Policy", "Content Policy", "Support"]
};

const searchDisplayAliases: Record<string, string> = {
  mafia_wife: "Mafia Wife"
};
```

Inside `WebsiteHome`, compute:

```tsx
const copy = websiteCopy[locale];
const localeInfo = getLocale(locale);
const blogHref = `${localeInfo.prefix}/blog` || "/blog";
```

Header navigation must include:

```tsx
<a className="transition-colors hover:text-white" href={homePathForLocale(locale)}>
  {copy.nav.home}
</a>
<a className="transition-colors hover:text-white" href="#categories">
  {copy.nav.categories}
</a>
<a className="transition-colors hover:text-white" href="#app">
  {copy.nav.fandom}
</a>
<a className="transition-colors hover:text-white" href="#app">
  {copy.nav.creators}
</a>
<a className="transition-colors hover:text-white" href={blogHref}>
  {copy.nav.blog}
</a>
```

Search input must use:

```tsx
aria-label={copy.search.label}
placeholder={copy.search.placeholder}
```

Replace the app CTA button text with `{copy.hero.getApp}`.

Replace search result labels with:

```tsx
<h2 className="text-2xl font-semibold tracking-normal text-white">{copy.search.results}</h2>
...
{copy.search.clear}
...
{copy.search.empty(query)}
```

Replace row titles with:

```tsx
<CatalogRow id="new" title={copy.rows.newReleases} slugs={rows["New Releases"]} onOpen={openDrama} />
...
<RowHeader title={copy.rows.top10} viewAll={copy.rows.viewAll} />
...
<CatalogRow title={copy.rows.secondChance} slugs={rows["Second Chance"]} onOpen={openDrama} viewAll={copy.rows.viewAll} />
```

Update `RowHeader` and `CatalogRow` props:

```tsx
function RowHeader({ title, viewAll }: { title: string; viewAll: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-2xl font-semibold tracking-normal text-white">{title}</h2>
      <a className="text-sm font-medium text-[#8f98b6] transition-colors hover:text-white" href="#">
        {viewAll}
      </a>
    </div>
  );
}
```

Render app band and modal with localized copy:

```tsx
<AppBand copy={copy.appBand} />
<DramaModal drama={selectedDrama} onClose={() => setSelectedDrama(null)} onGetApp={appAndClose} copy={copy.modal} />
```

- [ ] **Step 6: Make app page a server wrapper**

Replace `nuvelle_website/app/page.tsx` with:

```tsx
import WebsiteHome from "@/components/website-home";

export default function WebsiteHomePage() {
  return <WebsiteHome locale="en" />;
}
```

- [ ] **Step 7: Run home tests**

Run:

```bash
pnpm --filter nuvelle_website test --run src/__tests__/page.test.tsx src/__tests__/i18n.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit home refactor**

Run:

```bash
git add nuvelle_website/src/components/website-home.tsx nuvelle_website/src/components/app-band.tsx nuvelle_website/src/components/drama-modal.tsx nuvelle_website/src/__tests__/page.test.tsx nuvelle_website/app/page.tsx
git commit -m "重构官网首页支持多语言文案"
```

Expected: commit succeeds.

---

### Task 3: Move Home Routes Into Locale Root Layouts

**Files:**
- Delete: `nuvelle_website/app/layout.tsx`
- Create: `nuvelle_website/app/(en)/layout.tsx`
- Create: `nuvelle_website/app/(en)/page.tsx`
- Create: `nuvelle_website/app/[locale]/layout.tsx`
- Create: `nuvelle_website/app/[locale]/page.tsx`
- Delete: `nuvelle_website/app/page.tsx`

- [ ] **Step 1: Create route layout implementation**

Create `nuvelle_website/app/(en)/layout.tsx`:

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../globals.css";

export const metadata: Metadata = {
  title: "Nuvelle - The Home of AI Shorts",
  description:
    "Nuvelle is the home of premium AI-crafted vertical dramas. Billionaires, werewolves, second chances and sweet revenge."
};

export default function EnglishRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Create `nuvelle_website/app/(en)/page.tsx`:

```tsx
import WebsiteHome from "@/components/website-home";

export default function WebsiteHomePage() {
  return <WebsiteHome locale="en" />;
}
```

Create `nuvelle_website/app/[locale]/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../globals.css";
import { getLocaleByRouteParam } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Nuvelle - The Home of AI Shorts",
  description:
    "Nuvelle is the home of premium AI-crafted vertical dramas. Billionaires, werewolves, second chances and sweet revenge."
};

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleRootLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  const localeInfo = getLocaleByRouteParam(locale);
  if (!localeInfo) {
    notFound();
  }

  return (
    <html lang={localeInfo.htmlLang}>
      <body>{children}</body>
    </html>
  );
}
```

Create `nuvelle_website/app/[locale]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import WebsiteHome from "@/components/website-home";
import { getLocaleByRouteParam } from "@/lib/i18n";

type LocaleHomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LocaleHomePage({ params }: LocaleHomePageProps) {
  const { locale } = await params;
  const localeInfo = getLocaleByRouteParam(locale);
  if (!localeInfo) {
    notFound();
  }

  return <WebsiteHome locale={localeInfo.key} />;
}
```

Delete `nuvelle_website/app/layout.tsx` and `nuvelle_website/app/page.tsx` after creating route-group replacements.

- [ ] **Step 2: Typecheck route layouts**

Run:

```bash
pnpm --filter nuvelle_website typecheck
```

Expected: PASS.

- [ ] **Step 3: Run page tests**

Run:

```bash
pnpm --filter nuvelle_website test --run src/__tests__/page.test.tsx src/__tests__/i18n.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit locale routes**

Run:

```bash
git add nuvelle_website/app nuvelle_website/src/components/website-home.tsx
git commit -m "添加官网多语言路由"
```

Expected: commit succeeds.

---

### Task 4: Add Blog Config, URL Builder, and Sanitizer With Tests

**Files:**
- Create: `nuvelle_website/src/lib/blog/config.ts`
- Create: `nuvelle_website/src/lib/blog/urls.ts`
- Create: `nuvelle_website/src/lib/blog/sanitize.ts`
- Create: `nuvelle_website/src/__tests__/blog-config.test.ts`
- Create: `nuvelle_website/src/__tests__/blog-urls.test.ts`
- Create: `nuvelle_website/src/__tests__/blog-sanitize.test.ts`

- [ ] **Step 1: Write blog config test**

Create `nuvelle_website/src/__tests__/blog-config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createBlogConfig, parseCategoryIds } from "../lib/blog/config";

describe("blog config", () => {
  it("parses category ids and filters invalid values", () => {
    expect(parseCategoryIds("1, 2, x, 0, 7")).toEqual([1, 2, 7]);
    expect(parseCategoryIds("")).toEqual([]);
    expect(parseCategoryIds(undefined)).toEqual([]);
  });

  it("uses nuvelle defaults and env overrides", () => {
    const config = createBlogConfig({
      BLOG_SITE_KEY: "custom.example",
      BLOG_PAGE_SIZE: "24",
      NEXT_PUBLIC_SITE_ORIGIN: "https://example.com",
      BLOG_CATEGORY_IDS_EN: "1,2",
      BLOG_CATEGORY_IDS_CN: "3"
    });
    expect(config.siteKey).toBe("custom.example");
    expect(config.pageSize).toBe(24);
    expect(config.siteOrigin).toBe("https://example.com");
    expect(config.categoryIdsByLocale.en).toEqual([1, 2]);
    expect(config.categoryIdsByLocale.cn).toEqual([3]);
    expect(config.categoryIdsByLocale.jp).toEqual([]);
  });
});
```

- [ ] **Step 2: Write blog URL test**

Create `nuvelle_website/src/__tests__/blog-urls.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { blogPath, buildAlternateLinks, canonicalUrl, normalizeSiteOrigin } from "../lib/blog/urls";

describe("blog urls", () => {
  it("normalizes origins and builds locale-aware relative paths", () => {
    expect(normalizeSiteOrigin("https://nuvelle.ai/")).toBe("https://nuvelle.ai");
    expect(blogPath("en", { kind: "list" })).toBe("/blog");
    expect(blogPath("cn", { kind: "list" })).toBe("/cn/blog");
    expect(blogPath("fr", { kind: "category", slug: "news" })).toBe("/fr/blog/category/news");
    expect(blogPath("pt", { kind: "search", query: "ai shorts" })).toBe("/pt/blog/search?value=ai%20shorts");
    expect(blogPath("jp", { kind: "detail", slug: "story one" })).toBe("/jp/blog/story%20one");
  });

  it("builds canonical and hreflang links", () => {
    expect(canonicalUrl("https://nuvelle.ai", "de", { kind: "list" })).toBe("https://nuvelle.ai/de/blog");
    expect(canonicalUrl("https://nuvelle.ai", "en", { kind: "detail", slug: "hello" })).toBe(
      "https://nuvelle.ai/blog/hello"
    );
    expect(buildAlternateLinks("https://nuvelle.ai", { kind: "category", slug: "news" })).toEqual([
      { hrefLang: "en", href: "https://nuvelle.ai/blog/category/news" },
      { hrefLang: "zh-CN", href: "https://nuvelle.ai/cn/blog/category/news" },
      { hrefLang: "ja-JP", href: "https://nuvelle.ai/jp/blog/category/news" },
      { hrefLang: "de-DE", href: "https://nuvelle.ai/de/blog/category/news" },
      { hrefLang: "fr-FR", href: "https://nuvelle.ai/fr/blog/category/news" },
      { hrefLang: "es-ES", href: "https://nuvelle.ai/es/blog/category/news" },
      { hrefLang: "pt-PT", href: "https://nuvelle.ai/pt/blog/category/news" },
      { hrefLang: "x-default", href: "https://nuvelle.ai/blog/category/news" }
    ]);
  });
});
```

- [ ] **Step 3: Write sanitizer test**

Create `nuvelle_website/src/__tests__/blog-sanitize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { sanitizeArticleHtml, stripHtml } from "../lib/blog/sanitize";

describe("blog sanitizer", () => {
  it("removes scripts, event handlers, and javascript urls while preserving article markup", () => {
    const html =
      '<h2 onclick="bad()">Title</h2><script>alert(1)</script><p><a href="javascript:bad()">Bad</a><a href="https://nuvelle.ai">Good</a></p><img src="x.jpg" onerror="bad()" alt="x">';
    const sanitized = sanitizeArticleHtml(html);
    expect(sanitized).toContain("<h2>Title</h2>");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("onerror");
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).toContain('href="https://nuvelle.ai"');
    expect(sanitized).toContain('src="x.jpg"');
  });

  it("strips html for descriptions", () => {
    expect(stripHtml("<p>Hello <strong>Nuvelle</strong></p>").trim()).toBe("Hello Nuvelle");
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run:

```bash
pnpm --filter nuvelle_website test --run src/__tests__/blog-config.test.ts src/__tests__/blog-urls.test.ts src/__tests__/blog-sanitize.test.ts
```

Expected: FAIL because blog modules do not exist.

- [ ] **Step 5: Implement blog config**

Create `nuvelle_website/src/lib/blog/config.ts`:

```ts
import type { LocaleKey } from "@/lib/i18n";

type Env = Record<string, string | undefined>;

export type BlogConfig = {
  slxHost: string;
  siteKey: string;
  pageSize: number;
  siteOrigin: string;
  categoryIdsByLocale: Record<LocaleKey, number[]>;
};

export function parseCategoryIds(value: string | undefined): number[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function parsePageSize(value: string | undefined) {
  const pageSize = Number(value);
  return Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 12;
}

export function createBlogConfig(env: Env = process.env): BlogConfig {
  return {
    slxHost: env.BLOG_SLX_HOST || "https://apps.voc.ai",
    siteKey: env.BLOG_SITE_KEY || "nuvelle.ai",
    pageSize: parsePageSize(env.BLOG_PAGE_SIZE),
    siteOrigin: env.NEXT_PUBLIC_SITE_ORIGIN || "https://nuvelle.ai",
    categoryIdsByLocale: {
      en: parseCategoryIds(env.BLOG_CATEGORY_IDS_EN),
      cn: parseCategoryIds(env.BLOG_CATEGORY_IDS_CN),
      jp: parseCategoryIds(env.BLOG_CATEGORY_IDS_JP),
      de: parseCategoryIds(env.BLOG_CATEGORY_IDS_DE),
      fr: parseCategoryIds(env.BLOG_CATEGORY_IDS_FR),
      es: parseCategoryIds(env.BLOG_CATEGORY_IDS_ES),
      pt: parseCategoryIds(env.BLOG_CATEGORY_IDS_PT)
    }
  };
}

export const blogConfig = createBlogConfig();
```

- [ ] **Step 6: Implement blog URLs**

Create `nuvelle_website/src/lib/blog/urls.ts`:

```ts
import { getLocale, localeOptions, type LocaleKey } from "@/lib/i18n";

export type BlogRoute =
  | { kind: "list" }
  | { kind: "category"; slug: string }
  | { kind: "search"; query?: string }
  | { kind: "detail"; slug: string };

export type AlternateLink = {
  hrefLang: string;
  href: string;
};

export function normalizeSiteOrigin(origin: string) {
  return origin.replace(/\/+$/, "");
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

export function blogPath(locale: LocaleKey, route: BlogRoute) {
  const prefix = getLocale(locale).prefix;
  const base = `${prefix}/blog`;
  if (route.kind === "category") {
    return `${base}/category/${encodePathSegment(route.slug)}`;
  }
  if (route.kind === "search") {
    const query = route.query?.trim();
    return query ? `${base}/search?value=${encodeURIComponent(query)}` : `${base}/search`;
  }
  if (route.kind === "detail") {
    return `${base}/${encodePathSegment(route.slug)}`;
  }
  return base;
}

export function canonicalUrl(origin: string, locale: LocaleKey, route: BlogRoute) {
  return `${normalizeSiteOrigin(origin)}${blogPath(locale, route)}`;
}

export function buildAlternateLinks(origin: string, route: Exclude<BlogRoute, { kind: "detail" }>): AlternateLink[] {
  const normalizedOrigin = normalizeSiteOrigin(origin);
  const alternates = localeOptions.map((locale) => ({
    hrefLang: locale.hrefLang,
    href: `${normalizedOrigin}${blogPath(locale.key, route)}`
  }));
  alternates.push({
    hrefLang: "x-default",
    href: `${normalizedOrigin}${blogPath("en", route)}`
  });
  return alternates;
}

export function buildDetailAlternateLinks(origin: string, locale: LocaleKey, slug: string): AlternateLink[] {
  const normalizedOrigin = normalizeSiteOrigin(origin);
  return [
    {
      hrefLang: getLocale(locale).hrefLang,
      href: `${normalizedOrigin}${blogPath(locale, { kind: "detail", slug })}`
    },
    {
      hrefLang: "x-default",
      href: `${normalizedOrigin}${blogPath("en", { kind: "detail", slug })}`
    }
  ];
}
```

- [ ] **Step 7: Implement sanitizer**

Create `nuvelle_website/src/lib/blog/sanitize.ts`:

```ts
const blockedTagPattern = /<\/?(script|style|iframe|object|embed|form|input|button|textarea|select)\b[^>]*>/gi;
const eventAttributePattern = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const javascriptUrlPattern = /\s+(href|src)\s*=\s*("|')\s*javascript:[\s\S]*?\2/gi;
const dataUrlPattern = /\s+(href|src)\s*=\s*("|')\s*data:(?!image\/(?:png|jpeg|jpg|gif|webp);)[\s\S]*?\2/gi;

export function sanitizeArticleHtml(html: string | null | undefined) {
  if (!html) {
    return "";
  }
  return html
    .replace(blockedTagPattern, "")
    .replace(eventAttributePattern, "")
    .replace(javascriptUrlPattern, "")
    .replace(dataUrlPattern, "");
}

export function stripHtml(html: string | null | undefined) {
  if (!html) {
    return "";
  }
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}
```

- [ ] **Step 8: Run blog utility tests**

Run:

```bash
pnpm --filter nuvelle_website test --run src/__tests__/blog-config.test.ts src/__tests__/blog-urls.test.ts src/__tests__/blog-sanitize.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit blog utility modules**

Run:

```bash
git add nuvelle_website/src/lib/blog nuvelle_website/src/__tests__/blog-config.test.ts nuvelle_website/src/__tests__/blog-urls.test.ts nuvelle_website/src/__tests__/blog-sanitize.test.ts
git commit -m "添加博客配置和链接工具"
```

Expected: commit succeeds.

---

### Task 5: Add Blog API Adapter and SEO Helpers

**Files:**
- Create: `nuvelle_website/src/lib/blog/types.ts`
- Create: `nuvelle_website/src/lib/blog/api.ts`
- Create: `nuvelle_website/src/lib/blog/seo.ts`
- Create: `nuvelle_website/src/__tests__/blog-api.test.ts`

- [ ] **Step 1: Write API adapter tests**

Create `nuvelle_website/src/__tests__/blog-api.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { fetchBlogDetail, fetchBlogList, mapBlogDetail, mapBlogListItem } from "../lib/blog/api";
import type { BlogConfig } from "../lib/blog/config";

const config: BlogConfig = {
  slxHost: "https://apps.voc.ai",
  siteKey: "nuvelle.ai",
  pageSize: 12,
  siteOrigin: "https://nuvelle.ai",
  categoryIdsByLocale: {
    en: [1, 2],
    cn: [],
    jp: [],
    de: [],
    fr: [],
    es: [],
    pt: []
  }
};

describe("blog api adapter", () => {
  it("maps list and detail backend fields", () => {
    expect(
      mapBlogListItem({
        ID: 7,
        slug: "hello",
        post_title: "Hello",
        post_excerpt: "Excerpt",
        post_date: "2026-06-16T00:00:00.000Z",
        twitter_image: "https://cdn.example/cover.jpg",
        author_name: "Nuvelle",
        category_slug: "news",
        category_name: "News",
        detailUrl: "/blog/hello"
      })
    ).toEqual({
      id: 7,
      slug: "hello",
      title: "Hello",
      excerpt: "Excerpt",
      date: "2026-06-16T00:00:00.000Z",
      image: "https://cdn.example/cover.jpg",
      authorName: "Nuvelle",
      category: { slug: "news", name: "News" }
    });

    const detail = mapBlogDetail({
      ID: 8,
      post_name: "story",
      post_title: "Story",
      post_excerpt: "Detail excerpt",
      post_content: "<p>Body</p>",
      post_date: "2026-06-15T00:00:00.000Z",
      twitter_image: "https://cdn.example/story.jpg",
      author_name: "Editor",
      type: "blog",
      meta: { title: "Meta title", desc: "Meta desc" },
      category: { slug: "updates", name: "Updates" },
      schemaJsonTrimmed: "{\"@context\":\"https://schema.org\"}"
    });
    expect(detail?.slug).toBe("story");
    expect(detail?.meta.title).toBe("Meta title");
    expect(detail?.category?.slug).toBe("updates");
  });

  it("builds list request with category ids and search", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 200, data: { total: 0, list: [] } })
    });
    await fetchBlogList({
      locale: "en",
      pageNum: 2,
      search: "ai",
      config,
      fetcher: fetchMock as unknown as typeof fetch
    });
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/n/blog/listDataV2");
    expect(url.searchParams.get("site")).toBe("nuvelle.ai");
    expect(url.searchParams.get("categoryIds")).toBe("1,2");
    expect(url.searchParams.get("search")).toBe("ai");
    expect(url.searchParams.get("pageNum")).toBe("2");
  });

  it("returns null for missing detail data", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 200, data: [] })
    });
    await expect(
      fetchBlogDetail({
        locale: "cn",
        slug: "missing",
        config,
        fetcher: fetchMock as unknown as typeof fetch
      })
    ).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run API tests to verify they fail**

Run:

```bash
pnpm --filter nuvelle_website test --run src/__tests__/blog-api.test.ts
```

Expected: FAIL because blog API modules do not exist.

- [ ] **Step 3: Implement blog types**

Create `nuvelle_website/src/lib/blog/types.ts`:

```ts
export type BlogCategory = {
  slug: string;
  name: string;
};

export type BlogArticleListItem = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  image?: string;
  authorName?: string;
  category?: BlogCategory;
};

export type BlogArticleDetail = BlogArticleListItem & {
  contentHtml: string;
  meta: {
    title?: string;
    desc?: string;
  };
  schemaJsonTrimmed?: string;
  canonicalUrl?: string;
  modifiedDate?: string;
  type?: string;
};

export type BlogListResult = {
  articles: BlogArticleListItem[];
  total: number;
  pageNum: number;
  pageSize: number;
};

export type BackendBlogListItem = {
  ID?: number;
  id?: number;
  slug?: string;
  post_name?: string;
  post_title?: string;
  title?: string;
  post_excerpt?: string;
  description?: string;
  post_date?: string;
  update_time?: string;
  twitter_image?: string;
  author_name?: string;
  category_slug?: string;
  category_name?: string;
  category?: Partial<BlogCategory>;
  detailUrl?: string;
};

export type BackendBlogDetail = BackendBlogListItem & {
  post_content?: string;
  meta?: {
    title?: string;
    desc?: string;
  };
  schemaJsonTrimmed?: string;
  canonical?: string;
  canonicalUrl?: string;
  sourceUrl?: string;
  post_modified?: string;
  type?: string;
};
```

- [ ] **Step 4: Implement API adapter**

Create `nuvelle_website/src/lib/blog/api.ts`:

```ts
import type { LocaleKey } from "@/lib/i18n";
import { blogConfig, type BlogConfig } from "@/lib/blog/config";
import type {
  BackendBlogDetail,
  BackendBlogListItem,
  BlogArticleDetail,
  BlogArticleListItem,
  BlogListResult
} from "@/lib/blog/types";

type Fetcher = typeof fetch;

type FetchBlogListOptions = {
  locale: LocaleKey;
  pageNum?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  config?: BlogConfig;
  fetcher?: Fetcher;
};

type FetchBlogDetailOptions = {
  locale: LocaleKey;
  slug: string;
  config?: BlogConfig;
  fetcher?: Fetcher;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number(value) || 0;
}

function categoryFromBackend(item: BackendBlogListItem) {
  const slug = item.category?.slug || item.category_slug || "";
  const name = item.category?.name || item.category_name || "";
  return slug || name ? { slug, name: name || slug } : undefined;
}

function appendCategoryIds(params: URLSearchParams, config: BlogConfig, locale: LocaleKey) {
  const ids = config.categoryIdsByLocale[locale];
  if (ids.length) {
    params.set("categoryIds", ids.join(","));
  }
}

export function mapBlogListItem(item: BackendBlogListItem): BlogArticleListItem {
  const slug = item.slug || item.post_name || item.detailUrl?.split("/").filter(Boolean).pop() || "";
  return {
    id: numberValue(item.ID ?? item.id),
    slug,
    title: stringValue(item.post_title || item.title),
    excerpt: stringValue(item.post_excerpt || item.description),
    date: stringValue(item.post_date || item.update_time),
    image: item.twitter_image,
    authorName: item.author_name,
    category: categoryFromBackend(item)
  };
}

export function mapBlogDetail(item: BackendBlogDetail | undefined): BlogArticleDetail | null {
  if (!item) {
    return null;
  }
  const base = mapBlogListItem(item);
  if (!base.slug || !base.title) {
    return null;
  }
  return {
    ...base,
    contentHtml: stringValue(item.post_content),
    meta: {
      title: item.meta?.title,
      desc: item.meta?.desc
    },
    schemaJsonTrimmed: item.schemaJsonTrimmed,
    canonicalUrl: item.canonicalUrl || item.canonical || item.sourceUrl,
    modifiedDate: item.post_modified,
    type: item.type
  };
}

export async function fetchBlogList(options: FetchBlogListOptions): Promise<BlogListResult> {
  const config = options.config ?? blogConfig;
  const pageNum = options.pageNum ?? 1;
  const pageSize = options.pageSize ?? config.pageSize;
  const fetcher = options.fetcher ?? fetch;
  const params = new URLSearchParams({
    site: config.siteKey,
    pageNum: String(pageNum),
    pageSize: String(pageSize)
  });
  appendCategoryIds(params, config, options.locale);
  if (options.search?.trim()) {
    params.set("search", options.search.trim());
  }
  if (options.type?.trim()) {
    params.set("type", options.type.trim());
  }

  const response = await fetcher(`${config.slxHost}/n/blog/listDataV2?${params.toString()}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Blog list request failed: ${response.status}`);
  }
  const json = await response.json();
  const data = json?.data || {};
  return {
    articles: Array.isArray(data.list) ? data.list.map(mapBlogListItem).filter((item) => item.slug && item.title) : [],
    total: numberValue(data.total),
    pageNum,
    pageSize
  };
}

export async function fetchBlogDetail(options: FetchBlogDetailOptions): Promise<BlogArticleDetail | null> {
  const config = options.config ?? blogConfig;
  const fetcher = options.fetcher ?? fetch;
  const params = new URLSearchParams({
    site: config.siteKey,
    slug: options.slug
  });
  appendCategoryIds(params, config, options.locale);

  const response = await fetcher(`${config.slxHost}/n/blog/detailData?${params.toString()}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Blog detail request failed: ${response.status}`);
  }
  const json = await response.json();
  const detail = Array.isArray(json?.data) ? json.data[0] : undefined;
  return mapBlogDetail(detail);
}
```

- [ ] **Step 5: Implement SEO helpers**

Create `nuvelle_website/src/lib/blog/seo.ts`:

```ts
import type { Metadata } from "next";
import type { LocaleKey } from "@/lib/i18n";
import { blogConfig } from "@/lib/blog/config";
import { buildAlternateLinks, buildDetailAlternateLinks, canonicalUrl, type BlogRoute } from "@/lib/blog/urls";
import { stripHtml } from "@/lib/blog/sanitize";
import type { BlogArticleDetail } from "@/lib/blog/types";

export type BreadcrumbItem = {
  name: string;
  url?: string;
};

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: item.url ? { "@id": item.url, name: item.name } : { name: item.name }
    }))
  };
}

export function blogPostingJsonLd(article: BlogArticleDetail, canonical: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: stripHtml(article.title).trim(),
    description: article.meta.desc || stripHtml(article.excerpt || article.contentHtml).trim().slice(0, 160),
    image: article.image ? [article.image] : undefined,
    datePublished: article.date,
    dateModified: article.modifiedDate || article.date,
    author: article.authorName ? { "@type": "Person", name: article.authorName } : undefined,
    mainEntityOfPage: canonical
  };
}

export function metadataForBlogList(locale: LocaleKey, route: Exclude<BlogRoute, { kind: "detail" }>, title: string, description: string): Metadata {
  const canonical = canonicalUrl(blogConfig.siteOrigin, locale, route);
  const alternates = buildAlternateLinks(blogConfig.siteOrigin, route);
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: Object.fromEntries(alternates.map((item) => [item.hrefLang, item.href]))
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Nuvelle",
      type: "website"
    }
  };
}

export function metadataForBlogDetail(locale: LocaleKey, article: BlogArticleDetail, slug: string): Metadata {
  const canonical = article.canonicalUrl || canonicalUrl(blogConfig.siteOrigin, locale, { kind: "detail", slug });
  const alternates = buildDetailAlternateLinks(blogConfig.siteOrigin, locale, slug);
  const title = article.meta.title || article.title;
  const description = article.meta.desc || stripHtml(article.excerpt || article.contentHtml).trim().slice(0, 160);
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: Object.fromEntries(alternates.map((item) => [item.hrefLang, item.href]))
    },
    openGraph: {
      title,
      description,
      url: canonical,
      images: article.image ? [article.image] : undefined,
      siteName: "Nuvelle",
      type: "article",
      publishedTime: article.date,
      modifiedTime: article.modifiedDate || article.date
    },
    twitter: {
      card: article.image ? "summary_large_image" : "summary",
      title,
      description,
      images: article.image ? [article.image] : undefined
    }
  };
}
```

- [ ] **Step 6: Run API tests**

Run:

```bash
pnpm --filter nuvelle_website test --run src/__tests__/blog-api.test.ts src/__tests__/blog-config.test.ts src/__tests__/blog-urls.test.ts src/__tests__/blog-sanitize.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit blog API and SEO helpers**

Run:

```bash
git add nuvelle_website/src/lib/blog nuvelle_website/src/__tests__/blog-api.test.ts
git commit -m "添加博客接口适配和SEO工具"
```

Expected: commit succeeds.

---

### Task 6: Add Blog Components and Styles

**Files:**
- Create: `nuvelle_website/src/components/blog/blog-shell.tsx`
- Create: `nuvelle_website/src/components/blog/blog-list-page.tsx`
- Create: `nuvelle_website/src/components/blog/blog-article-card.tsx`
- Create: `nuvelle_website/src/components/blog/blog-article-page.tsx`
- Create: `nuvelle_website/src/components/blog/blog-breadcrumbs.tsx`
- Modify: `nuvelle_website/app/globals.css`

- [ ] **Step 1: Implement breadcrumbs**

Create `nuvelle_website/src/components/blog/blog-breadcrumbs.tsx`:

```tsx
import type { BreadcrumbItem } from "@/lib/blog/seo";

type BlogBreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function BlogBreadcrumbs({ items }: BlogBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[#8f98b6]">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="inline-flex items-center gap-2">
            {index > 0 ? <span className="text-[#555d7a]">/</span> : null}
            {item.url ? (
              <a className="transition-colors hover:text-white" href={item.url}>
                {item.name}
              </a>
            ) : (
              <span className="text-white">{item.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 2: Implement blog shell**

Create `nuvelle_website/src/components/blog/blog-shell.tsx`:

```tsx
import { Search, Smartphone } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { blogPath } from "@/lib/blog/urls";
import { getLocale, homePathForLocale, type LocaleKey, websiteCopy } from "@/lib/i18n";

type BlogShellProps = {
  locale: LocaleKey;
  title: string;
  description: string;
  searchValue?: string;
  children: React.ReactNode;
};

export function BlogShell({ locale, title, description, searchValue = "", children }: BlogShellProps) {
  const copy = websiteCopy[locale];
  const localeInfo = getLocale(locale);
  const searchPath = blogPath(locale, { kind: "search" });

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0d16]/80 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1320px] flex-wrap items-center gap-4 px-5 py-3 sm:flex-nowrap sm:px-7 sm:py-0">
          <a href={homePathForLocale(locale)} aria-label="Nuvelle home">
            <BrandMark />
          </a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-[#a8b0cc] md:flex">
            <a className="transition-colors hover:text-white" href={homePathForLocale(locale)}>
              {copy.nav.home}
            </a>
            <a className="transition-colors hover:text-white" href={blogPath(locale, { kind: "list" })}>
              {copy.nav.blog}
            </a>
            <a className="transition-colors hover:text-white" href={`${homePathForLocale(locale)}#categories`}>
              {copy.nav.categories}
            </a>
          </nav>
          <div className="flex-1" />
          <form action={searchPath} className="order-last flex w-full items-center gap-2 rounded-full border border-white/10 bg-[#0c0f1a] px-4 py-2 text-[#8f98b6] sm:order-none sm:min-w-[13rem] sm:max-w-xs">
            <Search className="h-4 w-4" />
            <input
              aria-label="Search blog"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#6b7290]"
              name="value"
              placeholder="Search blog"
              defaultValue={searchValue}
            />
          </form>
          <Button type="button" variant="gradient" asChild>
            <a href={`${localeInfo.prefix || ""}/#app`}>
              <Smartphone className="h-4 w-4" />
              {copy.hero.getApp}
            </a>
          </Button>
        </div>
      </header>

      <main className="min-h-screen bg-[#0b0d16] text-white">
        <section className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(178,92,255,0.28),transparent_32%),linear-gradient(180deg,#111522,#0b0d16)]">
          <div className="mx-auto max-w-[1320px] px-5 py-14 sm:px-7 lg:py-18">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#ff96d0]">Nuvelle Blog</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-normal text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#a8b0cc]">{description}</p>
          </div>
        </section>
        <section className="mx-auto max-w-[1320px] px-5 py-10 sm:px-7">{children}</section>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Implement article card**

Create `nuvelle_website/src/components/blog/blog-article-card.tsx`:

```tsx
import type { BlogArticleListItem } from "@/lib/blog/types";

type BlogArticleCardProps = {
  article: BlogArticleListItem;
  href: string;
};

export function BlogArticleCard({ article, href }: BlogArticleCardProps) {
  return (
    <article className="overflow-hidden rounded-lg border border-white/10 bg-[#111522] shadow-xl shadow-black/20">
      <a className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70" href={href}>
        {article.image ? (
          <img className="aspect-[16/9] w-full object-cover" src={article.image} alt={article.title} loading="lazy" />
        ) : (
          <div className="aspect-[16/9] bg-[linear-gradient(135deg,#1e2440,#351c3f)]" />
        )}
        <div className="p-5">
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#8f98b6]">
            {article.category ? <span>{article.category.name}</span> : null}
            {article.date ? <time dateTime={article.date}>{new Date(article.date).toLocaleDateString("en-US")}</time> : null}
          </div>
          <h2 className="mt-3 line-clamp-2 text-xl font-semibold leading-snug text-white">{article.title}</h2>
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#a8b0cc]">{article.excerpt}</p>
        </div>
      </a>
    </article>
  );
}
```

- [ ] **Step 4: Implement blog list page**

Create `nuvelle_website/src/components/blog/blog-list-page.tsx`:

```tsx
import { BlogArticleCard } from "@/components/blog/blog-article-card";
import { blogPath } from "@/lib/blog/urls";
import type { BlogListResult } from "@/lib/blog/types";
import type { LocaleKey } from "@/lib/i18n";

type BlogListPageProps = {
  locale: LocaleKey;
  result: BlogListResult;
  emptyTitle: string;
  emptyBody: string;
};

export function BlogListPage({ locale, result, emptyTitle, emptyBody }: BlogListPageProps) {
  if (!result.articles.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 px-5 py-8">
        <h2 className="text-xl font-semibold text-white">{emptyTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a8b0cc]">{emptyBody}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {result.articles.map((article) => (
          <BlogArticleCard key={article.id || article.slug} article={article} href={blogPath(locale, { kind: "detail", slug: article.slug })} />
        ))}
      </div>
      {result.total > result.pageSize ? (
        <nav className="mt-8 flex items-center justify-center gap-3 text-sm text-[#a8b0cc]" aria-label="Blog pagination">
          <span>
            Page {result.pageNum} of {Math.ceil(result.total / result.pageSize)}
          </span>
        </nav>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Implement article page**

Create `nuvelle_website/src/components/blog/blog-article-page.tsx`:

```tsx
import { BlogBreadcrumbs } from "@/components/blog/blog-breadcrumbs";
import { blogPath, canonicalUrl } from "@/lib/blog/urls";
import { breadcrumbJsonLd, blogPostingJsonLd, type BreadcrumbItem } from "@/lib/blog/seo";
import { sanitizeArticleHtml } from "@/lib/blog/sanitize";
import type { BlogArticleDetail } from "@/lib/blog/types";
import { blogConfig } from "@/lib/blog/config";
import type { LocaleKey } from "@/lib/i18n";

type BlogArticlePageProps = {
  locale: LocaleKey;
  article: BlogArticleDetail;
};

export function BlogArticlePage({ locale, article }: BlogArticlePageProps) {
  const canonical = article.canonicalUrl || canonicalUrl(blogConfig.siteOrigin, locale, { kind: "detail", slug: article.slug });
  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Home", url: canonicalUrl(blogConfig.siteOrigin, locale, { kind: "list" }).replace(/\/blog$/, "") || blogConfig.siteOrigin },
    { name: "Blog", url: canonicalUrl(blogConfig.siteOrigin, locale, { kind: "list" }) },
    { name: article.title }
  ];
  const backendSchema = article.schemaJsonTrimmed ? safeJson(article.schemaJsonTrimmed) : null;
  const schemas = [breadcrumbJsonLd(breadcrumbs), backendSchema || blogPostingJsonLd(article, canonical)];

  return (
    <article className="mx-auto max-w-3xl">
      <BlogBreadcrumbs items={breadcrumbs} />
      <header className="mt-8">
        {article.category ? (
          <a className="text-sm font-semibold text-[#ff96d0]" href={blogPath(locale, { kind: "category", slug: article.category.slug })}>
            {article.category.name}
          </a>
        ) : null}
        <h1 className="mt-3 text-4xl font-bold leading-tight tracking-normal text-white sm:text-5xl">{article.title}</h1>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-[#8f98b6]">
          {article.authorName ? <span>{article.authorName}</span> : null}
          {article.date ? <time dateTime={article.date}>{new Date(article.date).toLocaleDateString("en-US")}</time> : null}
        </div>
        {article.image ? <img className="mt-8 aspect-[16/9] w-full rounded-lg object-cover" src={article.image} alt={article.title} /> : null}
      </header>
      <div
        className="blog-article-content mt-8"
        dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.contentHtml) }}
      />
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </article>
  );
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
```

- [ ] **Step 6: Add article content CSS**

Append to `nuvelle_website/app/globals.css`:

```css
.blog-article-content {
  color: #d8ddf0;
  font-size: 1rem;
  line-height: 1.8;
}

.blog-article-content :where(p, ul, ol, table, blockquote, pre) {
  margin: 1.25rem 0;
}

.blog-article-content :where(h2, h3) {
  color: #ffffff;
  font-weight: 700;
  line-height: 1.25;
  margin: 2rem 0 0.85rem;
}

.blog-article-content h2 {
  font-size: 1.75rem;
}

.blog-article-content h3 {
  font-size: 1.35rem;
}

.blog-article-content a {
  color: #ff96d0;
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.blog-article-content ul,
.blog-article-content ol {
  padding-left: 1.4rem;
}

.blog-article-content li {
  margin: 0.45rem 0;
}

.blog-article-content table {
  display: block;
  width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
}

.blog-article-content th,
.blog-article-content td {
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 0.75rem;
  text-align: left;
}

.blog-article-content th {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.blog-article-content img {
  max-width: 100%;
  border-radius: 0.5rem;
}
```

- [ ] **Step 7: Typecheck components**

Run:

```bash
pnpm --filter nuvelle_website typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit blog components**

Run:

```bash
git add nuvelle_website/src/components/blog nuvelle_website/app/globals.css
git commit -m "添加博客页面组件"
```

Expected: commit succeeds.

---

### Task 7: Add Blog App Routes

**Files:**
- Create: `nuvelle_website/src/lib/blog/page-data.ts`
- Create: `nuvelle_website/app/(en)/blog/page.tsx`
- Create: `nuvelle_website/app/(en)/blog/category/[slug]/page.tsx`
- Create: `nuvelle_website/app/(en)/blog/search/page.tsx`
- Create: `nuvelle_website/app/(en)/blog/[slug]/page.tsx`
- Create: `nuvelle_website/app/[locale]/blog/page.tsx`
- Create: `nuvelle_website/app/[locale]/blog/category/[slug]/page.tsx`
- Create: `nuvelle_website/app/[locale]/blog/search/page.tsx`
- Create: `nuvelle_website/app/[locale]/blog/[slug]/page.tsx`

- [ ] **Step 1: Implement shared page-data helpers**

Create `nuvelle_website/src/lib/blog/page-data.ts`:

```ts
import { notFound } from "next/navigation";
import { BlogArticlePage } from "@/components/blog/blog-article-page";
import { BlogListPage } from "@/components/blog/blog-list-page";
import { BlogShell } from "@/components/blog/blog-shell";
import { fetchBlogDetail, fetchBlogList } from "@/lib/blog/api";
import { metadataForBlogDetail, metadataForBlogList } from "@/lib/blog/seo";
import { getLocaleByRouteParam, type LocaleKey } from "@/lib/i18n";

export async function resolveLocaleParam(locale: string | undefined): Promise<LocaleKey> {
  const localeInfo = getLocaleByRouteParam(locale);
  if (!localeInfo) {
    notFound();
  }
  return localeInfo.key;
}

export async function renderBlogList(locale: LocaleKey) {
  const result = await safeListFetch({ locale });
  return (
    <BlogShell locale={locale} title="Nuvelle Blog" description="Stories, product updates, and ideas from the Nuvelle team.">
      <BlogListPage
        locale={locale}
        result={result}
        emptyTitle="No articles yet"
        emptyBody="Nuvelle blog articles are not published yet. This page is ready and will show posts as soon as they are available."
      />
    </BlogShell>
  );
}

export async function renderBlogCategory(locale: LocaleKey, slug: string) {
  const result = await safeListFetch({ locale, type: slug });
  return (
    <BlogShell locale={locale} title={`Nuvelle Blog: ${slug}`} description="Browse Nuvelle articles by category.">
      <BlogListPage
        locale={locale}
        result={result}
        emptyTitle="No articles in this category"
        emptyBody="This category does not have published Nuvelle articles yet."
      />
    </BlogShell>
  );
}

export async function renderBlogSearch(locale: LocaleKey, query: string) {
  const result = await safeListFetch({ locale, search: query });
  return (
    <BlogShell locale={locale} title="Search Nuvelle Blog" description="Search published Nuvelle blog articles." searchValue={query}>
      <BlogListPage
        locale={locale}
        result={result}
        emptyTitle={query ? "No matching articles" : "Search the Nuvelle blog"}
        emptyBody={query ? "Try another search term." : "Enter a topic to search Nuvelle articles."}
      />
    </BlogShell>
  );
}

export async function renderBlogDetail(locale: LocaleKey, slug: string) {
  const article = await fetchBlogDetail({ locale, slug });
  if (!article || (article.type && article.type !== "blog")) {
    notFound();
  }
  return (
    <BlogShell locale={locale} title="Nuvelle Blog" description="Stories, product updates, and ideas from the Nuvelle team.">
      <BlogArticlePage locale={locale} article={article} />
    </BlogShell>
  );
}

export function blogListMetadata(locale: LocaleKey) {
  return metadataForBlogList(locale, { kind: "list" }, "Nuvelle Blog", "Stories, product updates, and ideas from the Nuvelle team.");
}

export function blogCategoryMetadata(locale: LocaleKey, slug: string) {
  return metadataForBlogList(locale, { kind: "category", slug }, `Nuvelle Blog: ${slug}`, "Browse Nuvelle articles by category.");
}

export function blogSearchMetadata(locale: LocaleKey, query: string) {
  return metadataForBlogList(locale, { kind: "search", query }, "Search Nuvelle Blog", "Search published Nuvelle blog articles.");
}

export async function blogDetailMetadata(locale: LocaleKey, slug: string) {
  const article = await fetchBlogDetail({ locale, slug });
  if (!article) {
    return {};
  }
  return metadataForBlogDetail(locale, article, slug);
}

async function safeListFetch(options: Parameters<typeof fetchBlogList>[0]) {
  try {
    return await fetchBlogList(options);
  } catch {
    return {
      articles: [],
      total: 0,
      pageNum: options.pageNum ?? 1,
      pageSize: options.pageSize ?? 12
    };
  }
}
```

- [ ] **Step 2: Create English blog routes**

Create `nuvelle_website/app/(en)/blog/page.tsx`:

```tsx
import { blogListMetadata, renderBlogList } from "@/lib/blog/page-data";

export const metadata = blogListMetadata("en");

export default async function BlogPage() {
  return renderBlogList("en");
}
```

Create `nuvelle_website/app/(en)/blog/category/[slug]/page.tsx`:

```tsx
import { blogCategoryMetadata, renderBlogCategory } from "@/lib/blog/page-data";

type BlogCategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: BlogCategoryPageProps) {
  const { slug } = await params;
  return blogCategoryMetadata("en", slug);
}

export default async function BlogCategoryPage({ params }: BlogCategoryPageProps) {
  const { slug } = await params;
  return renderBlogCategory("en", slug);
}
```

Create `nuvelle_website/app/(en)/blog/search/page.tsx`:

```tsx
import { blogSearchMetadata, renderBlogSearch } from "@/lib/blog/page-data";

type BlogSearchPageProps = {
  searchParams: Promise<{ value?: string }>;
};

export async function generateMetadata({ searchParams }: BlogSearchPageProps) {
  const { value = "" } = await searchParams;
  return blogSearchMetadata("en", value);
}

export default async function BlogSearchPage({ searchParams }: BlogSearchPageProps) {
  const { value = "" } = await searchParams;
  return renderBlogSearch("en", value);
}
```

Create `nuvelle_website/app/(en)/blog/[slug]/page.tsx`:

```tsx
import { blogDetailMetadata, renderBlogDetail } from "@/lib/blog/page-data";

type BlogDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  return blogDetailMetadata("en", slug);
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  return renderBlogDetail("en", slug);
}
```

- [ ] **Step 3: Create localized blog routes**

Create `nuvelle_website/app/[locale]/blog/page.tsx`:

```tsx
import { blogListMetadata, renderBlogList, resolveLocaleParam } from "@/lib/blog/page-data";

type LocalizedBlogPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalizedBlogPageProps) {
  const { locale } = await params;
  return blogListMetadata(await resolveLocaleParam(locale));
}

export default async function LocalizedBlogPage({ params }: LocalizedBlogPageProps) {
  const { locale } = await params;
  return renderBlogList(await resolveLocaleParam(locale));
}
```

Create `nuvelle_website/app/[locale]/blog/category/[slug]/page.tsx`:

```tsx
import { blogCategoryMetadata, renderBlogCategory, resolveLocaleParam } from "@/lib/blog/page-data";

type LocalizedBlogCategoryPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: LocalizedBlogCategoryPageProps) {
  const { locale, slug } = await params;
  return blogCategoryMetadata(await resolveLocaleParam(locale), slug);
}

export default async function LocalizedBlogCategoryPage({ params }: LocalizedBlogCategoryPageProps) {
  const { locale, slug } = await params;
  return renderBlogCategory(await resolveLocaleParam(locale), slug);
}
```

Create `nuvelle_website/app/[locale]/blog/search/page.tsx`:

```tsx
import { blogSearchMetadata, renderBlogSearch, resolveLocaleParam } from "@/lib/blog/page-data";

type LocalizedBlogSearchPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ value?: string }>;
};

export async function generateMetadata({ params, searchParams }: LocalizedBlogSearchPageProps) {
  const [{ locale }, { value = "" }] = await Promise.all([params, searchParams]);
  return blogSearchMetadata(await resolveLocaleParam(locale), value);
}

export default async function LocalizedBlogSearchPage({ params, searchParams }: LocalizedBlogSearchPageProps) {
  const [{ locale }, { value = "" }] = await Promise.all([params, searchParams]);
  return renderBlogSearch(await resolveLocaleParam(locale), value);
}
```

Create `nuvelle_website/app/[locale]/blog/[slug]/page.tsx`:

```tsx
import { blogDetailMetadata, renderBlogDetail, resolveLocaleParam } from "@/lib/blog/page-data";

type LocalizedBlogDetailPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: LocalizedBlogDetailPageProps) {
  const { locale, slug } = await params;
  return blogDetailMetadata(await resolveLocaleParam(locale), slug);
}

export default async function LocalizedBlogDetailPage({ params }: LocalizedBlogDetailPageProps) {
  const { locale, slug } = await params;
  return renderBlogDetail(await resolveLocaleParam(locale), slug);
}
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
pnpm --filter nuvelle_website typecheck
```

Expected: PASS.

- [ ] **Step 5: Build website**

Run:

```bash
pnpm --filter nuvelle_website build
```

Expected: PASS. Build should not require category id environment variables.

- [ ] **Step 6: Commit blog routes**

Run:

```bash
git add nuvelle_website/app nuvelle_website/src/lib/blog/page-data.ts
git commit -m "添加SSR博客路由"
```

Expected: commit succeeds.

---

### Task 8: Convert Website Deployment From Static Export to SSR

**Files:**
- Modify: `nuvelle_website/next.config.mjs`
- Modify: `nuvelle_website/package.json`
- Create: `deploy/Dockerfile.website`
- Create: `deploy/cloudbuild-website.yaml`
- Modify: `deploy/google-cloud.sh`
- Modify: `deploy/README-google-cloud.md`

- [ ] **Step 1: Update Next config and start script**

Modify `nuvelle_website/next.config.mjs`:

```js
/** @type {import("next").NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  }
};

export default nextConfig;
```

Modify `nuvelle_website/package.json` scripts:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start -H 0.0.0.0 -p ${PORT:-8080}",
  "typecheck": "tsc --noEmit",
  "test": "vitest"
}
```

- [ ] **Step 2: Add website Dockerfile**

Create `deploy/Dockerfile.website`:

```dockerfile
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nuvelle_website/package.json nuvelle_website/package.json
RUN pnpm install --prod --filter nuvelle_website --frozen-lockfile

COPY nuvelle_website/.next nuvelle_website/.next
COPY nuvelle_website/public nuvelle_website/public
COPY nuvelle_website/next.config.mjs nuvelle_website/next.config.mjs
COPY nuvelle_website/package.json nuvelle_website/package.json

WORKDIR /app/nuvelle_website
EXPOSE 8080

CMD ["pnpm", "start"]
```

- [ ] **Step 3: Add website Cloud Build config**

Create `deploy/cloudbuild-website.yaml`:

```yaml
steps:
  - name: gcr.io/cloud-builders/docker
    args:
      - build
      - -f
      - deploy/Dockerfile.website
      - -t
      - ${_IMAGE}
      - .
images:
  - ${_IMAGE}
substitutions:
  _IMAGE: us-west1-docker.pkg.dev/nuvelle/nuvelle/nuvelle-website:manual
```

- [ ] **Step 4: Update deployment script for website SSR**

Modify `deploy/google-cloud.sh`:

Change `FRONTEND_APPS` website entry from:

```bash
"website:$WEBSITE_SERVICE:nuvelle_website:nuvelle_website/out"
```

to:

```bash
"website:$WEBSITE_SERVICE:nuvelle_website:ssr"
```

Add after `prepare_static_context`:

```bash
prepare_website_context() {
  local context="$1"

  rm -rf "$context"
  mkdir -p "$context/deploy" "$context/nuvelle_website"

  cp package.json pnpm-lock.yaml pnpm-workspace.yaml "$context/"
  cp deploy/Dockerfile.website "$context/deploy/Dockerfile.website"
  cp deploy/cloudbuild-website.yaml "$context/deploy/cloudbuild-website.yaml"
  cp nuvelle_website/package.json "$context/nuvelle_website/package.json"
  cp nuvelle_website/next.config.mjs "$context/nuvelle_website/next.config.mjs"
  rsync -a --delete nuvelle_website/.next "$context/nuvelle_website/"
  rsync -a --delete nuvelle_website/public "$context/nuvelle_website/"
}
```

Add a website deploy function:

```bash
deploy_website_service() {
  local service="$1"
  local image="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$service:$TAG"
  local context="$BUILD_DIR/website-$service"

  prepare_website_context "$context"
  submit_cloud_build "$context" "$context/deploy/cloudbuild-website.yaml" "_IMAGE=$image"

  gcloud run deploy "$service" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --image="$image" \
    --allow-unauthenticated \
    --port=8080 \
    --cpu=1 \
    --memory=512Mi \
    --min-instances=0 \
    --max-instances=4 \
    --set-env-vars="BLOG_SITE_KEY=${BLOG_SITE_KEY:-nuvelle.ai},NEXT_PUBLIC_SITE_ORIGIN=https://$DOMAIN_ROOT"
}
```

Update `deploy_static_services()` loop so website uses SSR:

```bash
if [[ "$mode" == "website" ]]; then
  deploy_website_service "$service"
else
  deploy_static_service "$service" "$site_dir"
fi
```

Update `deploy_frontend_app()` similarly:

```bash
if [[ "$mode" == "website" ]]; then
  deploy_website_service "$service"
else
  deploy_static_service "$service" "$site_dir"
fi
```

- [ ] **Step 5: Update deployment docs**

Modify `deploy/README-google-cloud.md` service table row:

```md
| `nuvelle-website` | `nuvelle_website/.next` SSR service |
```

Add blog environment section:

```md
## Website Blog Runtime

The public website is a Next.js SSR Cloud Run service because `/blog` pages fetch
VOC/Shulex blog content server-side for crawlable HTML.

Runtime defaults:

```bash
BLOG_SITE_KEY=nuvelle.ai
NEXT_PUBLIC_SITE_ORIGIN=https://nuvelle.ai
BLOG_SLX_HOST=https://apps.voc.ai
BLOG_PAGE_SIZE=12
```

Optional category filters can be set when the backend provides ids:

```bash
BLOG_CATEGORY_IDS_EN=1,2
BLOG_CATEGORY_IDS_CN=3
BLOG_CATEGORY_IDS_JP=4
BLOG_CATEGORY_IDS_DE=5
BLOG_CATEGORY_IDS_FR=6
BLOG_CATEGORY_IDS_ES=7
BLOG_CATEGORY_IDS_PT=8
```
```

- [ ] **Step 6: Run local website build**

Run:

```bash
pnpm --filter nuvelle_website build
```

Expected: PASS and produce `nuvelle_website/.next`.

- [ ] **Step 7: Run shell syntax check**

Run:

```bash
bash -n deploy/google-cloud.sh
```

Expected: PASS with no output.

- [ ] **Step 8: Commit deployment changes**

Run:

```bash
git add nuvelle_website/next.config.mjs nuvelle_website/package.json deploy/Dockerfile.website deploy/cloudbuild-website.yaml deploy/google-cloud.sh deploy/README-google-cloud.md
git commit -m "改造官网为SSR部署"
```

Expected: commit succeeds.

---

### Task 9: Final Verification

**Files:**
- Verify all touched files.

- [ ] **Step 1: Run website unit tests**

Run:

```bash
pnpm --filter nuvelle_website test --run
```

Expected: PASS.

- [ ] **Step 2: Run website typecheck**

Run:

```bash
pnpm --filter nuvelle_website typecheck
```

Expected: PASS.

- [ ] **Step 3: Run website build**

Run:

```bash
pnpm --filter nuvelle_website build
```

Expected: PASS.

- [ ] **Step 4: Start website server**

Run:

```bash
PORT=3000 pnpm --filter nuvelle_website start
```

Expected: server listens on `http://localhost:3000`.

- [ ] **Step 5: Verify SSR blog HTML with curl**

In a second terminal:

```bash
curl -s http://localhost:3000/blog | rg "Nuvelle Blog|canonical|application/ld\\+json|No articles yet"
curl -s http://localhost:3000/cn/blog | rg "Nuvelle Blog|canonical|application/ld\\+json|No articles yet"
curl -s 'http://localhost:3000/de/blog/search?value=ai' | rg "Search Nuvelle Blog|canonical|application/ld\\+json"
```

Expected: each command prints matching HTML from the server response.

- [ ] **Step 6: Verify html lang**

Run:

```bash
curl -s http://localhost:3000/ | rg '<html lang="en"'
curl -s http://localhost:3000/cn | rg '<html lang="zh"'
curl -s http://localhost:3000/jp/blog | rg '<html lang="ja"'
```

Expected: each command prints the expected `<html lang>` tag.

- [ ] **Step 7: Verify deployment script syntax**

Run:

```bash
bash -n deploy/google-cloud.sh
```

Expected: PASS with no output.

- [ ] **Step 8: Review git status and commit final fixes if any**

Run:

```bash
git status --short
```

Expected: no unstaged implementation changes except pre-existing user-owned files such as `AGENTS.md`.

If final verification fixes were needed, run:

```bash
git add <fixed-files>
git commit -m "修复官网博客验收问题"
```

Expected: commit succeeds only when there are actual final fixes.

---

## Self-Review

- Spec coverage: The plan covers multilingual homepage routes, SSR blog list/category/search/detail pages, configurable `BLOG_SITE_KEY` and category ids, canonical/hreflang metadata, JSON-LD, sanitizer, and deployment changes required by SSR.
- Placeholder scan: The plan uses concrete file paths, commands, and code snippets. It does not contain incomplete implementation markers.
- Type consistency: Locale keys are consistently `en | cn | jp | de | fr | es | pt`; blog route helpers use one `BlogRoute` union; API functions consistently accept `LocaleKey`.
