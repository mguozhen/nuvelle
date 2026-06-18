import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "nuvelle-admin-language";

export type Locale = "en" | "zh";

const en = {
  "app.authFailed": "Authentication failed.",
  "app.backendSaved": "Backend URL saved",
  "app.batchRequestSubmitted": "Batch request submitted",
  "app.batchSubmitted": "Batch submitted",
  "app.cantReachGenerator": "Can't reach the cloud generator. Check backend URL.",
  "app.dramaEventFailed": "Drama event sync failed",
  "app.libraryLoadFailed": "Material library failed to load",
  "app.missingSourceVideo": "Missing source video",
  "app.noBatchEpisodes": "No available episodes for batch generation",
  "app.noVideoToGenerate": "This drama has no video to generate from",
  "app.promoJobSubmitted": "Promo job submitted",
  "app.promoRequestSubmitted": "Promo request submitted",
  "backend.description": "Admin API and promo generator endpoint.",
  "backend.save": "Save",
  "backend.title": "Backend URL",
  "batch.close": "Close",
  "batch.download": "Download batch",
  "batch.episodesComplete": "{done}/{total} episodes complete",
  "batch.title": "Batch generation",
  "board.all": "All",
  "board.allLanguages": "All languages",
  "board.allPlatforms": "All platforms",
  "board.allTags": "All tags",
  "board.allVideos": "All videos",
  "board.details": "Details",
  "board.duration": "Duration",
  "board.eps": "{count} eps",
  "board.generated": "Generated {count}",
  "board.generatePromo": "Generate promo",
  "board.noMatch": "No dramas match this filter.",
  "board.promoters": "Promoters {value}",
  "board.published": "Published {value}",
  "board.revenue": "Revenue {value}",
  "board.scoreFormula": "Nuvelle Score = signal + taste + video readiness",
  "board.searchPlaceholder": "Search title or hook",
  "board.title": "Board",
  "board.topPicks": "Top picks",
  "common.dramaCover": "Drama cover",
  "common.dramaVideo": "Drama video",
  "common.embeddedPlayer": "{title} embedded player",
  "common.close": "Close",
  "common.noPreview": "No preview",
  "common.promo": "Promo",
  "common.unknown": "Unknown",
  "common.untitled": "Untitled",
  "common.videoFallback": "Direct video failed. Switched to the ReelShort player.",
  "common.untitledPromo": "Untitled promo",
  "detail.appPromotionLink": "Promotion link",
  "detail.episodes": "Episodes",
  "detail.generate": "Generate",
  "detail.generateAll": "Generate all available episodes",
  "detail.generateCurrent": "Generate current episode",
  "detail.generated": "Generated",
  "detail.markFire": "Mark fire",
  "detail.noEpisodeVideo": "No video",
  "detail.noEpisodeUrls": "No episode URLs found.",
  "detail.play": "Play",
  "detail.playEpisode": "Play EP {episode}",
  "detail.playable": "Playable",
  "detail.promptPlaceholder": "Prompt for this promo",
  "detail.promoters": "Promoters",
  "detail.promotionCode": "Promotion code",
  "detail.published": "Published",
  "detail.revenue": "Revenue",
  "detail.sourceTags": "Source tags",
  "detail.urlPlaceholder": "Paste an episode video URL",
  "generated.cover": "Cover",
  "generated.emptyBody": "Generate a promo from Swipe or Board.",
  "generated.emptyTitle": "No generated material yet",
  "generated.libraryTitle": "Generated library",
  "generated.noPreview": "No preview yet",
  "generated.regen": "Regen",
  "generated.regenPlaceholder": "Regenerate direction",
  "generated.teaser": "Teaser",
  "generation.done": "Generated",
  "generation.downloading": "Preparing {progress}%",
  "generation.queued": "Queued {progress}%",
  "generation.rendering": "Generating {progress}%",
  "language.english": "English",
  "language.label": "Language",
  "language.simplifiedChinese": "Simplified Chinese",
  "login.back": "Back to login",
  "login.createAccount": "Create account",
  "login.email": "email",
  "login.inviteCode": "invite code",
  "login.login": "Login",
  "login.password": "password",
  "login.register": "Register",
  "login.subtitle": "AI Shorts selection dashboard - internal",
  "shell.backend": "Backend",
  "shell.backendSettings": "Backend settings",
  "shell.generated": "Generated",
  "shell.generatedCount": "generated",
  "shell.inLibrary": "in library",
  "shell.loadingLibrary": "Loading library",
  "shell.picks": "picks",
  "shell.rated": "rated",
  "shell.signOut": "Sign out",
  "shell.swipe": "Swipe",
  "shell.board": "Board",
  "swipe.allCaughtUp": "All caught up",
  "swipe.currentQueueRated": "Every drama in the current queue is rated.",
  "swipe.duration": "Duration",
  "swipe.episodes": "{count} episodes",
  "swipe.fire": "Featured",
  "swipe.nextVideo": "Next",
  "swipe.nuvelleScore": "Nuvelle Score {score}",
  "swipe.pass": "Dislike",
  "swipe.solid": "Like"
};

