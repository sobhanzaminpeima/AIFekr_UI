// Signed-in pages on aifekr.com: the frame data the main site's /api/app/shell
// returns (same gate, sidebar data and wording as its classic layout).
import type { Locale } from "./i18n";
import { accountingPath } from "./accounting-routes";

type Link = { href: string; label: string };
export type Conversation = { id: string; title: string | null; updatedAt: string; projectId: string | null };
export type ShellCopy = Record<string, string> & {
  nav: Record<string, string>;
  notifications: { bellTooltip: string; empty: string; markAllRead: string; justNow: string; minutesAgo: string; hoursAgo: string; daysAgo: string };
  tools: Link[];
  assistants: Link[];
  planNames: Record<string, string>;
  support: { title: string; launcherLabel: string; placeholder: string; greeting: string; starters: string[]; unavailable: string; rateLimited: string; genericError: string; sourcesLabel: string; send: string; close: string; expand: string; collapse: string; initial: string; color: string; tint: string };
};
export type ShellData = {
  lang: Locale;
  metadata: Record<string, unknown>;
  user: { name: string | null; plan: string; planName: string; role: string; accountType: string | null; credits: number; pendingPaymentCount: number; studentWorkspaceEnabled: boolean; showFitness: boolean };
  /** Only on /assistants/<type>. */
  assistant?: { type: string; title: string } | null;
  /** Paid workspaces for the sidebar; locked ones carry the plan that opens them. */
  proTools?: { key: string; href: string; icon: string; label: string; unlocked: boolean; requiredPlan: string | null; highlight: "popular" | "new" | null; recommended: boolean }[];
  access: { crmPlanActive: boolean; hasPack: boolean; hasBusinessAccess: boolean; fitnessOnly: boolean; hideBusiness: boolean };
  banners: { expired: boolean; expiresAt: string | null; trial: { endsAt: string; limited: boolean } | null };
  conversations: Conversation[];
  copy: ShellCopy;
  model: { destinations: Link[] };
  /** Only on /chat: the classic chat's wording and options. */
  chat: ChatData | null;
  /** Only on /voice-studio: the classic voice studio's wording and error messages. */
  voice: { strings: Record<string, string>; errors: Record<string, string> } | null;
  /** Only on /video-factory: the classic factory's wording, keyed by English. */
  factory: Record<string, string> | null;
  /** Only on /crm: the classic CRM's wording, label tables and dictionary. */
  crm: import("./crm").CrmCopy | null;
  /** Only on /accounting pages: the classic accounting pages' wording, keyed by English. */
  accounting?: Record<string, string> | null;
  accountingAccess?: { allowed: boolean; restricted: boolean } | null;
  /** Reserved for the wallet adapter; route stays classic until its contract is verified. */
  credits?: { strings: Record<string, string>; labels: Record<string, Record<string, string>>; tools: Record<string, string> } | null;
  /** Only on /payments: the classic payment history's wording, keyed by English. */
  payments?: Record<string, string> | null;
  /** Only on /welcome: the account's onboarding answers, options, suggestions and wording. */
  welcome?: WelcomeData | null;
  /** Only on /home: the personalized workspace (main site lib/growth/workspace.ts). */
  personal?: HomeWorkspace | null;
};

/** [Persian, English] — the onboarding options' own labels (main site lib/growth/modules.ts). */
type Copy2 = [string, string];
type Choice = { id: string; label: Copy2 };
export type Suggestion = { id: string; name: Copy2; path: string; firstValue: Copy2; exampleTask: Copy2 };
export type WelcomeCopy = {
  welcome: string; edit: string; steps: { title: string; hint: string }[];
  next: string; back: string; skip: string; later: string; start: string; home: string;
  firstTask: string; result: string; credits: string; error: string; personalize: string;
  invite: { title: string; body: string; start: string; dismiss: string };
};
/** A tool on the personalized home: its real page and what it does for the user. */
export type HomeTool = { id: string; href: string; name: string; benefit: string };
export type HomeWorkspace = {
  goals: string[];
  invite: boolean;
  /** The next useful step: the first suggested tool without a real result yet. */
  primary: (HomeTool & { title: string; cta: string }) | null;
  tools: HomeTool[];
  recentModules: (HomeTool & { at: string })[];
  copy: { invite: WelcomeCopy["invite"]; personalize: string; nextStep: string; recommended: string; recommendedHint: string; allTools: string; chat: string; opened: string };
};
export type WelcomeData = {
  credits: number; state: string; step: number;
  answers: { goals: string[]; persona: string | null; intent: string | null };
  options: { objectives: Choice[]; personas: Choice[]; intents: Choice[] };
  recommendations: Suggestion[];
  copy: WelcomeCopy;
};

