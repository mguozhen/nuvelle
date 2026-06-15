import { Badge } from "@/components/ui/badge";

const kpis = [
  ["0", "Clicks"],
  ["0", "Unlocks"],
  ["$0.00", "Commission"],
  ["$0.00", "Pending payout"]
];

export function EarningsView() {
  return (
    <section>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">Earnings</h1>
        <Badge className="border-[#ffc16b33] bg-[#ffc16b18] text-[#ffc16b]">DEMO DATA - phase 2</Badge>
      </div>
      <p className="mt-1 text-sm text-[#9aa2c0]">
        Live click and commission tracking ships with the backend. This is a preview of your dashboard.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([value, label]) => (
          <article key={label} className="rounded-[14px] border border-white/10 bg-[linear-gradient(160deg,#141826,#0d0f17)] p-4">
            <b className="block bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] bg-clip-text text-2xl text-transparent">
              {value}
            </b>
            <span className="mt-1 block text-xs text-[#6b7290]">{label}</span>
          </article>
        ))}
      </div>

      <p className="mt-5 text-sm leading-6 text-[#9aa2c0]">
        Top distributors leaderboard, tiered commission, and PayPal or USDC payout are coming next.
      </p>
    </section>
  );
}
