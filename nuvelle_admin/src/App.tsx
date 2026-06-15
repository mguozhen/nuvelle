import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell, type AdminTab } from "@/components/admin-shell";
import { BackendSettings } from "@/components/backend-settings";
import { BoardView } from "@/components/board-view";
import { GeneratedLibrary } from "@/components/generated-library";
import { LoginGate } from "@/components/login-gate";
import { SwipeView } from "@/components/swipe-view";
import { DEFAULT_BACKEND_URL, PromoBackendClient } from "@/lib/backend";
import {
  loadAdminState,
  loadBackendUrl,
  saveAdminState,
  saveBackendUrl,
  type AdminState,
  type GeneratedPromo
} from "@/lib/storage";
import { nuvelleScore } from "@/lib/scoring";
import type { DramaRecord, PromoRequest, VoteVerdict } from "@/types/drama";

type VotesResponse = {
  rated?: Array<string | number>;
};

function sortDramas(dramas: DramaRecord[]): DramaRecord[] {
  return [...dramas].sort((a, b) => Number(Boolean(b.video_url)) - Number(Boolean(a.video_url)));
}

function normalizeSeed(raw: DramaRecord[]): DramaRecord[] {
  return sortDramas(raw.map((drama, index) => ({ ...drama, id: drama.id ?? index + 1 })));
}