type Option = { value: string; label: string };
export type ChatData = {
  t: { title: string; greeting: string; greetingSubtitle: string; placeholder: string; attach: string; copy: string; regenerate: string; good: string; improve: string; copied: string; thanks: string; disclaimer: string; stopGeneration: string; voiceInput: string; listening: string; readAloud: string; stopSpeaking: string; models: { auto: string } };
  error: string;
  /** The classic chat's strings keyed by their English text; "{n}" marks a value. */
  strings: Record<string, string>;
  expertModes: { id: string; label: string; color: string }[];
  mediaTabs: { id: string; label: string }[];
  ratios: Option[];
  imageStyles: Option[];
  videoRatios: Option[];
  videoStyles: Option[];
  videoDurations: { value: number; credits: number }[];
  musicGenres: string[];
  musicDurations: { value: number; credits: number }[];
  imageCategories: { id: string; label: string }[];
  referenceRequiredCategories: string[];
  dataSources: Record<string, string>;
  starters: { general: string[]; realEstate: string[] };
  industrySlug: string | null;
  /** The classic gallery pages' and upgrade prompt's wording, keyed by English. */
  create: Record<string, string>;
  /** Only on /image/generate: the character creator's wording, styles and sample people. */
  characters: { strings: Record<string, string>; genres: { value: string; label: string }[]; samples: { id: string; label: string; portraitPrompt: string }[] } | null;
  /** Whether the account's plan allows video and music (the generate routes' own checks), and the notice shown before a user starts. */
  planAccess?: { video: boolean; music: boolean; notice: { videoTitle: string; musicTitle: string; body: string; createImage: string; packages: string } };
};

/** Signed-in pages this app renders; must match the app entries of V2_ROUTES in the main site's lib/theme/uiTheme.ts. */
export const V2_APP = ["/home", "/chat", "/create", "/gallery", "/image/gallery", "/image/generate", "/video/generate", "/music/generate", "/voice-studio", "/video-factory", "/crm", "/welcome", "/payments", "/live", "/plans", "/complete-phone"];
export const v2App = (path: string) => {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return V2_APP.includes(clean) || ["/credits", "/wallet", "/notifications", "/settings", "/social", "/lead-gen", "/business-doctor", "/meeting", "/website-designer", "/referral", "/startup/builder", "/seo", "/seo/intelligence", "/seo/sites", "/seo/agent-pipeline", "/ceo", "/agents", "/organization/onboarding", "/voice-agent", "/learn", "/student", "/fitness", "/fitness/marketplace", "/play"].includes(clean) || accountingPath(clean) || clean.startsWith("/chat/") || /^\/(fitness\/)?checkout\/[^/]+$/.test(clean) || /^\/tools\/(business-ideas|drop-shipping|healthy-diet|math|trading|try-free-ai)$/.test(clean) || ["/fitness/credits", "/fitness/payments", "/startup/contact", "/welcome/setup", "/admin", "/admin/dashboard", "/admin/users", "/admin/financial", "/admin/financial/customers", "/admin/subscriptions", "/admin/revenue", "/admin/credit-tiers", "/admin/billing/rates", "/admin/billing/promotions", "/admin/invites/manage"].includes(clean) || /^\/admin\/users\/[^/]+$/.test(clean) || /^\/assistants\/[^/]+$/.test(clean);
};

/** Fills "{n}" / "{name}" in the classic frame's wording. */
export const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
