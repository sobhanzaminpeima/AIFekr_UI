"use client";
import NextLink from "next/link";
import { createContext, useContext, type ComponentProps } from "react";
import { liveHref, localizedPath, v2Ready, type SiteData } from "@/lib/live";
import { v2App } from "@/lib/live-app";
import type { Locale } from "@/lib/i18n";

const SiteContext = createContext<SiteData | null>(null);
export function SiteProvider({ data, children }: { data: SiteData | null; children: React.ReactNode }) {
  return <SiteContext.Provider value={data}>{children}</SiteContext.Provider>;
}
/** Real aifekr.com content in live mode; null in the standalone preview. */
export const useSite = () => useContext(SiteContext);

/** Resolves a prototype link to the live URL: real route, language prefix on public pages. */
export function useHref() {
  const site = useSite();
  return (href: string, lang?: Locale) => (site ? localizedPath(liveHref(href), lang ?? site.lang) : href);
}

/**
 * Drop-in for next/link. In live mode, links to pages this app does not serve
 * are plain anchors, so the browser loads them from the classic site in full
 * instead of asking this app's router for them.
 */
export default function Link({ href, ...rest }: ComponentProps<typeof NextLink>) {
  const site = useSite();
  const resolve = useHref();
  if (!site || typeof href !== "string") return <NextLink href={href} {...rest} />;
  const target = resolve(href);
  if (target.startsWith("#") || /^[a-z]+:/i.test(target)) return <NextLink href={target} {...rest} />;
  const path = target.replace(/^\/(en|de|tr)(?=\/|$)/, "") || "/";
  if (v2Ready(path) || v2App(path)) return <NextLink href={target} {...rest} />;
  const { prefetch: _prefetch, replace: _replace, scroll: _scroll, shallow: _shallow, passHref: _passHref, legacyBehavior: _legacy, locale: _locale, onNavigate: _onNavigate, ...anchor } = rest;
  return <a href={target} {...anchor} />;
}
