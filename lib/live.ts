// Live mode: this app serving aifekr.com pages behind the main site, with
// real content from its /api/public/site. Without that (standalone preview)
// every component keeps its demo behaviour.
import type { Locale } from "./i18n";

export type SitePlan = { period?:string;compareAtMinor?:number;code: string; name: string; category: string; minor: number; currency: string; credits: number; days: number; featured: boolean; features: string[] };
export type SiteFeature = { slug: string; route: string; category: "work" | "create" | "learn"; title: string; desc: string; items: string[]; requirement: string };
export type SiteSolution = { slug: string; title: string; modules: string[]; description: string; guide: string; steps: { title: string; body: string }[] };
export type SiteGuide = { slug: string; title: string; description: string; related: string[]; sections: { title: string; body: string }[] };
/** Sign-in pages: the main site's own wording (its translation dictionaries) and options. */
export type AuthData = {
  login: Record<"subtitle" | "tabPhone" | "tabEmail" | "back" | "otpTitle" | "otpSentPrefix" | "otpSentSuffix" | "testCode" | "phoneLabel" | "sendCode" | "sending" | "verifying" | "verifyAndLogin" | "resendCode" | "emailLabel" | "passwordLabel" | "loggingIn" | "submit" | "or" | "googleLogin" | "noAccount" | "registerLink" | "errPhoneInvalid" | "otpSent" | "errSendFailed" | "errOtpLength" | "loginSuccess" | "errOtpWrong" | "errFillEmailPass" | "errEmailPassWrong", string>;
  register: Record<"subtitle" | "selectedPack" | "firstNameLabel" | "firstNamePlaceholder" | "lastNameLabel" | "lastNamePlaceholder" | "countryLabel" | "countryPlaceholder" | "languageLabel" | "emailLabel" | "phoneLabel" | "passwordLabel" | "passwordPlaceholder" | "confirmPasswordLabel" | "agreePrefix" | "termsLink" | "and" | "privacyLink" | "agreeSuffix" | "creatingAccount" | "submit" | "googleRegister" | "haveAccount" | "loginLink" | "errName" | "errEmailOrPhone" | "errPasswordRequired" | "errPasswordMismatch" | "errPasswordShort" | "errMustAgree" | "success" | "errGeneric", string>;
  extra: { promoLabel: string; promoHint: string; accountType: string; accountTypes: Record<"FITNESS" | "PERSONAL" | "STUDENT" | "BUSINESS", string>; phoneInvalid: string; phoneRequired?: string; marketingConsent: string };
  countries: { code: string; name: string; dialCode: string }[];
  studentPlanCode: string;
};
export type SiteData = {
  lang: Locale;
  /** Growth module of this path, for the same module_viewed events as the classic site. */
  growthModule: string | null;
  seo: { metadata: Record<string, unknown>; jsonLd: Record<string, unknown>[] } | null;
  copy: { hero: string; intro: string; noPromise: string; credits: string; creditsDesc: string };
  plans: SitePlan[];
  packageCategories?:{code:string;label:string}[];
  features: SiteFeature[];
  solutions: SiteSolution[];
  guides: SiteGuide[];
  guidesUpdatedAt: string;
  faq: { q: string; a: string }[];
  costs: { imageStandard: number; imageHd: number; video5s: number; video10s: number; music30s?: number };
  contact: { email: string; phone: string; address: string; telegram: string };
  /** Only on /login and /register. */
  auth: AuthData | null;
  /** Only on /privacy, /terms and /security: the legal text the classic pages show. */
  legal?: { title: string; updated: string | null; sections: { title: string; body: string }[] } | null;
  /** Only on /verify-certificate/<code>; null when the code matches nothing. */
  certificate?: { id: string; studentName: string; courseTitle: string; version: number; status: string; issuedAt: string } | null;
  /** Only on /share/<token>. */
  shared?: { badge: string; title: string; subtitle: string; author: string | null; date: string; content: string } | null;
  /** Only on /f/<slug>. */
  leadForm?: { slug: string; title: string; description: string; accent: string; logoUrl: string | null; submitLabel: string | null; successMessage: string | null; fields: { key: string; label: string; required: boolean }[] } | null;
  /** Public pages that are plain copy. */
  page?: { eyebrow: string; title: string; intro: string; actions: { href: string; label: string; primary?: boolean }[]; blocks: { heading?: string; body?: string; ordered?: string[]; links?: { href: string; label: string }[] }[]; starter?: { plan: string; available: boolean; minor: number | null; currency: string | null; days: number; credits: number } } | null;
};

/** Pages this app renders on aifekr.com; must match V2_ROUTES in the main site's lib/theme/uiTheme.ts. */
export const V2_READY = ["/", "/pricing", "/about", "/contact", "/guides", "/features", "/solutions", "/login", "/register", "/privacy", "/terms", "/security", "/ai-chat", "/start", "/owner/login", "/verify-certificate", "/f", "/p", "/share"];
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
  "/create/voice": "/voice-studio",
  "/crm?tab=board": "/crm",
  // The design's tool cards (mocks/catalog.ts) on the real routes.
  "/business/crm": "/crm",
  "/business/real-estate": "/crm?tab=properties",
  "/business/leads": "/lead-gen",
  "/business/social": "/social",
  "/business/seo": "/seo",
  "/business/accounting": "/accounting",
  "/business/doctor": "/business-doctor",
  "/business/ceo": "/ceo",
  "/business/voice-agent": "/voice-agent",
  "/business/website": "/website-designer",
  "/business/startup": "/startup/builder",
  "/business/organization": "/organization/onboarding",
  "/business/ideas": "/tools/business-ideas",
  "/business/dropshipping": "/tools/drop-shipping",
  "/business/trading": "/tools/trading",
  "/business/math": "/tools/math",
  "/business/diet": "/tools/healthy-diet",
  "/business/free-ai": "/tools/try-free-ai",
  "/learn/courses": "/learn",
  "/fit/coach": "/fitness",
  "/fit/workouts": "/fitness?tab=programs",
  "/fit/nutrition": "/fitness?tab=nutrition",
  "/fit/coaches": "/fitness?tab=trainers",
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