export default function App() {
  const [adminState, setAdminState] = useState<AdminState>(() => loadAdminState());
  const [backendUrl, setBackendUrl] = useState(() => loadBackendUrl());
  const [backendSettingsOpen, setBackendSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("board");
  const [dramas, setDramas] = useState<DramaRecord[]>([]);
  const [remoteRated, setRemoteRated] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const client = useMemo(() => new PromoBackendClient(backendUrl), [backendUrl]);

  const persistState = useCallback((next: AdminState) => {
    saveAdminState(next);
    setAdminState(next);
  }, []);

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

  useEffect(() => {
    if (!adminState.loggedIn) {
      return;
    }

    let cancelled = false;

    async function loadData() {
      setLoading(true);

      try {
        const response = await fetch("/seed_dramas.json");
        const raw = (await response.json()) as DramaRecord[];

        if (!cancelled) {
          setDramas(normalizeSeed(raw));
        }
      } catch {
        if (!cancelled) {
          showStatus("Seed data failed to load");
        }
      }

      try {
        const votes = await client.getVotes<VotesResponse>();

        if (!cancelled) {
          setRemoteRated(new Set((votes.rated || []).map(String)));
        }
      } catch {
        if (!cancelled) {
          setRemoteRated(new Set());
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [adminState.loggedIn, client, showStatus]);

  const login = useCallback(
    (username: string, password: string): boolean => {
      if (username !== "admin" || password !== "admin") {
        return false;
      }

      persistState({ ...adminState, loggedIn: true });
      return true;
    },
    [adminState, persistState]
  );

  const signOut = useCallback(() => {
    persistState({ ...adminState, loggedIn: false });
  }, [adminState, persistState]);

  const saveBackend = useCallback((url: string) => {
    const normalized = url.trim() || DEFAULT_BACKEND_URL;
    saveBackendUrl(normalized);
    setBackendUrl(loadBackendUrl());
    setBackendSettingsOpen(false);
    showStatus("Backend URL saved");
  }, [showStatus]);

  const vote = useCallback(
    (drama: DramaRecord, verdict: VoteVerdict) => {
      const next: AdminState = {
        ...adminState,
        votes: { ...adminState.votes, [String(drama.id)]: verdict }
      };

      persistState(next);
      setRemoteRated((current) => new Set(current).add(String(drama.id)));
      void client.postVote({ dramaId: drama.id, verdict, score: nuvelleScore(drama) }).catch(() => {
        showStatus("Remote vote sync failed");
      });
    },
    [adminState, client, persistState, showStatus]
  );

  const addGenerated = useCallback(
    (promo: GeneratedPromo) => {
      const next: AdminState = {
        ...adminState,
        generated: [promo, ...adminState.generated].slice(0, 40)
      };

      persistState(next);
    },
    [adminState, persistState]
  );

  const generatePromo = useCallback(
    async (request: PromoRequest, source: Omit<GeneratedPromo, "createdAt" | "status">) => {
      try {
        const result = await client.generatePromo<{
          id?: string;
          job_id?: string;
          files?: { teaser?: string; cover?: string };
          caption?: string;
          status?: string;
        }>(request);
        const jobId = result.job_id || result.id;
        const promo: GeneratedPromo = {
          ...source,
          id: jobId,
          teaserUrl: result.files?.teaser ? `${backendUrl}${result.files.teaser}` : source.teaserUrl,
          coverUrl: result.files?.cover ? `${backendUrl}${result.files.cover}` : source.coverUrl,
          caption: result.caption || source.caption,
          status: result.status || (jobId ? "queued" : "submitted"),
          createdAt: Date.now()
        };

        addGenerated(promo);
        showStatus(jobId ? "Promo job submitted" : "Promo request submitted");
      } catch {
        showStatus("Can't reach the cloud generator. Check backend URL.");
      }
    },
    [addGenerated, backendUrl, client, showStatus]
  );

  const generateForDrama = useCallback(
    (drama: DramaRecord, duration: number, prompt = "", episode = 1, videoUrl = drama.video_url) => {
      if (!videoUrl) {
        showStatus("This drama has no video to generate from");
        return;
      }

      void generatePromo(
        {
          url: videoUrl,
          title: drama.title || "Promo",
          ep: episode,
          dur: duration,
          beats: [],
          prompt,
          cover_image: drama.cover_image_url
        },
        {
          title: `${drama.title || "Promo"} EP${episode}`,
          sourceUrl: videoUrl,
          coverUrl: drama.cover_image_url,
          episode,
          duration,
          prompt
        }
      );
    },
    [generatePromo, showStatus]
  );

  const generateBatch = useCallback(
    async (drama: DramaRecord, duration: number) => {
      const episodes = drama.episodes || (drama.video_url ? { "1": drama.video_url } : {});
      const items = Object.entries(episodes).map(([episode, url]) => ({
        url,
        title: drama.title || "Promo",
        ep: Number(episode),
        dur: duration,
        cover_image: drama.cover_image_url
      }));

      if (!items.length) {
        showStatus("No available episodes for batch generation");
        return;
      }

      try {
        const result = await client.generateBatch<{ batch_id?: string; id?: string }>({ items });
        showStatus(result.batch_id || result.id ? "Batch submitted" : "Batch request submitted");
      } catch {
        showStatus("Can't reach the cloud generator. Check backend URL.");
      }
    },
    [client, showStatus]
  );

  if (!adminState.loggedIn) {
    return (
      <>
        <LoginGate onLogin={login} />
        <Toast message={status} />
      </>
    );
  }

  const ratedCount = Object.keys(adminState.votes).length + remoteRated.size;
  const fireCount = Object.values(adminState.votes).filter((verdict) => verdict === "fire").length;

  return (
    <AdminShell
      activeTab={activeTab}
      generatedCount={adminState.generated.length}
      libraryCount={dramas.length}
      loading={loading}
      picksCount={fireCount}
      ratedCount={ratedCount}
      onBackendSettings={() => setBackendSettingsOpen(true)}
      onSignOut={signOut}
      onTabChange={setActiveTab}
    >
      {activeTab === "swipe" ? (
        <SwipeView
          dramas={dramas}
          remoteRated={remoteRated}
          votes={adminState.votes}
          onGenerate={generateForDrama}
          onVote={vote}
        />
      ) : null}
      {activeTab === "board" ? (
        <BoardView
          dramas={dramas}
          votes={adminState.votes}
          onGenerate={generateForDrama}
          onGenerateBatch={generateBatch}
          onVote={vote}
        />
      ) : null}
      {activeTab === "generated" ? (
        <GeneratedLibrary
          generated={adminState.generated}
          onRegenerate={(item, prompt) => {
            if (!item.sourceUrl) {
              showStatus("Missing source video");
              return;
            }

            void generatePromo(
              {
                url: item.sourceUrl,
                title: item.title || "Promo",
                ep: item.episode || 1,
                dur: item.duration || 30,
                prompt,
                cover_image: item.coverUrl
              },
              { ...item, prompt }
            );
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
