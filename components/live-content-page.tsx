"use client";
import { useState } from "react";
import Link from "./site-link";
import { useApp } from "./providers";
import { useSite } from "./site-link";
import { Button } from "./ui";

type Quote = { id: string; amountMinor: number; currency: string; expiresAt: string };

/** One clear price: the server prices the order, then the buyer confirms it. */
function StarterCheckout({ plan, available }: { plan: string; available: boolean }) {
  const { locale, tl } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const currency = locale === "fa" ? "IRT" : locale === "tr" ? "TRY" : "USD";
  async function buy() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/billing/quote", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, period: "monthly", currency }) });
      if (response.status === 401) { location.assign(`/register?entry=chat&redirect=${encodeURIComponent("/start")}`); return; }
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      setQuote(body.quote);
    } catch { setError(tl("برآورد پرداخت آماده نشد؛ دوباره تلاش کنید.", "Could not prepare checkout. Please retry.")); }
    finally { setBusy(false); }
  }
  async function confirm() {
    if (!quote) return;
    if (new Date(quote.expiresAt).getTime() <= Date.now()) { setQuote(null); setError(tl("اعتبار قیمت تمام شده؛ دوباره قیمت را دریافت کنید.", "This price expired. Please get a new one.")); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/payment/create", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, period: "monthly", currency: currency === "IRT" ? "IRR" : currency, quoteId: quote.id }) });
      const body = await response.json();
      if (!response.ok || !body.paymentUrl) throw Error(body.error);
      location.assign(body.paymentUrl);
    } catch { setError(tl("اتصال به پرداخت انجام نشد؛ دوباره تلاش کنید.", "Could not open payment. Please retry.")); setBusy(false); }
  }
  const amount = quote && (quote.currency === "IRT"
    ? `${quote.amountMinor.toLocaleString(locale)} ${tl("تومان", "toman")}`
    : new Intl.NumberFormat(locale, { style: "currency", currency: quote.currency }).format(quote.amountMinor / 100));
  return (
    <div className="content-buy">
      {quote ? (
        <>
          <p role="status">{tl("مبلغ نهایی:", "Final amount:")} <strong dir="ltr">{amount}</strong></p>
          <Button variant="primary" disabled={busy} onClick={() => void confirm()}>{tl("تأیید و رفتن به پرداخت", "Confirm and pay")}</Button>
        </>
      ) : (
        <Button variant="primary" disabled={!available || busy} onClick={() => void buy()}>{busy ? tl("در حال آماده‌سازی…", "Preparing…") : available ? tl("خرید و شروع", "Buy and start") : tl("فعلاً در دسترس نیست", "Not available right now")}</Button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export function LiveContentPage() {
  const { locale, tl } = useApp();
  const page = useSite()?.page;
  if (!page) return null;
  const starter = page.starter;
  const price = starter?.minor != null && starter.currency != null
    ? (starter.currency === "IRT" ? `${starter.minor.toLocaleString(locale)} ${tl("تومان", "toman")}` : new Intl.NumberFormat(locale, { style: "currency", currency: starter.currency }).format(starter.minor / 100))
    : null;
  return (
    <main className="content-page" id="main">
      <section className="content-hero">
        <span className="eyebrow orange-text">{page.eyebrow}</span>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
        {page.actions.length > 0 && (
          <div className="content-actions">
            {page.actions.map((a) => <Link key={a.href} className={"btn" + (a.primary ? " primary" : "")} href={a.href}>{a.label}</Link>)}
          </div>
        )}
        {starter && (
          <div className="content-price">
            {price && <strong dir="ltr">{price}</strong>}
            <span>{starter.days.toLocaleString(locale)} {tl("روز دسترسی چت", "days of chat access")} · {starter.credits.toLocaleString(locale)} {tl("کردیت چت", "chat credits")}</span>
            <StarterCheckout plan={starter.plan} available={starter.available} />
          </div>
        )}
      </section>
      <div className="content-blocks">
        {page.blocks.map((b, i) => (
          <section className="panel" key={i}>
            {b.heading && <h2>{b.heading}</h2>}
            {b.body && <p>{b.body}</p>}
            {b.ordered && <ol>{b.ordered.map((x) => <li key={x}>{x}</li>)}</ol>}
            {b.links && <div className="content-links">{b.links.map((l) => <Link key={l.href} className="btn" href={l.href}>{l.label}</Link>)}</div>}
          </section>
        ))}
      </div>
    </main>
  );
}
