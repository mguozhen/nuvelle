import type { ReactNode } from "react";
import { Gauge, Library, LogOut, PanelTop, Settings, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminTab = "swipe" | "board" | "generated";

type AdminShellProps = {
  activeTab: AdminTab;
  children: ReactNode;
  generatedCount: number;
  libraryCount: number;
  loading: boolean;
  picksCount: number;
  ratedCount: number;
  onBackendSettings: () => void;
  onSignOut: () => void;
  onTabChange: (tab: AdminTab) => void;
};

const tabs = [
  { id: "swipe" as const, label: "Swipe", icon: Sparkles },
  { id: "board" as const, label: "Board", icon: PanelTop },
  { id: "generated" as const, label: "Generated", icon: Library }
];

export function AdminShell({
  activeTab,
  children,
  generatedCount,
  libraryCount,
  loading,
  picksCount,
  ratedCount,
  onBackendSettings,
  onSignOut,
  onTabChange
}: AdminShellProps) {
  return (
    <main className="min-h-screen bg-[#06070d] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0d16]/86 backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-[1180px] items-center gap-3 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] text-base font-black">
              N
            </div>
            <b className="text-xl font-semibold leading-none">Nuvelle</b>
            <Badge className="border-[#a14bff44] px-2 py-0.5 text-[10px] text-[#ff5fbf]">SCOUT</Badge>
          </div>
          <div className="flex-1" />
          <div className="hidden gap-4 text-xs text-[#9aa2c0] md:flex">
            <span>
              <b className="text-white">{libraryCount}</b> in library
            </span>
            <span>
              <b className="text-white">{ratedCount}</b> rated
            </span>
            <span>
              <b className="text-white">{picksCount}</b> picks
            </span>
            <span>
              <b className="text-white">{generatedCount}</b> generated
            </span>
          </div>
          <Button aria-label="Backend settings" size="sm" variant="outline" onClick={onBackendSettings}>
            <Settings className="h-4 w-4" />
            Backend
          </Button>
          <Button aria-label="Sign out" size="icon" variant="ghost" onClick={onSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <nav className="sticky top-[60px] z-20 border-b border-white/10 bg-[#0b0d16]">
        <div className="mx-auto flex max-w-[1180px] gap-1 overflow-x-auto px-5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                className={cn(
                  "flex h-[50px] items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors",
                  selected ? "border-[#ff5fbf] text-white" : "border-transparent text-[#9aa2c0] hover:text-white"
                )}
                type="button"
                onClick={() => onTabChange(tab.id)}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
          {loading ? (
            <span className="ml-auto hidden items-center gap-2 text-xs text-[#9aa2c0] sm:flex">
              <Gauge className="h-4 w-4 animate-pulse text-[#ff5fbf]" />
              Loading library
            </span>
          ) : null}
        </div>
      </nav>
      <div className="mx-auto max-w-[1180px] px-5 py-6 pb-20">{children}</div>
    </main>
  );
}
