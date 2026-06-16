const blockedElementPattern = /<(script|style|iframe|object|embed|form|button|textarea|select)\b[^>]*>[\s\S]*?<\/\1>/gi;
const blockedTagPattern = /<\/?(script|style|iframe|object|embed|form|input|button|textarea|select)\b[^>]*>/gi;
const eventAttributePattern = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const urlAttributePattern = /\s+(href|src)\s*=\s*("[^"]*"|'[^']*'|[^\s"'<>`]+)/gi;
const asciiWhitespaceAndControlPattern = /[\u0000-\u0020\u007f]+/g;
const safeImageDataUrlPattern = /^data:image\/(?:png|jpeg|jpg|gif|webp);/;

function normalizeUrlForSchemeCheck(value: string) {
  return value.replace(/^["']|["']$/g, "").replace(asciiWhitespaceAndControlPattern, "").toLowerCase();
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
