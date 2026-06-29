type MetaPixelPrimitive = string | number | boolean;
type MetaPixelValue = MetaPixelPrimitive | MetaPixelPrimitive[] | null | undefined;

export type MetaPixelParams = Record<string, MetaPixelValue>;
export type MetaPixelEventName = "PageView" | "ViewContent" | "Lead";

type TrackableDrama = {
  id?: number | string | null;
  slug?: string | null;
  title: string;
  genre?: string | null;
  platform?: string | null;
  language?: string | null;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function configuredMetaPixelId(env: NodeJS.ProcessEnv = process.env): string {
  return (env.NEXT_PUBLIC_META_PIXEL_ID || "").trim();
}

export function metaPixelBaseScript(pixelId: string): string {
  const id = JSON.stringify(pixelId.trim());
  return `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${id});
fbq('track', 'PageView');`;
}

export function metaPixelNoScriptImageUrl(pixelId: string): string {
  return `https://www.facebook.com/tr?id=${encodeURIComponent(pixelId.trim())}&ev=PageView&noscript=1`;
}

export function trackMetaPixelEvent(eventName: MetaPixelEventName, params: MetaPixelParams = {}): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    return;
  }

  const payload = cleanMetaPixelParams(params);
  if (Object.keys(payload).length) {
    window.fbq("track", eventName, payload);
    return;
  }

  window.fbq("track", eventName);
}

export function trackDramaViewContent(drama: TrackableDrama): void {
  trackMetaPixelEvent("ViewContent", {
    content_name: drama.title,
    content_category: drama.genre || drama.platform || "Short drama",
    content_ids: contentIdsForDrama(drama),
    content_type: "product",
    language: drama.language || undefined
  });
}

export function trackAppLead(source: string, drama?: TrackableDrama | null): void {
  trackMetaPixelEvent("Lead", {
    content_name: drama?.title || "Nuvelle app",
    content_category: drama?.genre || drama?.platform || undefined,
    content_ids: drama ? contentIdsForDrama(drama) : undefined,
    source
  });
}

function contentIdsForDrama(drama: TrackableDrama): string[] | undefined {
  const id = drama.slug ?? drama.id;
  return id == null ? undefined : [String(id)];
}

function cleanMetaPixelParams(params: MetaPixelParams): Record<string, MetaPixelPrimitive | MetaPixelPrimitive[]> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value == null || value === "") {
        return false;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return true;
    })
  ) as Record<string, MetaPixelPrimitive | MetaPixelPrimitive[]>;
}
