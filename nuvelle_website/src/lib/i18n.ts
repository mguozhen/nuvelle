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

export const categoryRowKeys = ["Hidden Identity", "Magic & Mates", "Love at First Sight", "Revenge & Reversal"] as const;

export type CategoryRowKey = (typeof categoryRowKeys)[number];

export type FooterLinkGroup = {
  heading: string;
  links: string[];
};

export type WebsiteCopy = {
  homeAriaLabel: string;
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
  rowTitles: Record<CategoryRowKey, string>;
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
  footerLinks: FooterLinkGroup[];
};

const englishCopy: WebsiteCopy = {
  homeAriaLabel: "Nuvelle home",
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
  rowTitles: {
    "Hidden Identity": "Hidden Identity",
    "Magic & Mates": "Magic & Mates",
    "Love at First Sight": "Love at First Sight",
    "Revenge & Reversal": "Revenge & Reversal"
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
  },
  footerLinks: [
    { heading: "Explore", links: ["New Releases", "Categories", "Trending", "For Creators"] },
    { heading: "Company", links: ["About Nuvelle", "Careers", "Press", "Contact"] },
    { heading: "Legal", links: ["Terms of Service", "Privacy Policy", "Content Policy", "Support"] }
  ]
};

export const websiteCopy: Record<LocaleKey, WebsiteCopy> = {
  en: englishCopy,
  cn: {
    ...englishCopy,
    homeAriaLabel: "Nuvelle 首页",
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
    footer: { ...englishCopy.footer, description: "AI 短剧之家。每日重塑精品竖屏故事。", tagline: "Every story, reimagined." },
    rowTitles: {
      "Hidden Identity": "隐藏身份",
      "Magic & Mates": "魔法与伴侣",
      "Love at First Sight": "一见钟情",
      "Revenge & Reversal": "复仇逆袭"
    },
    footerLinks: [
      { heading: "探索", links: ["最新上线", "分类", "热门", "创作者"] },
      { heading: "公司", links: ["关于 Nuvelle", "招贤纳士", "媒体报道", "联系我们"] },
      { heading: "法务", links: ["服务条款", "隐私政策", "内容政策", "支持"] }
    ]
  },
  jp: {
    ...englishCopy,
    homeAriaLabel: "Nuvelle ホーム",
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
    modal: { watchEpisode: "第1話を見る", getApp: "アプリを入手", views: "views", free: "無料" },
    rowTitles: {
      "Hidden Identity": "秘密の正体",
      "Magic & Mates": "魔法と運命の相手",
      "Love at First Sight": "一目惚れ",
      "Revenge & Reversal": "復讐と逆転"
    },
    footerLinks: [
      { heading: "探す", links: ["新着作品", "カテゴリ", "トレンド", "クリエイター向け"] },
      { heading: "会社", links: ["Nuvelleについて", "採用情報", "プレス", "お問い合わせ"] },
      { heading: "法務", links: ["利用規約", "プライバシーポリシー", "コンテンツポリシー", "サポート"] }
    ]
  },
  de: {
    ...englishCopy,
    homeAriaLabel: "Nuvelle Home",
    nav: { home: "Home", categories: "Kategorien", fandom: "Fandom", creators: "Creators", blog: "Blog" },
    search: { ...englishCopy.search, placeholder: "Dramen suchen", label: "Dramen suchen" },
    hero: { getApp: "App holen" },
    rows: { newReleases: "Neuheiten", top10: "Top 10 der Woche", secondChance: "Zweite Chance", viewAll: "Alle ansehen" },
    appBand: { ...englishCopy.appBand, title: "Alle Episoden freischalten", accent: "kostenlos in der App." },
    modal: { watchEpisode: "Episode 1 ansehen", getApp: "App holen", views: "Aufrufe", free: "Gratis" },
    rowTitles: {
      "Hidden Identity": "Verborgene Identität",
      "Magic & Mates": "Magie & Gefährten",
      "Love at First Sight": "Liebe auf den ersten Blick",
      "Revenge & Reversal": "Rache & Wendepunkt"
    },
    footerLinks: [
      { heading: "Entdecken", links: ["Neuheiten", "Kategorien", "Trends", "Für Creators"] },
      { heading: "Unternehmen", links: ["Über Nuvelle", "Karriere", "Presse", "Kontakt"] },
      { heading: "Rechtliches", links: ["Nutzungsbedingungen", "Datenschutzrichtlinie", "Inhaltsrichtlinie", "Support"] }
    ]
  },
  fr: {
    ...englishCopy,
    homeAriaLabel: "Accueil Nuvelle",
    nav: { home: "Accueil", categories: "Catégories", fandom: "Fandom", creators: "Créateurs", blog: "Blog" },
    search: { ...englishCopy.search, placeholder: "Rechercher des séries", label: "Rechercher des séries" },
    hero: { getApp: "Obtenir l'app" },
    rows: { newReleases: "Nouveautés", top10: "Top 10 de la semaine", secondChance: "Seconde chance", viewAll: "Tout voir" },
    appBand: { ...englishCopy.appBand, title: "Débloquez tous les épisodes", accent: "gratuitement dans l'app." },
    modal: { watchEpisode: "Regarder l'épisode 1", getApp: "Obtenir l'app", views: "vues", free: "Gratuit" },
    rowTitles: {
      "Hidden Identity": "Identité cachée",
      "Magic & Mates": "Magie & âmes soeurs",
      "Love at First Sight": "Coup de foudre",
      "Revenge & Reversal": "Vengeance & retournement"
    },
    footerLinks: [
      { heading: "Explorer", links: ["Nouveautés", "Catégories", "Tendances", "Pour les créateurs"] },
      { heading: "Entreprise", links: ["À propos de Nuvelle", "Carrières", "Presse", "Contact"] },
      {
        heading: "Légal",
        links: ["Conditions d'utilisation", "Politique de confidentialité", "Politique de contenu", "Support"]
      }
    ]
  },
  es: {
    ...englishCopy,
    homeAriaLabel: "Inicio de Nuvelle",
    nav: { home: "Inicio", categories: "Categorías", fandom: "Fandom", creators: "Creadores", blog: "Blog" },
    search: { ...englishCopy.search, placeholder: "Buscar dramas", label: "Buscar dramas" },
    hero: { getApp: "Obtener app" },
    rows: { newReleases: "Estrenos", top10: "Top 10 de la semana", secondChance: "Segunda oportunidad", viewAll: "Ver todo" },
    appBand: { ...englishCopy.appBand, title: "Desbloquea cada episodio", accent: "gratis en la app." },
    modal: { watchEpisode: "Ver episodio 1", getApp: "Obtener app", views: "vistas", free: "Gratis" },
    rowTitles: {
      "Hidden Identity": "Identidad oculta",
      "Magic & Mates": "Magia y parejas",
      "Love at First Sight": "Amor a primera vista",
      "Revenge & Reversal": "Venganza y giro"
    },
    footerLinks: [
      { heading: "Explorar", links: ["Estrenos", "Categorías", "Tendencias", "Para creadores"] },
      { heading: "Empresa", links: ["Acerca de Nuvelle", "Empleo", "Prensa", "Contacto"] },
      { heading: "Legal", links: ["Términos de servicio", "Política de privacidad", "Política de contenido", "Soporte"] }
    ]
  },
  pt: {
    ...englishCopy,
    homeAriaLabel: "Início da Nuvelle",
    nav: { home: "Início", categories: "Categorias", fandom: "Fandom", creators: "Criadores", blog: "Blog" },
    search: { ...englishCopy.search, placeholder: "Buscar dramas", label: "Buscar dramas" },
    hero: { getApp: "Obter app" },
    rows: { newReleases: "Lançamentos", top10: "Top 10 da semana", secondChance: "Segunda chance", viewAll: "Ver tudo" },
    appBand: { ...englishCopy.appBand, title: "Desbloqueie todos os episódios", accent: "grátis no app." },
    modal: { watchEpisode: "Assistir episódio 1", getApp: "Obter app", views: "visualizações", free: "Grátis" },
    rowTitles: {
      "Hidden Identity": "Identidade oculta",
      "Magic & Mates": "Magia e pares",
      "Love at First Sight": "Amor à primeira vista",
      "Revenge & Reversal": "Vingança e reviravolta"
    },
    footerLinks: [
      { heading: "Explorar", links: ["Lançamentos", "Categorias", "Em alta", "Para criadores"] },
      { heading: "Empresa", links: ["Sobre a Nuvelle", "Carreiras", "Imprensa", "Contato"] },
      { heading: "Legal", links: ["Termos de serviço", "Política de privacidade", "Política de conteúdo", "Suporte"] }
    ]
  }
};
