const canonicalHost = "nuvelle.ai";
const wwwHost = "www.nuvelle.ai";
const legacyPosterPattern = /^\/posters\/([^/]+)\.png$/;

type RedirectOptions = {
  forwardedProto?: string | null;
  host?: string | null;
};

function hostnameFromHostHeader(value: string | null | undefined) {
  return value?.split(":")[0]?.toLowerCase() || null;
}

export function siteRedirectUrl(url: URL, options: RedirectOptions = {}) {
  const canonicalUrl = new URL(url.toString());
  const requestHostname = hostnameFromHostHeader(options.host) ?? canonicalUrl.hostname;
  let shouldRedirect = false;

  if (requestHostname === wwwHost) {
    canonicalUrl.hostname = canonicalHost;
    shouldRedirect = true;
  }

  if (
    (requestHostname === canonicalHost || requestHostname === wwwHost) &&
    (canonicalUrl.protocol === "http:" || options.forwardedProto === "http")
  ) {
    canonicalUrl.hostname = canonicalHost;
    canonicalUrl.protocol = "https:";
    shouldRedirect = true;
  }

  if (legacyPosterPattern.test(canonicalUrl.pathname)) {
    canonicalUrl.pathname = canonicalUrl.pathname.replace(legacyPosterPattern, "/posters/$1.jpg");
    shouldRedirect = true;
  }

  if (!shouldRedirect) {
    return null;
  }

  return canonicalUrl.toString();
}
