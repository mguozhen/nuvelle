const blockedElementPattern = /<(script|style|iframe|object|embed|form|button|textarea|select)\b[^>]*>[\s\S]*?<\/\1>/gi;
const blockedTagPattern = /<\/?(script|style|iframe|object|embed|form|input|button|textarea|select)\b[^>]*>/gi;
const eventAttributePattern = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const urlAttributePattern = /\s+(href|src)\s*=\s*("[^"]*"|'[^']*'|[^\s"'<>`]+)/gi;
const asciiWhitespaceAndControlPattern = /[\u0000-\u0020\u007f]+/g;
const safeImageDataUrlPattern = /^data:image\/(?:png|jpeg|jpg|gif|webp);/;
const namedCharacterReferences: Record<string, string> = {
  amp: "&",
  apos: "'",
  colon: ":",
  gt: ">",
  lt: "<",
  newline: "\n",
  quot: '"',
  tab: "\t"
};

function decodeHtmlCharacterReferences(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (reference, codePoint: string) =>
      decodeNumericCharacterReference(reference, Number.parseInt(codePoint, 16))
    )
    .replace(/&#([0-9]+);?/g, (reference, codePoint: string) =>
      decodeNumericCharacterReference(reference, Number.parseInt(codePoint, 10))
    )
    .replace(/&([a-z][a-z0-9]+);?/gi, (reference, name: string) => {
      return namedCharacterReferences[name.toLowerCase()] ?? reference;
    });
}

function decodeNumericCharacterReference(reference: string, codePoint: number) {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return reference;
  }

  return String.fromCodePoint(codePoint);
}

function normalizeUrlForSchemeCheck(value: string) {
  return decodeHtmlCharacterReferences(value.replace(/^["']|["']$/g, ""))
    .replace(asciiWhitespaceAndControlPattern, "")
    .toLowerCase();
}

function sanitizeUrlAttributes(html: string) {
  return html.replace(urlAttributePattern, (attribute, _name: string, rawValue: string) => {
    const normalizedValue = normalizeUrlForSchemeCheck(rawValue);

    if (normalizedValue.startsWith("javascript:")) {
      return "";
    }

    if (normalizedValue.startsWith("data:") && !safeImageDataUrlPattern.test(normalizedValue)) {
      return "";
    }

    return attribute;
  });
}

export function sanitizeArticleHtml(html: string | null | undefined) {
  if (!html) {
    return "";
  }

  return sanitizeUrlAttributes(
    html.replace(blockedElementPattern, "").replace(blockedTagPattern, "").replace(eventAttributePattern, "")
  );
}

export function stripHtml(html: string | null | undefined) {
  if (!html) {
    return "";
  }

  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}
