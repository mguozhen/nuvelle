import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { promoLink } from "@/lib/distributor";
import type { BoostLink } from "@/lib/storage";

type LinksViewProps = {
  code: string;
  links: BoostLink[];
  onCopyLink: (slug: string) => void;
};

export function LinksView({ code, links, onCopyLink }: LinksViewProps) {
  return (
    <section>
      <h1 className="text-lg font-semibold">My promo links</h1>
      <p className="mt-1 text-sm text-[#9aa2c0]">
        Every link carries your code <b className="text-white">{code}</b>. Put them in your TikTok bio or pinned
        comment.
      </p>

      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f17]">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-white/[0.03] text-left text-[11.5px] uppercase text-[#6b7290]">
            <tr>
              <th className="px-3 py-3 font-semibold">Drama</th>
              <th className="px-3 py-3 font-semibold">Link</th>
              <th className="px-3 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.slug} className="border-t border-white/10">
                <td className="px-3 py-3 font-medium">{link.title}</td>
                <td className="max-w-[420px] break-all px-3 py-3 font-mono text-[11px] leading-5 text-[#5fd39a]">
                  {promoLink(link.slug, code)}
                </td>
                <td className="px-3 py-3 text-right">
                  <Button className="h-8 rounded-[10px]" size="sm" variant="outline" onClick={() => onCopyLink(link.slug)}>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {links.length ? null : <p className="px-4 py-8 text-center text-sm text-[#9aa2c0]">No links yet - grab one from the Material Square.</p>}
      </div>
    </section>
  );
}
