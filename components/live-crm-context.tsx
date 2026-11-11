"use client";
// The live CRM's shared state (live-crm.tsx), for its tabs and for the design's
// BusinessShell frame, which reads real numbers through it on aifekr.com.
import { createContext, useContext, useEffect, useState } from "react";
import type { Deal, Task } from "@/lib/crm";
import type { CrmCtx } from "./live-crm";
import { Icon } from "./ui";

export const CrmContext = createContext<CrmCtx | null>(null);
export const useCrm = () => useContext(CrmContext)!;
/** The live CRM's state when the real CRM is rendering; null for the design's local preview. */
export const useLiveCrm = () => useContext(CrmContext);

export function FormError({ text }: { text: string }) {
  return text ? <p className="crm-error" role="alert">{text}</p> : null;
}
export function Loading() {
  return <div className="skeleton" />;
}
export function EmptyText({ text }: { text: string }) {
  return <p className="crm-empty">{text}</p>;
}

let costCache: Record<string, number> | null = null;
/** "N credits" for a button that spends credits — the admin's live Credit Rules (classic CreditCost). */
export function CreditCost({ feature }: { feature: string }) {
  const { lang } = useCrm();
  const [costs, setCosts] = useState(costCache);
  useEffect(() => {
    if (costCache) return;
    fetch("/api/credits/costs", { credentials: "include" }).then((r) => (r.ok ? r.json() : { costs: {} })).then((d) => { costCache = d.costs || {}; setCosts(costCache); }).catch(() => {});
  }, []);
  const value = costs ? costs["tool_" + feature.replace(/[.-]/g, "_")] ?? costs.tool : undefined;
  if (!value) return null;
  const n = lang === "fa" ? value.toLocaleString("fa-IR") : String(value);
  const word = lang === "fa" ? "اعتبار" : lang === "de" ? (value === 1 ? "Credit" : "Credits") : lang === "tr" ? "kredi" : value === 1 ? "credit" : "credits";
  return <small className="crm-cost"><Icon name="Coins" size={12} /> {n} {word}</small>;
}

/** Fired after any CRM change, so figures computed elsewhere on the page refresh. */
export const CRM_CHANGED = "aifekr-crm-changed";

/**
 * For BusinessShell's pulse and copilot: the real open deals, won revenue and
 * overdue follow-ups. A failed request used to count as "no deals", so the
 * pulse flickered 0 → 1 → 0 between loads (production 2026-11-09); now the
 * figures stay unknown until every request has answered, and refresh after
 * each CRM change.
 */
export function useCrmPulse(enabled: boolean) {
  const [pulse, setPulse] = useState<{ open: Deal[]; wonValue: number; overdue: Task[] } | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const bump = () => setVersion((v) => v + 1);
    addEventListener(CRM_CHANGED, bump);
    return () => removeEventListener(CRM_CHANGED, bump);
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const read = (url: string) => fetch(url, { cache: "no-store" }).then((r) => { if (!r.ok) throw Error(String(r.status)); return r.json(); });
    Promise.all([read("/api/crm/deals?status=open"), read("/api/crm/deals?status=won"), read("/api/crm/tasks?status=pending")])
      .then(([open, won, tasks]: [{ deals: Deal[] }, { deals: Deal[] }, { tasks: Task[] }]) => {
        if (!alive) return;
        const now = Date.now();
        setPulse({ open: open.deals || [], wonValue: (won.deals || []).reduce((sum, d) => sum + d.value, 0), overdue: (tasks.tasks || []).filter((t) => t.dueDate && new Date(t.dueDate).getTime() < now) });
      })
      .catch(() => { if (alive) setPulse(null); });
    return () => { alive = false; };
  }, [enabled, version]);
  return pulse;
}
