import { NextResponse, type NextRequest } from "next/server";
import { siteRedirectUrl } from "@/lib/site/redirects";

export function proxy(request: NextRequest) {
  const redirectUrl = siteRedirectUrl(request.nextUrl, {
    forwardedProto: request.headers.get("x-forwarded-proto"),
    host: request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  });

  return redirectUrl ? NextResponse.redirect(redirectUrl, 308) : NextResponse.next();
}
