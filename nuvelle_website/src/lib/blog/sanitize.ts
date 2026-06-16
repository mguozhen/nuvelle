import sanitizeHtml from "sanitize-html";
import { blogConfig } from "@/lib/blog/config";
import { siteRelativeUrl } from "@/lib/blog/urls";

type AttributeMap = Record<string, string>;

const allowedTags = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "a",
  "img",
  "strong",
  "b",
  "em",
  "i",
  "blockquote",
  "code",
  "pre",
  "br",
  "hr",
  "span"
];

const allowedAttributes = {
  a: ["href", "name", "target", "rel"],
  img: ["src", "alt", "title", "width", "height"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"]
};

const asciiWhitespaceAndControlPattern = /[\u0000-\u0020\u007f]+/g;
const safeImageDataUrlPattern = /^data:image\/(?:png|jpeg|jpg|gif|webp);/i;

function normalizeUrlForSchemeCheck(value: string) {
  return value.replace(asciiWhitespaceAndControlPattern, "").toLowerCase();
}

function transformAnchor(tagName: string, attribs: AttributeMap) {
  const nextAttributes = { ...attribs };

  if (nextAttributes.href) {
    nextAttributes.href = siteRelativeUrl(blogConfig.siteOrigin, nextAttributes.href);
  }

  if (nextAttributes.target === "_blank") {
    const relTokens = new Set((nextAttributes.rel ?? "").split(/\s+/).filter(Boolean));
    relTokens.add("noopener");
    relTokens.add("noreferrer");
    nextAttributes.rel = [...relTokens].join(" ");
  }

  return { tagName, attribs: nextAttributes };
}

function transformImage(tagName: string, attribs: AttributeMap) {
  const nextAttributes = { ...attribs };
  const src = nextAttributes.src ? normalizeUrlForSchemeCheck(nextAttributes.src) : "";

  if (src.startsWith("data:") && !safeImageDataUrlPattern.test(src)) {
    delete nextAttributes.src;
  }

  return { tagName, attribs: nextAttributes };
}

const articleSanitizeOptions = {
  allowedTags,
  allowedAttributes,
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"]
  },
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  parseStyleAttributes: false,
  transformTags: {
    a: transformAnchor,
    img: transformImage
  }
};

const textOnlySanitizeOptions = {
  allowedTags: [],
  allowedAttributes: {}
};

export function sanitizeArticleHtml(html: string | null | undefined) {
  if (!html) {
    return "";
  }

  return sanitizeHtml(html, articleSanitizeOptions);
}

export function stripHtml(html: string | null | undefined) {
  if (!html) {
    return "";
  }

  return sanitizeHtml(html, textOnlySanitizeOptions).replace(/\s+/g, " ");
}
