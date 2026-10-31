"use client";
// The live accounting module's shared state (live-accounting.tsx), for its tabs
// and for the design's BusinessShell frame, which reads real numbers through it.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "@/components/site-link";
import { toast } from "sonner";
import { fill } from "@/lib/live-app";
import { citationParts, fmtDate, fmtMonth, fmtNum } from "@/lib/accounting";
import { useShell } from "./live-shell-context";
import { Icon } from "./ui";

function useAccountingState() {
  const shell = useShell();
  const lang = shell?.lang ?? "fa";
  const copy = shell?.accounting ?? null;
  /** The classic wording by its English key; "{name}" is filled from values. */
  const s = useCallback((en: string, values?: Record<string, string | number>) => fill(copy?.[en] ?? en, values ?? {}), [copy]);
  const api = useCallback(async <T,>(url: string, data?: unknown, method = "POST"): Promise<T> => {
    const init: RequestInit = method === "GET" ? { cache: "no-store", credentials: "include" } : data === undefined ? { method, credentials: "include" } : { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) };
    const r = await fetch(url, init);
    if (r.status === 401) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      throw new Error("");
    }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || s("Something went wrong"));
    if (method !== "GET") window.dispatchEvent(new Event("aifekr:accounting-updated"));
    return d as T;
  }, [s]);
  const get = useCallback(<T,>(url: string) => api<T>(url, undefined, "GET"), [api]);
  /** Runs an action, toasting its error; returns whether it succeeded. */
  const act = useCallback(async (work: () => Promise<unknown>, fallback = "Something went wrong") => {
    try { await work(); return true; } catch (e) { if ((e as Error).message !== "") toast.error((e as Error).message || s(fallback)); return false; }
  }, [s]);
  const fmt = useCallback((n: number, currency?: string | null) => fmtNum(lang, n, currency), [lang]);
  const date = useCallback((d: string | Date, currency?: string | null) => fmtDate(lang, d, currency), [lang]);
  const month = useCallback((d: string | Date, currency?: string | null) => fmtMonth(lang, d, currency), [lang]);
  return { shell, lang, s, api, get, act, fmt, date, month, ready: !!copy, canWrite: !!shell?.accountingAccess?.allowed && !shell.accountingAccess.restricted };
}
export type AccountingCtx = ReturnType<typeof useAccountingState>;
export const AccountingContext = createContext<AccountingCtx | null>(null);
export const useAcc = () => useContext(AccountingContext)!;
/** The live accounting state when the real module is rendering; null for the design's local preview. */
export const useLiveAccounting = () => useContext(AccountingContext);
export function AccountingProvider({ children }: { children: React.ReactNode }) {
  const x = useAccountingState();
  return <AccountingContext.Provider value={x}>{children}</AccountingContext.Provider>;
}

/** For BusinessShell's pulse and copilot: unreconciled bank lines, expenses awaiting approval, locked periods. */
export function useAccountingPulse(enabled: boolean) {
  const [pulse, setPulse] = useState<{ unmatched: number; pending: { amount: number }[]; locked: number } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (url: string): Promise<any> => fetch(url, { credentials: "include", cache: "no-store" }).then((r) => { if (!r.ok) throw Error(); return r.json(); });
    let active = true;
    const refresh = () => { void Promise.all([json("/api/accounting/dashboard"), json("/api/accounting/expenses?status=pending_approval"), json("/api/accounting/fiscal-periods")]).then(([dash, exp, per]) => {
      if (!active) return;
      setPulse({
        unmatched: dash.bankUnreconciledCount ?? 0,
        pending: (exp.expenses ?? []).map((e: { amount: number }) => ({ amount: e.amount })),
        locked: (per.periods ?? []).filter((p: { isLocked: boolean }) => p.isLocked).length,
      });
    }).catch(() => { if (active) setPulse(null); }); };
    refresh();
    window.addEventListener("aifekr:accounting-updated", refresh);
    return () => { active = false; window.removeEventListener("aifekr:accounting-updated", refresh); };
  }, [enabled]);
  return pulse;
}

/** The assistant's text with its "(account 5200)" citations linked to that account's ledger. */
export function Cited({ text }: { text: string }) {
  const parts = useMemo(() => citationParts(text), [text]);
  return <>{parts.map((p, i) => (typeof p === "string" ? p : <Link key={i} className="acc-cite" href={`/accounting/accounts/${p.code}`}>{p.word} {p.digits}</Link>))}</>;
}

export function Loading() {
  return <div className="skeleton" />;
}
export function Muted({ text }: { text: string }) {
  return <p className="crm-empty">{text}</p>;
}
let costCache: Record<string, number> | null = null;
/** "N credits" for a button that spends credits — the admin's live Credit Rules (classic CreditCost). */
export function CreditCost({ feature }: { feature: string }) {
  const { lang } = useAcc();
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
