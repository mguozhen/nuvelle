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

type PrefixedLocaleKey = Exclude<LocaleKey, "en">;

export function getLocaleByRouteParam(value: undefined): LocaleOption;
export function getLocaleByRouteParam(value: PrefixedLocaleKey): LocaleOption;
export function getLocaleByRouteParam(value: string | string[] | undefined): LocaleOption | null;
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
