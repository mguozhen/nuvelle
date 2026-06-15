import { useState } from "react";
import { ArrowRight, BadgePercent } from "lucide-react";
import { Button } from "@/components/ui/button";

type JoinGateProps = {
  onJoin: (email: string, handle: string) => void;
  onToast: (message: string) => void;
};

export function JoinGate({ onJoin, onToast }: JoinGateProps) {
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");

  const submit = () => {
    const normalizedEmail = email.trim();

    if (!/.+@.+\..+/.test(normalizedEmail)) {
      onToast("Enter a valid email");
      return;
    }

    onJoin(normalizedEmail, handle.trim());
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#1a1030_0%,#080a12_58%,#05060b_100%)] px-5 py-8 text-white">
      <section className="w-full max-w-[420px] text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] text-2xl font-black shadow-xl shadow-fuchsia-950/35">
          N
        </div>
        <h1 className="text-3xl font-bold tracking-normal">
          Nuvelle <span className="bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] bg-clip-text text-transparent">Boost</span>
        </h1>
        <p className="mt-3 text-[14.5px] leading-6 text-[#9aa2c0]">
          Post our viral AI dramas on TikTok. Grab ready-made 13s clips and your personal link. You drive views,
          you earn. Free to join.
        </p>

        <div className="mt-6 grid gap-3">
          <input
            autoComplete="email"
            className="h-12 rounded-[13px] border border-white/10 bg-[#0c0f1a] px-4 text-[15px] text-white outline-none placeholder:text-[#6b7290] focus:border-[#ff5fbf]/60"
            placeholder="your@email.com"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            autoComplete="off"
            className="h-12 rounded-[13px] border border-white/10 bg-[#0c0f1a] px-4 text-[15px] text-white outline-none placeholder:text-[#6b7290] focus:border-[#ff5fbf]/60"
            placeholder="@yourtiktok (optional)"
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
          />
          <Button className="h-12 rounded-[13px] text-base" variant="gradient" onClick={submit}>
            Join free - get my distributor code
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {[
            ["414+", "dramas"],
            ["13s", "ready clips"],
            ["30%", "commission"]
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-[#0e1119] p-3">
              <b className="block bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] bg-clip-text text-xl text-transparent">
                {value}
              </b>
              <span className="text-[11px] text-[#6b7290]">{label}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 inline-flex items-center justify-center gap-2 text-xs leading-5 text-[#6b7290]">
          <BadgePercent className="h-4 w-4" />
          Commission and payout tracking are rolling out in phase 2.
        </p>
      </section>
    </main>
  );
}
