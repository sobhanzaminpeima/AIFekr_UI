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

/** For BusinessShell's pulse and copilot: the real open deals, won revenue and overdue follow-ups. */
export function useCrmPulse(enabled: boolean) {
  const [pulse, setPulse] = useState<{ open: Deal[]; wonValue: number; overdue: Task[] } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    Promise.all([
      fetch("/api/crm/deals?status=open").then((r) => (r.ok ? r.json() : { deals: [] })),
      fetch("/api/crm/deals?status=won").then((r) => (r.ok ? r.json() : { deals: [] })),
      fetch("/api/crm/tasks?status=pending").then((r) => (r.ok ? r.json() : { tasks: [] })),
    ]).then(([open, won, tasks]: [{ deals: Deal[] }, { deals: Deal[] }, { tasks: Task[] }]) => {
      const now = Date.now();
      setPulse({ open: open.deals || [], wonValue: (won.deals || []).reduce((sum, d) => sum + d.value, 0), overdue: (tasks.tasks || []).filter((t) => t.dueDate && new Date(t.dueDate).getTime() < now) });
    }).catch(() => setPulse({ open: [], wonValue: 0, overdue: [] }));
  }, [enabled]);
  return pulse;
}
