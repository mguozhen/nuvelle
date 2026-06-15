import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function App() {
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-8 text-white">
      <section className="mx-auto flex min-h-[72vh] max-w-md flex-col justify-center gap-6">
        <Badge>Mobile</Badge>
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase text-white/45">Nuvelle</p>
          <h1 className="text-3xl font-semibold tracking-normal">Nuvelle Mobile</h1>
        </div>
        <div>
          <Button variant="gradient">Ready</Button>
        </div>
      </section>
    </main>
  );
}
