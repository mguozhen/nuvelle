import type { ComponentType, ReactNode } from "react";
import { Bookmark, Download, Home, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileTab = "home" | "search" | "list" | "profile";

type MobileShellProps = {
  activeTab: MobileTab;
  children: ReactNode;
  installAvailable: boolean;
  toast: string;
  onInstall: () => void;
  onTabChange: (tab: MobileTab) => void;
};

const tabs: Array<{ id: MobileTab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "list", label: "My List", icon: Bookmark },
  { id: "profile", label: "Me", icon: UserRound }
];

export function MobileShell({
  activeTab,
  children,
  installAvailable,
  toast,
  onInstall,
  onTabChange
}: MobileShellProps) {
  return (
    <main className="min-h-[100dvh] bg-[#05060b] text-white">
      <section className="relative mx-auto flex h-[100dvh] max-w-[480px] flex-col overflow-hidden bg-[#0b0d16] shadow-[0_0_60px_rgba(0,0,0,0.72)]">
        <header className="z-30 flex items-center gap-3 bg-[#0b0d16]/92 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] text-base font-black shadow-lg shadow-fuchsia-950/35">
              N
            </div>
            <b className="text-[21px] font-semibold leading-none">Nuvelle</b>
          </div>
          <div className="flex-1" />
          {installAvailable ? (
            <button
              className="inline-flex h-9 items-center gap-2 rounded-full bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] px-3.5 text-sm font-semibold text-white"
              type="button"
              onClick={onInstall}
            >
              <Download className="h-4 w-4" />
              Install
            </button>
          ) : null}
        </header>

        <div className="relative flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto overflow-x-hidden pb-[calc(6.75rem+env(safe-area-inset-bottom,0px))] [-webkit-overflow-scrolling:touch]">
            {children}
          </div>
        </div>

        <nav className="z-40 grid grid-cols-4 border-t border-white/10 bg-[#0c0e16]/94 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex h-[68px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
                  selected ? "text-white" : "text-[#6b7290]"
                )}
                type="button"
                onClick={() => onTabChange(tab.id)}
              >
                <Icon className={cn("h-6 w-6", selected ? "text-[#ff5fbf]" : "text-current")} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div
          aria-live="polite"
          className={cn(
            "pointer-events-none absolute bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[70] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full border border-white/10 bg-[#1c2030] px-4 py-3 text-center text-sm text-white shadow-xl transition-all",
            toast ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
          )}
        >
          {toast}
        </div>
      </section>
    </main>
  );
}
