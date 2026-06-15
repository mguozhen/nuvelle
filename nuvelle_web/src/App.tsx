import { useCallback, useEffect, useState } from "react";
import { EarningsView } from "@/components/earnings-view";
import { JoinGate } from "@/components/join-gate";
import { LinksView } from "@/components/links-view";
import { MaterialSquare } from "@/components/material-square";
import { PortalShell, type PortalTab } from "@/components/portal-shell";
import { distributorCode, promoLink } from "@/lib/distributor";
import { clearBoostState, loadBoostState, saveBoostState, type BoostState } from "@/lib/storage";

export default function App() {
  const [state, setState] = useState<BoostState | null>(() => loadBoostState());
  const [activeTab, setActiveTab] = useState<PortalTab>("square");
  const [toast, setToast] = useState("");

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setToast(""), 1700);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const join = useCallback(
    (email: string, handle: string) => {
      const nextState: BoostState = {
        email,
        handle,
        code: distributorCode(email),
        links: []
      };

      saveBoostState(nextState);
      setState(nextState);
      setActiveTab("square");
      showToast("Distributor code reserved");
    },
    [showToast]
  );

  const signOut = useCallback(() => {
    clearBoostState();
    setState(null);
    setActiveTab("square");
  }, []);

  const copyText = useCallback(
    async (text: string, message: string) => {
      try {
        if (!navigator.clipboard) {
          throw new Error("Clipboard unavailable");
        }

        await navigator.clipboard.writeText(text);
        showToast(message);
      } catch {
        showToast("Copy failed");
      }
    },
    [showToast]
  );

  const copyCaption = useCallback(
    async (slug: string) => {
      try {
        const response = await fetch(`/packs/${slug}/caption.txt`);

        if (!response.ok) {
          throw new Error("Caption not found");
        }

        const caption = await response.text();
        await copyText(caption, "Caption and tags copied");
      } catch {
        showToast("Caption not found");
      }
    },
    [copyText, showToast]
  );

  const grabLink = useCallback(
    (slug: string, title: string) => {
      if (!state) {
        return;
      }

      const links = state.links.some((link) => link.slug === slug) ? state.links : [...state.links, { slug, title }];
      const nextState = { ...state, links };
      saveBoostState(nextState);
      setState(nextState);
      void copyText(promoLink(slug, state.code), "Your link copied");
    },
    [copyText, state]
  );

  if (!state) {
    return (
      <>
        <JoinGate onJoin={join} onToast={showToast} />
        <Toast message={toast} />
      </>
    );
  }

  return (
    <PortalShell
      activeTab={activeTab}
      code={state.code}
      email={state.email}
      onSignOut={signOut}
      onTabChange={setActiveTab}
    >
      {activeTab === "square" ? (
        <MaterialSquare code={state.code} onCopyCaption={copyCaption} onGrabLink={grabLink} />
      ) : null}
      {activeTab === "links" ? (
        <LinksView code={state.code} links={state.links} onCopyLink={(slug) => copyText(promoLink(slug, state.code), "Link copied")} />
      ) : null}
      {activeTab === "earn" ? <EarningsView /> : null}
      <Toast message={toast} />
    </PortalShell>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div
      aria-live="polite"
      className={[
        "pointer-events-none fixed bottom-7 left-1/2 z-[200] -translate-x-1/2 rounded-full border border-white/10 bg-[#1c2030] px-4 py-3 text-sm text-white shadow-xl transition-all",
        message ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
      ].join(" ")}
    >
      {message}
    </div>
  );
}