const zh: Record<keyof typeof en, string> = {
  "app.authFailed": "认证失败。",
  "app.backendSaved": "后端地址已保存",
  "app.batchRequestSubmitted": "批量生成请求已提交",
  "app.batchSubmitted": "批量任务已提交",
  "app.cantReachGenerator": "无法连接云端生成器，请检查后端地址。",
  "app.dramaEventFailed": "短剧事件同步失败",
  "app.libraryLoadFailed": "素材库加载失败",
  "app.missingSourceVideo": "缺少源视频",
  "app.noBatchEpisodes": "没有可批量生成的剧集",
  "app.noVideoToGenerate": "这部短剧没有可用于生成的视频",
  "app.promoJobSubmitted": "推广视频任务已提交",
  "app.promoRequestSubmitted": "推广视频请求已提交",
  "backend.description": "Admin API 和推广视频生成器地址。",
  "backend.save": "保存",
  "backend.title": "后端地址",
  "batch.close": "关闭",
  "batch.download": "下载批量资源",
  "batch.episodesComplete": "{done}/{total} 集已完成",
  "batch.title": "批量生成",
  "board.all": "全部",
  "board.allLanguages": "全部语言",
  "board.allPlatforms": "全部平台",
  "board.allTags": "全部标签",
  "board.allVideos": "全部视频",
  "board.details": "详情",
  "board.duration": "时长",
  "board.eps": "{count} 集",
  "board.generated": "已生成 {count}",
  "board.generatePromo": "生成推广视频",
  "board.noMatch": "没有匹配当前筛选条件的短剧。",
  "board.promoters": "推广人数 {value}",
  "board.published": "发布时间 {value}",
  "board.revenue": "收入 {value}",
  "board.scoreFormula": "Nuvelle Score = 信号 + 口味 + 视频可用性",
  "board.searchPlaceholder": "搜索标题或钩子",
  "board.title": "素材库",
  "board.topPicks": "精选",
  "common.dramaCover": "短剧封面",
  "common.dramaVideo": "短剧视频",
  "common.embeddedPlayer": "{title} 内嵌播放器",
  "common.close": "关闭",
  "common.noPreview": "暂无预览",
  "common.promo": "推广",
  "common.unknown": "未知",
  "common.untitled": "未命名",
  "common.videoFallback": "直连视频加载失败，已切换到 ReelShort 播放器。",
  "common.untitledPromo": "未命名推广视频",
  "detail.appPromotionLink": "推广链接",
  "detail.episodes": "剧集",
  "detail.generate": "生成",
  "detail.generateAll": "生成全部可用剧集",
  "detail.generateCurrent": "生成当前选集",
  "detail.generated": "已生成",
  "detail.markFire": "标记爆款",
  "detail.noEpisodeVideo": "无视频",
  "detail.noEpisodeUrls": "没有找到剧集视频地址。",
  "detail.play": "播放",
  "detail.playEpisode": "播放第 {episode} 集",
  "detail.playable": "可播放",
  "detail.promptPlaceholder": "这条推广视频的提示词",
  "detail.promoters": "推广人数",
  "detail.promotionCode": "推广码",
  "detail.published": "发布时间",
  "detail.revenue": "收入",
  "detail.sourceTags": "来源标签",
  "detail.urlPlaceholder": "粘贴某集视频地址",
  "generated.cover": "封面",
  "generated.emptyBody": "从刷剧或素材库里生成一个推广视频。",
  "generated.emptyTitle": "还没有生成资源",
  "generated.libraryTitle": "生成资源库",
  "generated.noPreview": "暂无预览",
  "generated.regen": "重生成",
  "generated.regenPlaceholder": "重生成方向",
  "generated.teaser": "视频",
  "generation.done": "已生成",
  "generation.downloading": "准备中 {progress}%",
  "generation.queued": "排队中 {progress}%",
  "generation.rendering": "生成中 {progress}%",
  "language.english": "English",
  "language.label": "语言",
  "language.simplifiedChinese": "简体中文",
  "login.back": "返回登录",
  "login.createAccount": "创建账号",
  "login.email": "邮箱",
  "login.inviteCode": "邀请码",
  "login.login": "登录",
  "login.password": "密码",
  "login.register": "注册",
  "login.subtitle": "AI 短剧遴选后台 - 内部",
  "shell.backend": "后端",
  "shell.backendSettings": "后端设置",
  "shell.generated": "生成资源",
  "shell.generatedCount": "生成资源",
  "shell.inLibrary": "素材",
  "shell.loadingLibrary": "正在加载素材库",
  "shell.picks": "精选",
  "shell.rated": "已评",
  "shell.signOut": "退出登录",
  "shell.swipe": "刷剧",
  "shell.board": "素材库",
  "swipe.allCaughtUp": "已经刷完",
  "swipe.currentQueueRated": "当前队列里的短剧都已经评过。",
  "swipe.duration": "时长",
  "swipe.episodes": "{count} 集",
  "swipe.fire": "精选",
  "swipe.nextVideo": "下一个",
  "swipe.nuvelleScore": "Nuvelle Score {score}",
  "swipe.pass": "点踩",
  "swipe.solid": "点赞"
};

const messages = { en, zh };

export type TranslationKey = keyof typeof en;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  formatCompact: (value?: number | null) => string;
  formatDate: (value?: string | null) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "zh" ? "zh" : "en";
  } catch {
    return "en";
  }
}

function interpolate(message: string, values?: Record<string, string | number>): string {
  if (!values) {
    return message;
  }

  return Object.entries(values).reduce((current, [key, value]) => current.split(`{${key}}`).join(String(value)), message);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // localStorage is not always available in embedded test or preview environments.
    }
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
  }, []);

  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) => interpolate(messages[locale][key], values),
    [locale]
  );

  const formatCompact = useCallback(
    (value?: number | null) => {
      if (value === null || value === undefined) {
        return "-";
      }

      return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en", {
        notation: "compact",
        maximumFractionDigits: 1
      }).format(value);
    },
    [locale]
  );

  const formatDate = useCallback(
    (value?: string | null) => {
      if (!value) {
        return "-";
      }

      return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }).format(new Date(value));
    },
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, formatCompact, formatDate }),
    [formatCompact, formatDate, locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}
