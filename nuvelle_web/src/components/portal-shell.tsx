import type { ReactNode } from "react";
import { Gift, Link2, LogOut, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PortalTab = "square" | "links" | "earn";

type PortalShellProps = {
  activeTab: PortalTab;
  children: ReactNode;
  code: string;
  email: string;
  onSignOut: () => void;
  onTabChange: (tab: PortalTab) => void;
};

const tabs = [
  { id: "square" as const, label: "Material Square", icon: Gift },
  { id: "links" as const, label: "My Links", icon: Link2 },
  { id: "earn" as const, label: "Earnings", icon: WalletCards }
];

export function PortalShell({ activeTab, children, code, email, onSignOut, onTabChange }: PortalShellProps) {
  return (
    <main className="min-h-screen bg-[#05060b] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0d16]/86 backdrop-blur-xl">
        <div className="mx-auto flex h-[62px] max-w-[1060px] items-center gap-3 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] text-base font-black">
              N
            </div>
            <b className="text-xl font-semibold leading-none">Nuvelle</b>
            <Badge className="border-[#a14bff44] px-2 py-0.5 text-[10px] text-[#ff5fbf]">BOOST</Badge>
          </div>
          <div className="flex-1" />
          <div className="hidden min-w-0 text-right text-xs text-[#9aa2c0] sm:block">
            <div className="truncate">{email}</div>
            <div>your code</div>
          </div>
          <span className="rounded-lg border border-white/10 bg-[#0e1119] px-2.5 py-1.5 font-mono text-xs text-white">
            {code}
          </span>
          <button
            aria-label="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-md text-[#9aa2c0] transition-colors hover:bg-white/10 hover:text-white"
            type="button"
            onClick={onSignOut}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <nav className="sticky top-[62px] z-20 border-b border-white/10 bg-[#0b0d16]">
        <div className="mx-auto flex max-w-[1060px] gap-1 overflow-x-auto px-5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                className={cn(
                  "flex h-[50px] items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors",
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
        </div>
      </nav>

      <div className="mx-auto max-w-[1060px] px-5 py-6 pb-20">{children}</div>
    </main>
  );
}
