// Live mode: this app serving aifekr.com pages behind the main site, with
// real content from its /api/public/site. Without that (standalone preview)
// every component keeps its demo behaviour.
import type { Locale } from "./i18n";

export type SitePlan = { code: string; name: string; category: string; minor: number; currency: string; credits: number; days: number; featured: boolean; features: string[] };
export type SiteFeature = { slug: string; route: string; category: "work" | "create" | "learn"; title: string; desc: string; items: string[]; requirement: string };
export type SiteSolution = { slug: string; title: string; modules: string[]; description: string; guide: string; steps: { title: string; body: string }[] };
export type SiteGuide = { slug: string; title: string; description: string; related: string[]; sections: { title: string; body: string }[] };
export type SiteData = {
  lang: Locale;
  /** Growth module of this path, for the same module_viewed events as the classic site. */
  growthModule: string | null;
  seo: { metadata: Record<string, unknown>; jsonLd: Record<string, unknown>[] } | null;
  copy: { hero: string; intro: string; noPromise: string; credits: string; creditsDesc: string };
  plans: SitePlan[];
  features: SiteFeature[];
  solutions: SiteSolution[];
  guides: SiteGuide[];
  guidesUpdatedAt: string;
  faq: { q: string; a: string }[];
  costs: { imageStandard: number; imageHd: number; video5s: number; video10s: number };
  contact: { email: string; phone: string; address: string; telegram: string };
};

/** Pages this app renders on aifekr.com; must match V2_ROUTES in the main site's lib/theme/uiTheme.ts. */
export const V2_READY = ["/", "/pricing", "/about", "/contact", "/guides", "/features", "/solutions"];
export function v2Ready(path: string) {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return V2_READY.some((r) => (r === "/" ? clean === "/" : clean === r || clean.startsWith(r + "/")));
}

/** Same rule as the main site's isPublicRoute: these pages carry their language in the URL. */
const PUBLIC_STATIC = ["/", "/ai-chat", "/start", "/fit", "/pricing", "/industry", "/ai-team", "/about", "/contact", "/security", "/privacy", "/terms", "/guides"];
export function isPublicRoute(path: string) {
  return PUBLIC_STATIC.includes(path) || /^\/(features|solutions|industry|guides)\/[^/]+$/.test(path);
}
export function localizedPath(href: string, lang: Locale) {
  const at = href.search(/[?#]/);
  const path = at < 0 ? href : href.slice(0, at), suffix = at < 0 ? "" : href.slice(at);
  if (lang === "fa" || !isPublicRoute(path)) return href;
  return `/${lang}${path === "/" ? "" : path}${suffix}`;
}

/** Prototype links rewritten to the real aifekr.com routes. Anything not listed keeps its own path. */
const EXACT: Record<string, string> = {
  "/create/image": "/image/generate",
  "/create/video": "/video/generate",
  "/create/music": "/music/generate",
  "/create/video-factory": "/video-factory",
  "/crm?tab=board": "/crm",
  "/social?tab=content": "/social",
  "/fit/dashboard": "/fitness",
  "/business": "/solutions/business",
  "/features/seo": "/features/content",
  "/features/factory": "/features/video-factory",
  "/features/student": "/features/education",
  "/features/voice-agent": "/features/voice",
  "/features/website": "/features/websites",
  "/solutions/clinics": "/industry",
  "/solutions/shops": "/industry",
  "/solutions/agencies": "/industry",
  "/solutions/athletes": "/fit",
  "/guides/getting-started": "/guides",
  "/organization/onboarding": "/register",
};
export function liveHref(href: string) {
  if (EXACT[href]) return EXACT[href];
  const path = href.split("?")[0];
  if (EXACT[path]) return EXACT[path];
  return href;
}
