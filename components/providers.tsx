"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { Locale, TranslationKey, translate, num, money } from "@/lib/i18n";
import { GeneratedItem, setFailureMode } from "@/lib/api/client";
import { isPublicRoute, localizedPath } from "@/lib/live";
type Context = {
  locale: Locale;
  setLocale: (v: Locale) => void;
  theme: string;
  setTheme: (v: string) => void;
  t: (k: TranslationKey) => string;
  fa: boolean;
  n: (v: number) => string;
  price: (v: number) => string;
  credits: number;
  spend: (v: number) => boolean;
  topup: (v: number) => void;
  items: GeneratedItem[];
  addItem: (v: GeneratedItem) => void;
  failure: boolean;
  setFailure: (v: boolean) => void;
};
const AppContext = createContext<Context>(null!);
/**
 * initialLocale is set in live mode (behind aifekr.com): the language then
 * comes from the URL or the site's lang cookie, never from this app's storage,
 * and changing it works like the classic site's language switcher.
 */
export function Providers({ children, initialLocale }: { children: React.ReactNode; initialLocale?: Locale }) {
  const live = initialLocale !== undefined;
  const [locale, setLocale] = useState<Locale>(initialLocale ?? "fa");
  const [theme, setTheme] = useState("dark");
  const [credits, setCredits] = useState(1240);
  const [items, setItems] = useState<GeneratedItem[]>([]);
  const [failure, setFailure] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("aifekr-ui") || "{}");
      if (!live && ["fa", "en", "de", "tr"].includes(s.locale)) setLocale(s.locale);
      if (s.theme) setTheme(s.theme);
      if (typeof s.credits === "number") setCredits(s.credits);
      if (Array.isArray(s.items)) setItems(s.items);
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = theme;
    if (loaded)
      localStorage.setItem(
        "aifekr-ui",
        JSON.stringify({ locale, theme, credits, items }),
      );
  }, [locale, theme, credits, items, loaded]);
  const t = (key: TranslationKey) => translate(locale, key);
  return (
    <AppContext.Provider
      value={{
        locale,
        setLocale: live ? (next) => {
          document.cookie = `lang=${next}; path=/; max-age=31536000`;
          const path = location.pathname.replace(/^\/(en|de|tr)(?=\/|$)/, "") || "/";
          if (isPublicRoute(path)) location.assign(localizedPath(path, next) + location.search.replace(/[?&]__lang=[^&]*/, ""));
          else location.reload();
        } : setLocale,
        theme,
        setTheme,
        t,
        fa: locale === "fa",
        n: (v) => num(v, locale),
        price: (v) => money(v, locale),
        credits,
        spend: (v) => {
          if (credits < v) {
            toast.error(
              locale === "fa"
                ? "اعتبار کافی نیست؛ کیف پولت را شارژ کن."
                : "Not enough credits. Top up your wallet.",
            );
            return false;
          }
          setCredits((c) => c - v);
          return true;
        },
        topup: (v) => setCredits((c) => c + v),
        items,
        addItem: (v) => setItems((old) => [v, ...old]),
        failure,
        setFailure: (v) => {
          setFailure(v);
          setFailureMode(v);
        },
      }}
    >
      {children}
      <Toaster
        richColors
        position="bottom-center"
        theme={theme === "dark" ? "dark" : "light"}
      />
    </AppContext.Provider>
  );
}
export const useApp = () => useContext(AppContext);
