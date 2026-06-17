import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell, type AdminTab } from "@/components/admin-shell";
import { BackendSettings } from "@/components/backend-settings";
import { BoardView } from "@/components/board-view";
import { GeneratedLibrary } from "@/components/generated-library";
import { LoginGate } from "@/components/login-gate";
import { SwipeView } from "@/components/swipe-view";
import { clearAuthState, loadAuthState, saveAuthState, type AuthState } from "@/lib/auth";
import { DEFAULT_BACKEND_URL, PromoBackendClient } from "@/lib/backend";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { loadBackendUrl, saveBackendUrl } from "@/lib/storage";
import { nuvelleScore } from "@/lib/scoring";
import type {
  AuthResponse,
  DramaEpisodeRecord,
  DramaRecord,
  GeneratedJob,
  LoginRequest,
  PromoRequest,
  RegisterRequest,
  VoteVerdict
} from "@/types/drama";

type EpisodeCandidate = {
  id?: number;
  episode_no: number;
  play_url?: string | null;
  poster_url?: string | null;
};

function toEpisodeRecords(drama: DramaRecord): EpisodeCandidate[] {
  if (Array.isArray(drama.episode_list) && drama.episode_list.length) {
    return drama.episode_list;
  }

  if (Array.isArray(drama.episodes)) {
    return drama.episodes;
  }

  if (drama.episodes && typeof drama.episodes === "object") {
    return Object.entries(drama.episodes).map(([episode, url]) => ({
      episode_no: Number(episode),
      play_url: url
    }));
  }

  if (drama.video_url) {
    return [{ episode_no: 1, play_url: drama.video_url }];
  }

  return [];
}

function firstPlayableEpisode(drama: DramaRecord, episodeNo?: number, videoUrl?: string | null): EpisodeCandidate | null {
  if (videoUrl) {
    return { episode_no: episodeNo || 1, play_url: videoUrl };
  }

  const episodes = toEpisodeRecords(drama);
  const requested = episodeNo ? episodes.find((episode) => episode.episode_no === episodeNo) : null;
  return requested || episodes.find((episode) => Boolean(episode.play_url)) || null;
}

function normalizeDrama(raw: DramaRecord): DramaRecord {
  const episodeList = toEpisodeRecords(raw)
    .map((episode) => ({
      id: episode.id ?? episode.episode_no,
      episode_no: episode.episode_no,
      play_url: episode.play_url ?? null,
      poster_url: episode.poster_url ?? null
    }))
    .sort((a, b) => a.episode_no - b.episode_no) as DramaEpisodeRecord[];
  const firstPlayUrl = episodeList.find((episode) => episode.play_url)?.play_url || raw.video_url || null;

  return {
    ...raw,
    episode_list: episodeList,
    video_url: firstPlayUrl,
    has_video: raw.has_video ?? Boolean(firstPlayUrl)
  };
}

function sortDramas(dramas: DramaRecord[]): DramaRecord[] {
  return [...dramas].sort((a, b) => Number(Boolean(b.has_video || b.video_url)) - Number(Boolean(a.has_video || a.video_url)));
}

