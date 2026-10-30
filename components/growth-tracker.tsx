"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSite } from "./site-link";

// Same beacons as the classic site's GrowthTracker (aifekr.com
// src/components/growth/GrowthTracker.tsx), so attribution and the customer
// growth reports count new-design visits exactly like classic ones.
export function growthEvent(name: string, data: { moduleId?: string | null; metadata?: Record<string, string | number | boolean | null> } = {}) {
  try {
    void fetch("/api/growth/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, ...data }), keepalive: true }).catch(() => {});
  } catch { /* tracking never affects the page */ }
}
function onceThisSession(key: string): boolean {
  try { if (sessionStorage.getItem(key)) return false; sessionStorage.setItem(key, "1"); return true; } catch { return true; }
}

export default function GrowthTracker() {
  const pathname = usePathname();
  const moduleId = useSite()?.growthModule ?? null;
  const landed = useRef(false);
  useEffect(() => {
    if (landed.current) return;
    landed.current = true;
    const hasCampaign = /[?&]utm_(source|campaign)=/.test(location.search);
    const external = document.referrer && !document.referrer.startsWith(location.origin);
    if (hasCampaign || external) {
      void fetch("/api/growth/touch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: location.pathname + location.search, referrer: document.referrer || null }), keepalive: true }).catch(() => {});
    }
  }, []);
  useEffect(() => {
    if (!pathname) return;
    const path = pathname.replace(/^\/(en|de|tr)(?=\/|$)/, "") || "/";
    if (path === "/pricing" && onceThisSession("afk:pricing")) growthEvent("pricing_page_viewed");
    else if (moduleId && onceThisSession(`afk:module:${moduleId}`)) growthEvent("module_viewed", { moduleId, metadata: { landing: path.startsWith("/features/") } });
  }, [pathname, moduleId]);
  return null;
}
