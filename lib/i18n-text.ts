import type { Locale } from "./i18n";
import { TR_TEXT } from "./i18n-tr";

/**
 * Text written in the components as a Persian/English pair (`tl("…", "…")`):
 * Persian for fa, otherwise the English text translated for the visitor's
 * language when a translation exists (lib/i18n-tr.ts for Turkish), else the
 * English text itself. Keyed by the English text so a component keeps reading
 * naturally and a missing translation never breaks the page.
 */
export function pairText(locale: Locale, fa: string, en: string): string {
  if (locale === "fa") return fa;
  if (locale === "tr") return TR_TEXT[en] ?? en;
  return en;
}
