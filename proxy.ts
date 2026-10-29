import { NextRequest, NextResponse } from "next/server";

// Behind aifekr.com the main site passes a public page's language as
// ?__lang=; elsewhere the visitor's lang cookie decides. The layout reads it
// from x-ui-lang to render the right lang/dir on the server.
const LANGS = ["fa", "en", "de", "tr"];
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next/") || pathname === "/v2-health" || /\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next();
  const fromUrl = req.nextUrl.searchParams.get("__lang"), fromCookie = req.cookies.get("lang")?.value;
  const lang = fromUrl && LANGS.includes(fromUrl) ? fromUrl : fromCookie && LANGS.includes(fromCookie) ? fromCookie : "";
  const headers = new Headers(req.headers);
  headers.delete("x-ui-lang");
  if (lang) headers.set("x-ui-lang", lang);
  return NextResponse.next({ request: { headers } });
}

// A plain catch-all: the negative-lookahead pattern only matched "/" here.
export const config = { matcher: ["/:path*"] };
