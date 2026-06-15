import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function App() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto flex min-h-[72vh] max-w-5xl flex-col justify-center gap-6">
        <Badge>Web</Badge>
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase text-white/45">Nuvelle</p>
          <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">Nuvelle Web</h1>
        </div>
        <div>
          <Button variant="gradient">Ready</Button>
        </div>
      </section>
    </main>
  );
}
