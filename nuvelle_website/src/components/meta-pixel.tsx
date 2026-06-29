import {
  configuredMetaPixelId,
  metaPixelBaseScript,
  metaPixelNoScriptImageUrl
} from "@/lib/tracking/meta-pixel";

type MetaPixelProps = {
  pixelId?: string | null;
};

export function MetaPixelScript({ pixelId }: MetaPixelProps) {
  const resolvedPixelId = resolvePixelId(pixelId);
  if (!resolvedPixelId) {
    return null;
  }

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: metaPixelBaseScript(resolvedPixelId)
      }}
    />
  );
}

export function MetaPixelNoScript({ pixelId }: MetaPixelProps) {
  const resolvedPixelId = resolvePixelId(pixelId);
  if (!resolvedPixelId) {
    return null;
  }

  return (
    <noscript>
      <img
        alt=""
        height="1"
        src={metaPixelNoScriptImageUrl(resolvedPixelId)}
        style={{ display: "none" }}
        width="1"
      />
    </noscript>
  );
}

function resolvePixelId(pixelId: string | null | undefined): string {
  if (pixelId === undefined) {
    return configuredMetaPixelId();
  }
  return (pixelId || "").trim();
}
