"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { ErrorState, Icon, SectionTitle, Modal, Button } from "./ui";
import { useShell } from "./live-shell-context";
import { UsageChart } from "./dashboard";
import { fill } from "@/lib/live-app";

type Tier = { id: string; creditsAmount: number; priceToman: number; discountPercent: number; badge: string | null };
type Profile = { credits: number; displayCredits: number; plan: string; planExpiry?: string | null };
type Wallets = { aiCredits: number; mediaCredits: number; voiceMinutes: number };
type Breakdown = { type: string; count: number; creditsSpent: number };
type Purchase = { id: string; amount: number; plan: string; status: string; createdAt: string };
type Usage = { id: string; type: string; feature?: string | null; model: string | null; credits: number; createdAt: string };

const json = (url: string) => fetch(url, { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));

/**
 * The credit wallet on aifekr.com, in the design's wallet screen: the real
 * balance and plan, the AI / media / voice wallets, 30-day use, the admin's
 * credit tiers (bought through the classic flow, /api/credits/purchase) and
 * both histories. Wording: the classic page's (main site lib/billing/creditsCopy.ts).
 */
export function LiveCredits({ fitness = false }: { fitness?: boolean }) {
  const { locale, n } = useApp();
  const { strings: s, labels: l, tools } = useShell()!.credits!;
  const [rates,setRates]=useState<{usdToToman:number;usdToTry:number}|null>(null);
  const [confirm,setConfirm]=useState<Tier|null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallets, setWallets] = useState<Wallets | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [usage, setUsage] = useState<Usage[] | null>(null);
  const [days, setDays] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    const own = json(fitness ? "/api/fitness/credits" : "/api/user/profile");
    Promise.all([json("/api/credits/tiers"), own, fitness ? own : json("/api/credits/usage-summary")])
      .then(([t, p, u]) => { setTiers(t.tiers || []); setRates(fitness ? p.fxRates || null : t.fxRates || null); setProfile(p.user || null); setWallets(u.wallets || null); setBreakdown(u.breakdown || []); })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
    json("/api/user/payments").then((d) => setPurchases((d.payments || []).filter((p: Purchase) => p.plan.startsWith("CREDITS_")))).catch(() => {});
    if (fitness) setUsage([]);
    else {
      json("/api/user/usage/history").then((d) => setUsage(d.entries || [])).catch(() => setUsage([]));
      json("/api/app/dashboard").then((d) => setDays(d.usage?.days ?? null)).catch(() => {});
    }
    const q = new URLSearchParams(location.search).get("payment");
    if (q === "success") toast.success(s["Credit purchase successful"]);
    if (q === "failed") toast.error(s["Payment failed"]);
  }, [s, fitness]);

  async function buy(tierId: string) {
    setBuying(tierId);
    try {
      const res = await fetch("/api/credits/purchase", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ tierId, currency: locale === "fa" ? "IRR" : locale === "tr" ? "TRY" : "USD", context: fitness ? "FITNESS" : undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      location.href = data.paymentUrl;
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : s["Failed to start payment"]);
      setBuying(null);
    }
  }

  const price=(v:number)=>{if(locale==='fa')return `${n(v)} ${s["Toman"]}`;if(!rates?.usdToToman||locale==='tr'&&!rates.usdToTry)return s['Rate unavailable'];return new Intl.NumberFormat(locale,{style:'currency',currency:locale==='tr'?'TRY':'USD'}).format(v/rates.usdToToman*(locale==='tr'?rates.usdToTry:1));};
  const toman = (v: number) => `${n(v)} ${s["Toman"]}`;
  const date = (v: string, time = false) => new Intl.DateTimeFormat(locale === "fa" ? "fa-IR-u-ca-persian" : locale, time ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(new Date(v));
  if (loading) return <p role="status" className="muted">…</p>;
  if (failed) return <ErrorState retry={() => window.location.reload()} />;

  return (
    <>
      <SectionTitle title={s["Credit Wallet"]} subtitle={s["Your credits are used across all AiFekr content-generation tools."]} />
      <div className="wallet-hero panel">
        <Icon name="Sparkles" size={37} />
        <p>
          {s["Available credits today"]}
          {profile?.plan && <> · <strong>{l.PLAN_LABEL[profile.plan] ?? profile.plan}</strong></>}
        </p>
        <h1>
          {n(profile?.displayCredits ?? profile?.credits ?? 0)} <small>{s["credits"]}</small>
        </h1>
        {days && <UsageChart days={days} />}
      </div>
      {wallets && (
        <div className="credit-packs">
          {([["aiCredits", "MessagesSquare", "AI Credits"], ["mediaCredits", "Image", "Media Credits"], ["voiceMinutes", "Mic", "Voice Minutes"]] as const).map(([key, icon, label]) => (
            <div className="panel" key={key}>
              <span className="icon-chip orange"><Icon name={icon} /></span>
              <h2>{n(Math.round(wallets[key]))}</h2>
              <p>{s[label]}</p>
            </div>
          ))}
        </div>
      )}
      {breakdown.length > 0 && (
        <section className="panel">
          <h2>{s["Usage — last 30 days"]}</h2>
          {breakdown.map((row) => (
            <div className="row-between" key={row.type}>
              <span>{l.TYPE_LABEL[row.type] ?? row.type}</span>
              <span className="muted">{n(row.count)}× · {n(row.creditsSpent)} {s["credits"]}</span>
            </div>
          ))}
        </section>
      )}
      <SectionTitle title={s["Buy Credits"]} />
      {!tiers.length ? (
        <p className="muted">{s["No purchase tiers are available right now."]}</p>
      ) : (
        <div className="credit-packs">
          {tiers.map((t) => {
            const list = t.discountPercent > 0 ? Math.round(t.priceToman / (1 - t.discountPercent / 100)) : null;
            return (
              <a className={`panel ${t.badge ? "recommended" : ""}`} key={t.id} href="#buy" role="button" aria-disabled={!!buying} onClick={(e) => { e.preventDefault(); if (!buying) setConfirm(t); }}>
                {t.badge && <span className="recommended-tag">{l.BADGE_LABEL[t.badge] ?? t.badge}</span>}
                <span className="icon-chip orange"><Icon name="Sparkles" /></span>
                <h2>{n(t.creditsAmount)} {s["credits"]}</h2>
                {list && <p><s>{price(list)}</s></p>}
                <p>{price(t.priceToman)}</p>
                <small className="muted">{fill(s["{formatNumber} Toman/credit"], { formatNumber: n(Math.round(t.priceToman / t.creditsAmount)) })}</small>
                <span className="btn full">
                  {buying === t.id ? <Icon name="LoaderCircle" size={17} className="spin" /> : <Icon name="Plus" size={17} />}
                  {s["Buy"]}
                </span>
              </a>
            );
          })}
        </div>
      )}
      {confirm&&<Modal title={locale==='fa'?'بررسی خرید کردیت':'Review credit purchase'} onClose={()=>{if(!buying)setConfirm(null)}}><h3>{n(confirm.creditsAmount)} {s['credits']}</h3><p>{price(confirm.priceToman)}</p><p>{locale==='fa'?'پرداخت با زرین‌پال؛ این خرید، اشتراک شما را تمدید نمی‌کند.':'Bank transfer and receipt upload. Buying credits does not renew your subscription.'}</p><Button variant="primary" disabled={!!buying||(locale!=='fa'&&(!rates?.usdToToman||locale==='tr'&&!rates.usdToTry))} onClick={()=>void buy(confirm.id)}>{buying?'…':s['Buy']}</Button></Modal>}
      <section className="panel">
        <h2>{s["Credit purchases"]}</h2>
        {!purchases.length ? <p className="muted">{s["No transactions yet."]}</p> : purchases.map((p) => (
          <div className="domain-card row-between" key={p.id}>
            <div>
              <strong>{l.TX_TYPE_LABEL.purchase}</strong>
              <p>{date(p.createdAt)}</p>
            </div>
            <strong className={p.status === "SUCCESS" ? "green" : p.status === "FAILED" ? "red-text" : "orange-text"}>{toman(p.amount)}</strong>
          </div>
        ))}
      </section>
      <section className="panel">
        <h2>{s["Credit usage"]}</h2>
        {usage === null ? <p className="muted">…</p> : !usage.length ? <p className="muted">{s["No credits used yet."]}</p> : usage.map((e) => (
          <div className="domain-card row-between" key={e.id}>
            <div>
              <strong>{e.type === "tool" && e.feature ? tools[e.feature] ?? e.feature : l.USAGE_TYPE_LABEL[e.type] ?? e.type}</strong>
              {e.model && <span className="muted"> · {e.model}</span>}
              <p>{date(e.createdAt, true)}</p>
            </div>
            <span>−{n(e.credits)}</span>
          </div>
        ))}
      </section>
    </>
  );
}
