"use client";
// Packages inside the signed-in frame on aifekr.com (/plans, also
// /plans?category=FITNESS|STUDENT|BUSINESS|... from an activation prompt):
// the main site's /api/packages offers priced in the visitor's currency, a
// price quote (/api/billing/quote) shown for confirmation, then checkout
// (/api/payment/create) - the same flow as the classic DynamicPlans.
import { useEffect, useMemo, useState } from "react";
import { useApp } from "./providers";
import { Button, Icon, Modal } from "./ui";

type Offer = { period: string; minor: number; currency: string; credits: number; days: number; compareAtMinor?: number };
type Pkg = { planCode: string; name: string; nameEn?: string | null; category: string; features?: string | null; featuresEn?: string | null; isFeatured?: boolean; offers?: Record<string, Offer>; purchaseAvailable?: boolean };
type Quote = { id: string; planCode: string; period: string; currency: string; amountMinor: number };

const CATEGORY: Record<string, [string, string, string]> = {
  CHAT_STARTER: ["گفتگو و تولید محتوا", "Chat & content", "MessagesSquare"],
  BUSINESS: ["کسب‌وکار", "Business", "BriefcaseBusiness"],
  STUDENT: ["دانشجویی", "Student", "GraduationCap"],
  FITNESS: ["فیتنس", "Fitness", "Dumbbell"],
  VIDEO_FACTORY: ["تولید ویدیو", "Video", "Film"],
};
const PERIOD: Record<string, [string, string]> = { monthly: ["یک ماه", "1 month"], quarterly: ["۳ ماه", "3 months"], semiannual: ["۶ ماه", "6 months"], annual: ["یک سال", "1 year"], custom: ["دورهٔ ویژه", "Special term"] };
const features = (raw?: string | null) => {
  if (!raw) return [];
  try { const v = JSON.parse(raw); if (Array.isArray(v)) return v.map(String); } catch { /* plain text */ }
  return raw.split(/\r?\n|•/).map((x) => x.trim()).filter(Boolean);
};

