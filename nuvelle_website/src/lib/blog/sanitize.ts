const blockedElementPattern = /<(script|style|iframe|object|embed|form|button|textarea|select)\b[^>]*>[\s\S]*?<\/\1>/gi;
const blockedTagPattern = /<\/?(script|style|iframe|object|embed|form|input|button|textarea|select)\b[^>]*>/gi;
const eventAttributePattern = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const javascriptUrlPattern = /\s+(href|src)\s*=\s*("|')\s*javascript:[\s\S]*?\2/gi;
const dataUrlPattern = /\s+(href|src)\s*=\s*("|')\s*data:(?!image\/(?:png|jpeg|jpg|gif|webp);)[\s\S]*?\2/gi;

export function sanitizeArticleHtml(html: string | null | undefined) {
  if (!html) {
    return "";
  }

  return html
    .replace(blockedElementPattern, "")
    .replace(blockedTagPattern, "")
    .replace(eventAttributePattern, "")
    .replace(javascriptUrlPattern, "")
    .replace(dataUrlPattern, "");
}

export function stripHtml(html: string | null | undefined) {
  if (!html) {
    return "";
  }

  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}
