import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell, type AdminTab } from "@/components/admin-shell";
import { BackendSettings } from "@/components/backend-settings";
import { BoardView, type BoardFilters } from "@/components/board-view";
import { GeneratedLibrary } from "@/components/generated-library";
import { LoginGate } from "@/components/login-gate";
import { SwipeView } from "@/components/swipe-view";
import { clearAuthState, loadAuthState, saveAuthState, type AuthState } from "@/lib/auth";
import { DEFAULT_BACKEND_URL, PromoBackendClient } from "@/lib/backend";
import { generationLabel, generationState, isActiveGeneration, preferredGenerationStatus } from "@/lib/generation";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { loadBackendUrl, saveBackendUrl } from "@/lib/storage";
import { nuvelleScore } from "@/lib/scoring";
import type {
  AuthResponse,
  DramaEpisodeRecord,
  DramaRecord,
  GeneratedJob,
  GenerationEpisodeRef,
  GenerationState,
  LoginRequest,
  PromoRequest,
  RegisterRequest,
  VoteVerdict
} from "@/types/drama";

type EpisodeCandidate = {
  id?: number;
  episode_no: number;
  iframe_src?: string | null;
  play_url?: string | null;
  poster_url?: string | null;
  generation_status?: string | null;
  generation_progress?: number;
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
      iframe_src: episode.iframe_src ?? null,
      play_url: episode.play_url ?? null,
      poster_url: episode.poster_url ?? null,
      generation_status: episode.generation_status ?? null,
      generation_progress: episode.generation_progress ?? 0
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

const initialBoardFilters: BoardFilters = {
  filter: "video",
  language: "",
  platform: "",
  q: "",
  tag: ""
};

function toBoardQuery(filters: BoardFilters) {
  return {
    q: filters.q.trim() || undefined,
    platform: filters.platform || undefined,
    language: filters.language || undefined,
    tag: filters.tag || undefined,
    has_video: filters.filter === "video" ? true : undefined,
    min_score: filters.filter === "top" ? 70 : undefined
  };
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
  const [boardFilters, setBoardFilters] = useState<BoardFilters>(initialBoardFilters);
  const [dramas, setDramas] = useState<DramaRecord[]>([]);
  const [swipeDrama, setSwipeDrama] = useState<DramaRecord | null>(null);
  const [votes, setVotes] = useState<Record<string, VoteVerdict>>({});
  const [generated, setGenerated] = useState<GeneratedJob[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [generatedLoading, setGeneratedLoading] = useState(false);
  const [swipeLoading, setSwipeLoading] = useState(false);
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

  const updateBoardFilters = useCallback((nextFilters: Partial<BoardFilters>) => {
    setBoardFilters((current) => ({ ...current, ...nextFilters }));
  }, []);

  const loadBoard = useCallback(async (filters: BoardFilters) => {
    setBoardLoading(true);

    try {
      const response = await client.listAdminDramas(toBoardQuery(filters));
      setDramas(sortDramas(response.items.map(normalizeDrama)));
    } catch {
      showStatus(t("app.libraryLoadFailed"));
    } finally {
      setBoardLoading(false);
    }
  }, [client, showStatus, t]);

  const loadGenerated = useCallback(async () => {
    setGeneratedLoading(true);

    try {
      const response = await client.listGenerated();
      setGenerated(response.items);
    } catch {
      setGenerated([]);
    } finally {
      setGeneratedLoading(false);
    }
  }, [client]);

  const loadSwipeNext = useCallback(async () => {
    setSwipeLoading(true);

    try {
      const next = await client.swipeNext();
      const detail = await client.getAdminDrama(next.id);
      setSwipeDrama(normalizeDrama(detail));
    } catch {
      setSwipeDrama(null);
    } finally {
      setSwipeLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (!auth.token) {
      return;
    }

    void loadGenerated();
  }, [auth.token, loadGenerated]);

  useEffect(() => {
    if (!auth.token || !generated.some((item) => isActiveGeneration(item.status))) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      void loadGenerated();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [auth.token, generated, loadGenerated]);

  useEffect(() => {
    if (!auth.token) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      void loadBoard(boardFilters);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [auth.token, boardFilters, loadBoard]);

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
    setBoardFilters(initialBoardFilters);
    setDramas([]);
    setSwipeDrama(null);
    setVotes({});
    setGenerated([]);
    setBoardLoading(false);
    setGeneratedLoading(false);
    setSwipeLoading(false);
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
        setSwipeLoading(true);
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
          setSwipeLoading(false);
        });
    },
    [activeTab, client, loadSwipeNext, showStatus, t]
  );

  const markSeen = useCallback(
    (drama: DramaRecord) => {
      if (activeTab === "swipe") {
        setSwipeDrama(null);
        setSwipeLoading(true);
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
          setSwipeLoading(false);
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
        progress?: number;
        title?: string | null;
      }>(request);
    },
    [client]
  );

  const getGenerationState = useCallback(
    (
      drama: DramaRecord,
      episode?: GenerationEpisodeRef
    ): GenerationState => {
      const dramaId = Number(drama.id);
      const episodeId = episode?.id ? Number(episode.id) : undefined;
      const episodeNo = episode?.episode_no;
      let status = episode?.generation_status || (!episode ? drama.generation_status : null) || null;
      let progress = episode?.generation_progress ?? (!episode ? drama.generation_progress : undefined);

      generated.forEach((item) => {
        if (item.status === "error" || item.drama?.id !== dramaId) {
          return;
        }

        if (episode) {
          const itemEpisodeId = item.episode_ref?.id;
          const itemEpisodeNo = item.episode_ref?.episode_no || item.episode;
          const sameEpisode = episodeId ? itemEpisodeId === episodeId : itemEpisodeNo === episodeNo;
          if (!sameEpisode) {
            return;
          }
        }

        const nextStatus = preferredGenerationStatus(status, item.status);
        if (nextStatus !== status) {
          status = nextStatus;
          progress = item.progress;
        }
      });

      const state = generationState(status, progress);
      if (!episode && !state.disabled && Number(drama.generated_count || 0) > 0) {
        return generationState("done", 100);
      }
      return state;
    },
    [generated]
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
        const currentGeneration = getGenerationState(detail, {
          id: selectedEpisode.id ?? episodeNo,
          episode_no: episodeNo,
          generation_status: selectedEpisode.generation_status ?? null,
          generation_progress: selectedEpisode.generation_progress ?? 0
        });
        if (currentGeneration.disabled) {
          showStatus(generationLabel(t, currentGeneration, t("app.promoJobSubmitted")));
          return;
        }

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
            progress: result.progress || 5,
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
    [generatePromo, getGenerationState, loadGenerated, resolveDramaForGeneration, showStatus, t]
  );

  const generateBatch = useCallback(
    async (drama: DramaRecord, duration: number) => {
      try {
        const detail = await resolveDramaForGeneration(drama);
        const items = toEpisodeRecords(detail)
          .filter((episode) => Boolean(episode.play_url))
          .filter((episode) => !getGenerationState(detail, episode).disabled)
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
    [client, getGenerationState, resolveDramaForGeneration, showStatus, t]
  );

  const activeSwipeDrama = swipeDrama;
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
      loading={boardLoading}
      picksCount={fireCount}
      ratedCount={ratedCount}
      onBackendSettings={() => setBackendSettingsOpen(true)}
      onSignOut={signOut}
      onTabChange={setActiveTab}
    >
      {activeTab === "swipe" ? (
        <SwipeView
          current={activeSwipeDrama}
          isLoading={swipeLoading && !activeSwipeDrama}
          onGenerate={generateForDrama}
          getGenerationState={getGenerationState}
          onSeen={markSeen}
          onVote={vote}
        />
      ) : null}
      {activeTab === "board" ? (
        <BoardView
          dramas={dramas}
          filters={boardFilters}
          isLoading={boardLoading}
          votes={votes}
          onGenerate={generateForDrama}
          onGenerateBatch={generateBatch}
          getGenerationState={getGenerationState}
          onFiltersChange={updateBoardFilters}
          onLoadDramaDetail={async (drama) => normalizeDrama(await client.getAdminDrama(drama.id))}
          onVote={vote}
        />
      ) : null}
      {activeTab === "generated" ? (
        <GeneratedLibrary
          assetBaseUrl={backendUrl}
          generated={generated}
          isLoading={generatedLoading}
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
