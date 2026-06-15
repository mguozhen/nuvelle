import { useCallback, useEffect, useMemo, useState } from "react";
import { DramaSheet } from "@/components/drama-sheet";
import { HomeView } from "@/components/home-view";
import { MobileShell, type MobileTab } from "@/components/mobile-shell";
import { MyListView } from "@/components/my-list-view";
import { ProfileView } from "@/components/profile-view";
import { SearchView } from "@/components/search-view";
import { dramas, getDramaBySlug, heroSlug, rows, top10, type Drama } from "@/data/dramas";
import { getSavedDramas, isSavedDrama, toggleSavedDrama } from "@/lib/my-list";
import { isIosDevice, registerServiceWorker } from "@/lib/pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const toastDuration = 1800;

export default function App() {
  const [activeTab, setActiveTab] = useState<MobileTab>("home");
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null);
  const [savedSlugs, setSavedSlugs] = useState<string[]>(() => getSavedDramas());
  const [toast, setToast] = useState("");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const hero = useMemo(() => getDramaBySlug(heroSlug) ?? dramas[0], []);
  const rankedDramas = useMemo(() => top10.map(getDramaBySlug).filter((drama): drama is Drama => Boolean(drama)), []);
  const dramaRows = useMemo(
    () =>
      Object.entries(rows).map(([title, slugs]) => ({
        title,
        dramas: slugs.map(getDramaBySlug).filter((drama): drama is Drama => Boolean(drama))
      })),
    []
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setToast(""), toastDuration);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      showToast("Installed");
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [showToast]);

  const syncSavedSlugs = useCallback(() => {
    setSavedSlugs(getSavedDramas());
  }, []);

  const handleSelectDrama = useCallback((drama: Drama) => {
    setSelectedDrama(drama);
  }, []);

  const handleToggleSaved = useCallback(
    (slug: string) => {
      const wasSaved = isSavedDrama(slug);
      const next = toggleSavedDrama(slug);
      setSavedSlugs(next);
      showToast(wasSaved ? "Removed from My List" : "Added to My List");
    },
    [showToast]
  );

  const handleWatch = useCallback(
    (drama: Drama) => {
      if (drama.affiliateUrl) {
        window.open(drama.affiliateUrl, "_blank", "noopener,noreferrer");
        return;
      }

      if (!isSavedDrama(drama.slug)) {
        setSavedSlugs(toggleSavedDrama(drama.slug));
      } else {
        syncSavedSlugs();
      }

      showToast("Streaming soon — saved to My List");
    },
    [showToast, syncSavedSlugs]
  );

  const handleInstall = useCallback(() => {
    if (installPrompt) {
      void installPrompt.prompt();
      void installPrompt.userChoice.finally(() => setInstallPrompt(null));
      return;
    }

    showToast(isIosDevice() ? "Use Share, then Add to Home Screen" : "Open browser menu, then Install app");
  }, [installPrompt, showToast]);

  return (
    <MobileShell
      activeTab={activeTab}
      installAvailable={Boolean(installPrompt)}
      toast={toast}
      onInstall={handleInstall}
      onTabChange={(tab) => {
        syncSavedSlugs();
        setActiveTab(tab);
      }}
    >
      {activeTab === "home" ? (
        <HomeView
          hero={hero}
          rows={dramaRows}
          savedSlugs={savedSlugs}
          top10={rankedDramas}
          onSelectDrama={handleSelectDrama}
          onToggleSaved={handleToggleSaved}
        />
      ) : null}
      {activeTab === "search" ? <SearchView onSelectDrama={handleSelectDrama} /> : null}
      {activeTab === "list" ? <MyListView savedSlugs={savedSlugs} onSelectDrama={handleSelectDrama} /> : null}
      {activeTab === "profile" ? <ProfileView onInstall={handleInstall} /> : null}
      <DramaSheet
        drama={selectedDrama}
        saved={selectedDrama ? savedSlugs.includes(selectedDrama.slug) : false}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDrama(null);
          }
        }}
        onToggleSaved={handleToggleSaved}
        onWatch={handleWatch}
      />
    </MobileShell>
  );
}
