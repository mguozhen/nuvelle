import { Bell, BadgeDollarSign, ChevronRight, Download, Globe2, Info, Moon } from "lucide-react";

type ProfileViewProps = {
  onInstall: () => void;
};

const rows = [
  { label: "Notifications", value: "", icon: Bell },
  { label: "Always dark", value: "On", icon: Moon },
  { label: "Coins & unlocks", value: "", icon: BadgeDollarSign },
  { label: "Visit nuvelle.ai", value: "", icon: Globe2, href: "https://nuvelle.ai" },
  { label: "About Nuvelle", value: "", icon: Info }
];

export function ProfileView({ onInstall }: ProfileViewProps) {
  return (
    <div>
      <div className="px-4 pb-2 pt-3">
        <h1 className="text-2xl font-bold tracking-normal">Profile</h1>
      </div>

      <section className="mx-4 mt-3 flex items-center gap-3.5 rounded-[18px] border border-white/10 bg-[linear-gradient(150deg,#1a1030,#10131f)] p-5">
        <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] text-2xl font-bold">
          N
        </div>
        <div>
          <h2 className="text-lg font-semibold">Nuvelle Guest</h2>
          <p className="text-[12.5px] text-[#9aa2c0]">Free member - Sign in to sync</p>
        </div>
      </section>

      <section className="mx-4 mt-4 flex items-center gap-3 rounded-[14px] border border-[#a14bff33] bg-[#a14bff14] p-3.5">
        <Download className="h-5 w-5 flex-none text-[#ff5fbf]" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Install Nuvelle</h2>
          <p className="mt-0.5 text-xs leading-5 text-[#9aa2c0]">Add to your home screen. Full-screen, offline-ready.</p>
        </div>
        <button
          className="h-9 flex-none rounded-full bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] px-3.5 text-sm font-semibold text-white"
          type="button"
          onClick={onInstall}
        >
          Install
        </button>
      </section>

      <section className="mx-4 mt-3">
        {rows.map((row) => {
          const Icon = row.icon;
          const content = (
            <>
              <Icon className="h-5 w-5 flex-none text-[#9aa2c0]" />
              <span className="min-w-0 flex-1 text-left">{row.label}</span>
              {row.value ? <span className="text-[#6b7290]">{row.value}</span> : <ChevronRight className="h-4 w-4 text-[#6b7290]" />}
            </>
          );

          if (row.href) {
            return (
              <a
                key={row.label}
                className="flex min-h-[54px] items-center gap-3 border-b border-white/10 py-2 text-[15px]"
                href={row.href}
              >
                {content}
              </a>
            );
          }

          return (
            <button
              key={row.label}
              className="flex min-h-[54px] w-full items-center gap-3 border-b border-white/10 py-2 text-[15px]"
              type="button"
            >
              {content}
            </button>
          );
        })}
      </section>

      <p className="mt-8 px-4 text-center text-[13.5px] text-[#9aa2c0]">Nuvelle - the home of AI shorts - v1.0</p>
    </div>
  );
}
