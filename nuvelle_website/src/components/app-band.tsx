import { Apple, Play, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppBand() {
  return (
    <section
      id="app"
      className="my-10 overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(120deg,#15102a,#1a1030_55%,#241124)]"
    >
      <div className="mx-auto flex max-w-[1320px] flex-col gap-7 px-5 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="max-w-lg text-3xl font-bold leading-tight tracking-normal text-white sm:text-4xl">
            Unlock every episode
            <span className="block bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] bg-clip-text text-transparent">
              free in the app.
            </span>
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#a8b0cc] sm:text-base">
            Binge thousands of premium AI-crafted vertical dramas. New drops daily. Watch offline, get early access,
            and follow your favorite story worlds.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" size="lg" variant="outline" className="justify-start bg-[#0c0e18]">
            <Apple className="h-5 w-5" />
            App Store
          </Button>
          <Button type="button" size="lg" variant="outline" className="justify-start bg-[#0c0e18]">
            <Play className="h-5 w-5 fill-current" />
            Google Play
          </Button>
          <Button type="button" size="lg" variant="gradient" className="justify-start">
            <Smartphone className="h-5 w-5" />
            Get the App
          </Button>
        </div>
      </div>
    </section>
  );
}
