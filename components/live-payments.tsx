"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "./providers";
import { Button, Icon } from "./ui";
import { useShell } from "./live-shell-context";
import { fill } from "@/lib/live-app";

/** One order as the main site's /api/user/payments returns it. */
type Payment = {
  id: string; plan: string; status: string; gateway: string; amount: number; transferCurrency: string; transferMinor: number;
  receiptAt: string | null; reviewAt: string | null; reviewNote: string | null; createdAt: string; refId: string | null;
  packageName?: string | null; packageNameEn?: string | null; resumeUrl?: string | null;
};
type History = { payments: Payment[]; page: number; hasMore: boolean; pendingCount: number; reviewCount: number };
const FILTERS = ["all", "pending", "paid", "problem"] as const;
type Filter = (typeof FILTERS)[number];

/**
 * Payment history on aifekr.com, in the design's payment-history panel: the
 * account's real orders with the classic page's states, actions and wording
 * (main site components/billing/PaymentsView.tsx, copy via /api/app/shell).
 * Pending orders refresh every 15 seconds; access is only ever granted by the server.
 */
export function LivePayments() {
  const { fa, locale } = useApp();
  const s = useShell()!.payments!;
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const f = q.get("filter");
    if (FILTERS.includes(f as Filter)) setFilter(f as Filter);
    const p = Number(q.get("page"));
    if (Number.isInteger(p) && p > 1) setPage(p);
  }, []);
  const load = useCallback(async (background = false) => {
    const id = ++requestId.current;
    if (!background) setLoading(true);
    try {
      const res = await fetch(`/api/user/payments?page=${page}&filter=${filter}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || s["Unable to load payment status"]);
      if (id === requestId.current) { setData(body); setError(""); }
    } catch (e) {
      if (id === requestId.current) setError(e instanceof Error ? e.message : s["Unable to load status"]);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [filter, page, s]);
  useEffect(() => { void load(); return () => { requestId.current += 1; }; }, [load]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void load(true); };
    const timer = data?.pendingCount ? window.setInterval(refresh, 15000) : null;
    document.addEventListener("visibilitychange", refresh);
    return () => { if (timer !== null) window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [load, data?.pendingCount]);

  function changeFilter(next: Filter) {
    setFilter(next);
    setPage(1);
    history.replaceState(null, "", `/payments?filter=${next}`);
  }
  const date = (v: string) => new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : locale === "de" ? "de-DE" : locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v));
  const label = { all: s["All"], pending: s["Pending"], paid: s["Approved"], problem: s["Needs attention"] };

  return (
    <section className="panel">
      <h2>{s["Payments & activation"]}</h2>
      <p className="muted">{s["Your orders and receipts stay here. Return through Payments in the menu, even after closing the page."]}</p>
      {!!data?.reviewCount && (
        <button className="text-link" onClick={() => changeFilter("pending")}>
          <Icon name="Clock3" size={15} />
          {fill(s["{reviewCount} receipts awaiting review. No second payment needed."], { reviewCount: data.reviewCount.toLocaleString(locale) })}
        </button>
      )}
      <div className="domain-toolbar">
        <select aria-label={s["Payment filters"]} value={filter} onChange={(e) => changeFilter(e.target.value as Filter)}>
          {FILTERS.map((f) => <option key={f} value={f}>{label[f]}</option>)}
        </select>
        <Button onClick={() => void load()} disabled={loading}>
          <Icon name="RefreshCw" size={15} />
          {s["Refresh"]}
        </Button>
      </div>
      {error && <p role="alert" className="error-text">{error}</p>}
      <div aria-busy={loading}>
        {loading ? (
          <p role="status" className="muted">{s["Loading orders…"]}</p>
        ) : data?.payments.map((p) => {
          const approved = p.status === "SUCCESS" || p.status === "PAID";
          const review = p.status === "PENDING" && !!p.receiptAt;
          const pending = p.status === "PENDING";
          const bank = p.gateway === "bank_transfer";
          const amount = bank && p.transferMinor > 0
            ? new Intl.NumberFormat(locale, { style: "currency", currency: p.transferCurrency }).format(p.transferMinor / 100)
            : `${p.amount.toLocaleString(locale)} ${s["toman"]}`;
          const title = (fa ? p.packageName : p.packageNameEn) || (p.plan.startsWith("STUDENT_") ? s["Student package"] : p.plan.startsWith("VOICE_") ? s["AI calling"] : p.plan.startsWith("CREDITS_") ? s["AI credits"] : p.plan);
          const state = approved ? s["Payment approved"] : review ? s["Receipt received · awaiting review"] : pending && bank ? s["Awaiting transfer or receipt"] : pending ? s["Payment is not complete yet"]
            : p.status === "CANCELLED" ? s["Order cancelled by administrator"] : p.status === "REJECTED" ? s["Receipt not approved · read the review"] : s["Payment not completed · check its status"];
          const workspace = p.plan.startsWith("FIT_") ? "/fitness/marketplace" : p.plan.startsWith("STUDENT_") ? "/student" : p.plan.startsWith("VOICE_") ? "/voice-agent" : "/home";
          return (
            <article className="domain-card" key={p.id}>
              <div className="row-between">
                <div>
                  <strong>{title}</strong>
                  <p>{date(p.createdAt)} · {state}</p>
                </div>
                <strong dir="auto">{amount}</strong>
              </div>
              {review && <p className="muted">{s["No action needed. The result will appear here; do not pay again."]}</p>}
              {p.reviewNote && <p>{p.reviewNote}</p>}
              <details>
                <summary>{s["Order reference & details"]}</summary>
                <p dir="ltr">{p.id}</p>
                {p.refId && <p>{s["Reference:"]} {p.refId}</p>}
                {p.receiptAt && <p>{s["Receipt sent:"]} {date(p.receiptAt)}</p>}
                {p.reviewAt && <p>{s["Reviewed:"]} {date(p.reviewAt)}</p>}
              </details>
              <div className="domain-actions">
                {bank && <a className="btn primary" href={`${p.plan.startsWith("FIT_") ? "/fitness/checkout" : "/checkout"}/${p.id}`}>{review ? s["Track approval"] : pending ? s["Continue payment & receipt"] : s["Payment details"]}</a>}
                {pending && p.resumeUrl && <a className="btn primary" href={p.resumeUrl}>{s["Continue on Zarinpal"]}</a>}
                {bank && p.receiptAt && <a className="btn" href={`/api/payment/${p.id}/receipt`}><Icon name="FileText" size={15} />{s["Saved receipt"]}</a>}
                {approved && <a className="btn" href={workspace}>{s["Open my workspace"]}</a>}
                {!pending && !approved && <Link className="btn" href="/contact">{s["Contact support"]}</Link>}
              </div>
            </article>
          );
        })}
        {!loading && data && !data.payments.length && (
          <div className="empty">
            <span className="empty-icon"><Icon name="CreditCard" size={34} /></span>
            <h3>{filter === "all" ? s["No orders yet"] : s["No orders with this status"]}</h3>
            <a className="btn primary" href="/plans">{s["View packages"]}</a>
          </div>
        )}
      </div>
      {data && (page > 1 || data.hasMore) && (
        <nav className="row-between" aria-label={s["Payment pages"]}>
          <Button disabled={loading || page === 1} onClick={() => setPage((v) => v - 1)}>{s["Newer"]}</Button>
          <span>{page.toLocaleString(locale)}</span>
          <Button disabled={loading || !data.hasMore} onClick={() => setPage((v) => v + 1)}>{s["Older"]}</Button>
        </nav>
      )}
      <p className="muted">{s["Always available: workspace menu → Payments & activation. Review results come from the server."]}</p>
    </section>
  );
}