function toAssetUrl(baseUrl: string, value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${baseUrl}${value.startsWith("/") ? value : `/${value}`}`;
}

function authFromResponse(response: AuthResponse): AuthState {
  return {
    token: response.access_token,
    user: response.user
  };
}

export default function App() {
  return (
    <I18nProvider>
      <AdminApp />
    </I18nProvider>
  );
}

function AdminApp() {
  const { t } = useI18n();
  const [auth, setAuth] = useState<AuthState>(() => loadAuthState());
  const [backendUrl, setBackendUrl] = useState(() => loadBackendUrl());
  const [backendSettingsOpen, setBackendSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("board");
  const [dramas, setDramas] = useState<DramaRecord[]>([]);
  const [swipeDrama, setSwipeDrama] = useState<DramaRecord | null>(null);
  const [votes, setVotes] = useState<Record<string, VoteVerdict>>({});
  const [generated, setGenerated] = useState<GeneratedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const client = useMemo(() => new PromoBackendClient(backendUrl, undefined, auth.token || undefined), [auth.token, backendUrl]);

  const showStatus = useCallback((message: string) => {
    setStatus(message);
  }, []);

  useEffect(() => {
    if (!status) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setStatus(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const applyAuth = useCallback((response: AuthResponse) => {
    const next = authFromResponse(response);
    saveAuthState(next);
    setAuth(next);
  }, []);

  const loadBoard = useCallback(async () => {
    setLoading(true);

    try {
      const response = await client.listAdminDramas();
      setDramas(sortDramas(response.items.map(normalizeDrama)));
    } catch {
      showStatus(t("app.libraryLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [client, showStatus, t]);

  const loadGenerated = useCallback(async () => {
    try {
      const response = await client.listGenerated();
      setGenerated(response.items);
    } catch {
      setGenerated([]);
    }
  }, [client]);

  const loadSwipeNext = useCallback(async () => {
    try {
      const next = await client.swipeNext();
      const detail = await client.getAdminDrama(next.id);
      setSwipeDrama(normalizeDrama(detail));
    } catch {
      setSwipeDrama(null);
    }
  }, [client]);

  useEffect(() => {
    if (!auth.token) {
      return;
    }

    void loadBoard();
    void loadGenerated();
  }, [auth.token, loadBoard, loadGenerated]);

  useEffect(() => {
    if (!auth.token) {
      return;
    }

    if (activeTab === "swipe") {
      void loadSwipeNext();
    }

    if (activeTab === "generated") {
      void loadGenerated();
    }
  }, [activeTab, auth.token, loadGenerated, loadSwipeNext]);

  const login = useCallback(
    async (payload: LoginRequest) => {
      applyAuth(await client.login(payload));
    },
    [applyAuth, client]
  );

  const register = useCallback(
    async (payload: RegisterRequest) => {
      applyAuth(await client.register(payload));
    },
    [applyAuth, client]
  );

  const signOut = useCallback(() => {
    clearAuthState();
    setAuth({ token: "", user: null });
    setDramas([]);
    setSwipeDrama(null);
    setVotes({});
    setGenerated([]);
  }, []);

  const saveBackend = useCallback(
    (url: string) => {
      const normalized = url.trim() || DEFAULT_BACKEND_URL;
      saveBackendUrl(normalized);
      setBackendUrl(loadBackendUrl());
      setBackendSettingsOpen(false);
      showStatus(t("app.backendSaved"));
    },
    [showStatus, t]
  );

  const vote = useCallback(
    (drama: DramaRecord, verdict: VoteVerdict) => {
      setVotes((current) => ({ ...current, [String(drama.id)]: verdict }));
      if (activeTab === "swipe") {
        setSwipeDrama(null);
      }

      void client
        .postDramaEvent({
          drama_id: drama.id,
          event_type: "vote",
          verdict,
          score: nuvelleScore(drama)
        })
        .then(() => {
          if (activeTab === "swipe") {
            void loadSwipeNext();
          }
        })
        .catch((error: unknown) => {
          console.error("Drama event sync failed", error);
          showStatus(t("app.dramaEventFailed"));
        });
    },
    [activeTab, client, loadSwipeNext, showStatus, t]
  );

  const markSeen = useCallback(
    (drama: DramaRecord) => {
      if (activeTab === "swipe") {
        setSwipeDrama(null);
      }

      void client
        .postDramaEvent({
          drama_id: drama.id,
          event_type: "seen",
          metadata: { source: "swipe" }
        })
        .then(() => {
          if (activeTab === "swipe") {
            void loadSwipeNext();
          }
        })
        .catch((error: unknown) => {
          console.error("Drama seen event sync failed", error);
          showStatus(t("app.dramaEventFailed"));
        });
    },
    [activeTab, client, loadSwipeNext, showStatus, t]
  );

  const resolveDramaForGeneration = useCallback(
    async (drama: DramaRecord, episode?: number, videoUrl?: string | null) => {
      if (firstPlayableEpisode(drama, episode, videoUrl)) {
        return drama;
      }

      const detail = await client.getAdminDrama(drama.id);
      return normalizeDrama(detail);
    },
    [client]
  );

  const generatePromo = useCallback(
    async (request: PromoRequest) => {
      return client.generatePromo<{
        id?: string;
        job_id?: string;
        files?: { teaser?: string | null; cover?: string | null } | null;
        caption?: string | null;
        status?: string;
        title?: string | null;
      }>(request);
    },
    [client]
  );

  const generateForDrama = useCallback(
    async (drama: DramaRecord, duration: number, prompt = "", episode?: number, videoUrl?: string | null) => {
      try {
        const detail = await resolveDramaForGeneration(drama, episode, videoUrl);
        const selectedEpisode = firstPlayableEpisode(detail, episode, videoUrl);

        if (!selectedEpisode?.play_url) {
          showStatus(t("app.noVideoToGenerate"));
          return;
        }

        const episodeNo = selectedEpisode.episode_no || episode || 1;
        const result = await generatePromo({
          url: selectedEpisode.play_url,
          title: detail.title || t("common.promo"),
          ep: episodeNo,
          dur: duration,
          beats: [],
          prompt,
          cover_image: detail.cover_image_url || selectedEpisode.poster_url || undefined,
          drama_id: detail.id,
          episode_id: selectedEpisode.id
        });

        const jobId = result.job_id || result.id;
        setGenerated((current) => [
          {
            id: jobId || `${detail.id}-${Date.now()}`,
            job_id: jobId || `${detail.id}-${Date.now()}`,
            status: result.status || "queued",
            title: result.title || detail.title || t("common.promo"),
            episode: episodeNo,
            duration,
            source_url: selectedEpisode.play_url,
            prompt,
            caption: result.caption || null,
            files: result.files || null,
            drama: { id: Number(detail.id), title: detail.title || t("common.untitled") },
            episode_ref: selectedEpisode.id ? { id: selectedEpisode.id, episode_no: episodeNo } : null
          },
          ...current
        ]);
        void loadGenerated();
        showStatus(jobId ? t("app.promoJobSubmitted") : t("app.promoRequestSubmitted"));
      } catch {
        showStatus(t("app.cantReachGenerator"));
      }
    },
    [generatePromo, loadGenerated, resolveDramaForGeneration, showStatus, t]
  );

  const generateBatch = useCallback(
    async (drama: DramaRecord, duration: number) => {
      try {
        const detail = await resolveDramaForGeneration(drama);
        const items = toEpisodeRecords(detail)
          .filter((episode) => Boolean(episode.play_url))
          .map((episode) => ({
            url: episode.play_url || "",
            title: detail.title || t("common.promo"),
            ep: episode.episode_no,
            dur: duration,
            cover_image: detail.cover_image_url || episode.poster_url || undefined,
            drama_id: detail.id,
            episode_id: episode.id
          }));

        if (!items.length) {
          showStatus(t("app.noBatchEpisodes"));
          return;
        }

        const result = await client.generateBatch<{ batch_id?: string; id?: string }>({ items });
        showStatus(result.batch_id || result.id ? t("app.batchSubmitted") : t("app.batchRequestSubmitted"));
      } catch {
        showStatus(t("app.cantReachGenerator"));
      }
    },
    [client, resolveDramaForGeneration, showStatus, t]
  );

  const activeSwipeDrama =
    swipeDrama || dramas.find((drama) => !votes[String(drama.id)] && Boolean(drama.has_video || drama.video_url)) || null;
  const ratedCount = new Set([...Object.keys(votes), ...dramas.filter((drama) => drama.seen).map((drama) => String(drama.id))]).size;
  const fireCount = Object.values(votes).filter((verdict) => verdict === "fire").length;

  if (!auth.token) {
    return (
      <>
        <LoginGate onLogin={login} onRegister={register} />
        <Toast message={status} />
      </>
    );
  }

  return (
    <AdminShell
      activeTab={activeTab}
      generatedCount={generated.length}
      libraryCount={dramas.length}
      loading={loading}
      picksCount={fireCount}
      ratedCount={ratedCount}
      onBackendSettings={() => setBackendSettingsOpen(true)}
      onSignOut={signOut}
      onTabChange={setActiveTab}
    >
      {activeTab === "swipe" ? (
        <SwipeView current={activeSwipeDrama} onGenerate={generateForDrama} onSeen={markSeen} onVote={vote} />
      ) : null}
      {activeTab === "board" ? (
        <BoardView
          dramas={dramas}
          votes={votes}
          onGenerate={generateForDrama}
          onGenerateBatch={generateBatch}
          onLoadDramaDetail={async (drama) => normalizeDrama(await client.getAdminDrama(drama.id))}
          onVote={vote}
        />
      ) : null}
      {activeTab === "generated" ? (
        <GeneratedLibrary
          assetBaseUrl={backendUrl}
          generated={generated}
          onRegenerate={(item, prompt) => {
            if (!item.source_url) {
              showStatus(t("app.missingSourceVideo"));
              return;
            }

            void generatePromo({
              url: item.source_url,
              title: item.title || t("common.promo"),
              ep: item.episode || 1,
              dur: item.duration || 30,
              prompt,
              cover_image: toAssetUrl(backendUrl, item.files?.cover),
              drama_id: item.drama?.id,
              episode_id: item.episode_ref?.id
            })
              .then(() => {
                void loadGenerated();
                showStatus(t("app.promoJobSubmitted"));
              })
              .catch(() => showStatus(t("app.cantReachGenerator")));
          }}
        />
      ) : null}
      <BackendSettings
        backendUrl={backendUrl}
        open={backendSettingsOpen}
        onOpenChange={setBackendSettingsOpen}
        onSave={saveBackend}
      />
      <Toast message={status} />
    </AdminShell>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div
      aria-live="polite"
      className={[
        "pointer-events-none fixed bottom-7 left-1/2 z-[200] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full border border-white/10 bg-[#1c2030] px-4 py-3 text-center text-sm text-white shadow-xl transition-all",
        message ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
      ].join(" ")}
    >
      {message}
    </div>
  );
}
