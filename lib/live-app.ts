// Signed-in pages on aifekr.com: the frame data the main site's /api/app/shell
// returns (same gate, sidebar data and wording as its classic layout).
import type { Locale } from "./i18n";

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
  access: { crmPlanActive: boolean; hasPack: boolean; hasBusinessAccess: boolean; fitnessOnly: boolean; hideBusiness: boolean };
  banners: { expired: boolean; expiresAt: string | null; trial: { endsAt: string; limited: boolean } | null };
  conversations: Conversation[];
  copy: ShellCopy;
  model: { destinations: Link[] };
  /** Only on /chat: the classic chat's wording and options. */
  chat: ChatData | null;
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
};

/** Signed-in pages this app renders; must match the app entries of V2_ROUTES in the main site's lib/theme/uiTheme.ts. */
export const V2_APP = ["/home", "/chat", "/create", "/gallery", "/image/gallery", "/image/generate", "/video/generate", "/music/generate"];
export const v2App = (path: string) => {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return V2_APP.includes(clean) || clean.startsWith("/chat/");
};

/** Fills "{n}" / "{name}" in the classic frame's wording. */
export const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