export function LivePlans() {
  const { fa, locale, n, tl } = useApp();
  const [packages, setPackages] = useState<Pkg[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [group, setGroup] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  // The buyer's payment routes, decided by the main site (lib/payment/routing): currency and gateway.
  const [routes, setRoutes] = useState<{ options: { currency: string; gateway: string }[]; preferred: string | null } | null>(null);
  const [payCurrency, setPayCurrency] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/payment/options", { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return;
      setRoutes(d);
      setPayCurrency(d.preferred);
    }).catch(() => {});
  }, []);
  const ROUTE_LABEL: Record<string, [string, string]> = { IRT: ["تومان · زرین‌پال", "Toman · Zarinpal"], TRY: ["لیر ترکیه · حوالهٔ بانکی", "Turkish lira · bank transfer"], EUR: ["یورو · حوالهٔ بانکی", "Euro · bank transfer"], USD: ["دلار · حوالهٔ بانکی", "US dollar · bank transfer"] };
  const noRoute = !!routes && routes.options.length === 0;
  const tx = tl;
  const money = (minor: number, currency: string) => currency === "IRT" ? `${n(minor)} ${tl("تومان", "toman")}` : new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);

  useEffect(() => {
    fetch("/api/packages", { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => {
      const list = ((d.packages || []) as Pkg[]).filter((p) => p.offers && Object.keys(p.offers).length);
      setPackages(list);
      const q = new URLSearchParams(location.search);
      const chosen = list.find((p) => p.planCode === q.get("plan"));
      const asked = (q.get("category") || "").toUpperCase();
      const cheapest = list.reduce<Pkg | null>((best, p) => { const m = Math.min(...Object.values(p.offers ?? {}).map((o) => o.minor)); return !best || m < Math.min(...Object.values(best.offers ?? {}).map((o) => o.minor)) ? p : best; }, null);
      setGroup(chosen?.category || (list.some((p) => p.category === asked) ? asked : cheapest?.category || list[0]?.category || ""));
      if (q.get("period")) setPeriod(q.get("period")!);
    }).catch(() => setFailed(true));
  }, []);

  const groups = useMemo(() => [...new Set((packages ?? []).map((p) => p.category))], [packages]);
  const rows = (packages ?? []).filter((p) => p.category === group);
  const periods = [...new Set(rows.flatMap((p) => Object.keys(p.offers ?? {})))];
  const activePeriod = periods.includes(period) ? period : periods[0] ?? "monthly";

  // Server error codes (UPPER_SNAKE) as a sentence; server sentences pass through.
  function readable(code: string) {
    if (code.startsWith("APPROVED_RATE_REQUIRED")) return tx("قیمت این پکیج به‌روز می‌شود؛ کمی بعد دوباره امتحان کنید.", "This package's price is being updated; please try again shortly.");
    if (code === "UNSUPPORTED_PERIOD") return tx("این دوره برای این پکیج موجود نیست؛ دورهٔ دیگری انتخاب کنید.", "This period isn't offered for this package; please pick another.");
    if (!code || /^[A-Z0-9_]+$/.test(code)) return tx("فعال‌سازی این پکیج الان ممکن نشد؛ کمی بعد دوباره امتحان کنید یا با پشتیبانی تماس بگیرید.", "This package couldn't be activated right now; please try again shortly or contact support.");
    return code;
  }
  async function choose(p: Pkg) {
    setBusy(p.planCode); setError("");
    try {
      const currency = payCurrency ?? (fa ? "IRT" : locale === "tr" ? "TRY" : "USD");
      const r = await fetch("/api/billing/quote", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: p.planCode, period: activePeriod, currency }) });
      const b = await r.json().catch(() => ({}));
      if (b.error === "FITNESS_ONBOARDING_REQUIRED") { location.href = "/fitness?tab=profile"; return; }
      if (!r.ok) throw Error(readable(String(b.error || "")));
      setQuote(b.quote);
    } catch (e) { setError(e instanceof Error ? e.message : tx("خطا", "Error")); }
    finally { setBusy(""); }
  }
  async function pay() {
    if (!quote) return;
    setBusy("pay"); setError("");
    try {
      const r = await fetch("/api/payment/create", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: quote.planCode, period: quote.period, currency: quote.currency === "IRT" ? "IRR" : quote.currency, quoteId: quote.id, selectStudentAccount: group === "STUDENT", returnPath: new URLSearchParams(location.search).get("returnTo") || undefined }) });
      const b = await r.json().catch(() => ({}));
      if (b.error === "FITNESS_ONBOARDING_REQUIRED") { location.href = "/fitness?tab=profile"; return; }
      if (!r.ok || !b.paymentUrl) throw Error(b.error ? readable(String(b.error)) : tx("شروع پرداخت ممکن نشد", "Could not start the payment"));
      location.href = b.paymentUrl;
    } catch (e) { setError(e instanceof Error ? e.message : tx("خطا", "Error")); setBusy(""); }
  }

  if (failed) return <section className="plans-page"><p role="alert">{tx("پکیج‌ها بارگذاری نشد. صفحه را دوباره باز کنید.", "Packages could not be loaded. Please reload.")}</p></section>;
  return (
    <section className="plans-page">
      <div className="center-heading">
        <span className="eyebrow orange-text">{tx("پکیج‌ها", "Packages")}</span>
        <h1>{tx("پکیج مناسب خود را انتخاب و فعال کنید", "Choose and activate your package")}</h1>
        <p>{tx("قیمت کل دوره و اعتبار هر پکیج را پیش از پرداخت ببینید.", "See each package's full price and credits before you pay.")}</p>
      </div>
      {packages === null ? <div className="skeleton" /> : (
        <>
          {groups.length > 1 && (
            <div className="plans-tabs" role="tablist">
              {groups.map((g) => {
                const c = CATEGORY[g] ?? [g, g, "Sparkles"];
                return <button key={g} role="tab" aria-selected={g === group} className={g === group ? "selected" : ""} onClick={() => setGroup(g)}><Icon name={c[2]} size={15} />{tl(c[0], c[1])}</button>;
              })}
            </div>
          )}
          {periods.length > 1 && (
            <div className="plans-periods" role="radiogroup">
              {periods.map((k) => <button key={k} role="radio" aria-checked={k === activePeriod} className={k === activePeriod ? "selected" : ""} onClick={() => setPeriod(k)}>{tl(...(PERIOD[k] ?? [k, k]))}</button>)}
            </div>
          )}
          {routes && routes.options.length > 1 && (
            <div className="plans-periods plans-pay" role="radiogroup" aria-label={tx("روش پرداخت", "Payment method")}>
              {routes.options.map((o) => <button key={o.currency} role="radio" aria-checked={o.currency === payCurrency} className={o.currency === payCurrency ? "selected" : ""} onClick={() => setPayCurrency(o.currency)}>{tl(...(ROUTE_LABEL[o.currency] ?? [o.currency, o.currency]))}</button>)}
            </div>
          )}
          {noRoute && <p role="alert" className="error-text">{tx("فعلاً روش پرداختی برای حساب شما فعال نیست؛ با پشتیبانی تماس بگیرید.", "No payment method is available for your account right now; please contact support.")}</p>}
          <div className="pricing-grid">
            {rows.filter((p) => p.offers?.[activePeriod]).sort((a, b) => a.offers![activePeriod].minor - b.offers![activePeriod].minor).map((p, index, shown) => {
              const o = p.offers?.[activePeriod];
              if (!o) return null;
              const list = (fa ? features(p.features) : features(p.featuresEn || p.features).map((f) => tl(f, f))).slice(0, 6);
              return (
                <article className={`panel plan-card ${p.isFeatured ? "recommended" : ""}`} key={p.planCode}>
                  <span className="icon-chip orange"><Icon name={(CATEGORY[p.category] ?? ["", "", "Sparkles"])[2]} size={24} /></span>
                  {index === 0 && shown.length > 1 && <span className="plan-start-badge"><Icon name="Sparkles" size={13} />{tx("کم‌هزینه‌ترین گزینه", "Lowest price")}</span>}
                  <h2>{tl(p.name, p.nameEn || p.name)}</h2>
                  {o.compareAtMinor != null && o.compareAtMinor > o.minor && <del>{money(o.compareAtMinor, o.currency)}</del>}
                  <strong className="plan-price">{money(o.minor, o.currency)}</strong>
                  <small className="muted">{tl(...(PERIOD[o.period] ?? [o.period, o.period]))} · {n(o.credits)} {tx("اعتبار", "credits")}</small>
                  <ul className="check-list">{list.map((f) => <li key={f}><Icon name="Check" size={16} />{f}</li>)}</ul>
                  <Button variant="primary" className="full" disabled={!!busy || noRoute || p.purchaseAvailable === false} onClick={() => void choose(p)}>
                    {busy === p.planCode ? <Icon name="LoaderCircle" size={16} className="spin" /> : null}{tx("انتخاب و فعال‌سازی", "Choose and activate")}
                  </Button>
                </article>
              );
            })}
          </div>
          {error && <p role="alert" className="error-text">{error}</p>}
        </>
      )}
      {quote && (
        <Modal title={tx("تأیید مبلغ پرداخت", "Confirm payment")} onClose={() => { if (busy !== "pay") setQuote(null); }}>
          <strong className="plan-price">{money(quote.amountMinor, quote.currency)}</strong>
          <p className="muted">{tx("این مبلغ تا ۱۵ دقیقه ثابت می‌ماند.", "This price is held for 15 minutes.")}</p>
          <p className="muted">{quote.currency === "IRT" ? tx("پرداخت با درگاه زرین‌پال.", "Payment with Zarinpal.") : tx("پرداخت با انتقال بانکی و ارسال رسید.", "Payment by bank transfer and receipt upload.")}</p>
          <Button variant="primary" className="full" disabled={busy === "pay"} onClick={() => void pay()}>{busy === "pay" ? "…" : tx("پرداخت", "Pay")}</Button>
        </Modal>
      )}
    </section>
  );
}
