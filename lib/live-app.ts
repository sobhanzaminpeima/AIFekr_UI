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
};

/** Signed-in pages this app renders; must match the app entries of V2_ROUTES in the main site's lib/theme/uiTheme.ts. */
export const V2_APP = ["/home"];
export const v2App = (path: string) => V2_APP.includes(path.split(/[?#]/)[0].replace(/\/+$/, "") || "/");

/** Fills "{n}" / "{name}" in the classic frame's wording. */
export const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
