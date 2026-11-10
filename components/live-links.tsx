"use client";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "./providers";
import { useSite } from "./site-link";
import { AIText } from "./ai-text";
import { Button, Icon } from "./ui";

function Brand() {
  return <span className="link-brand"><span className="link-mark" aria-hidden="true">A</span>AIFekr</span>;
}

/** A shared report, read by someone who may not have an account. */
export function LiveSharedResult() {
  const s = useSite()?.shared;
  if (!s) return null;
  return (
    <div className="link-page" dir="rtl">
      <header className="link-bar"><Brand /><a className="btn primary" href="/register">امتحان کن — رایگان</a></header>
      <main className="link-main" id="main">
        <span className="link-badge">{s.badge}</span>
        <h1><bdi>{s.title}</bdi></h1>
        <p className="link-sub"><bdi>{s.subtitle}</bdi> · {s.author ? <>توسط <bdi>{s.author}</bdi> · </> : null}{s.date}</p>
        <article className="link-body"><AIText text={s.content} /></article>
        <section className="link-cta">
          <p>می‌خوای برای کسب‌وکار خودت هم از هوش مصنوعی استفاده کنی؟</p>
          <a className="btn primary" href="/register">شروع رایگان با AIFekr</a>
        </section>
      </main>
    </div>
  );
}

/** A business's own lead form: shared as a link or shown inside an iframe on its site. */
export function LiveLeadForm() {
  const { tl } = useApp();
  const form = useSite()?.leadForm;
  const [values, setValues] = useState<Record<string, string>>({});
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [embedded, setEmbedded] = useState(false);
  const utm = useMemo(() => {
    if (typeof window === "undefined") return {};
    const q = new URLSearchParams(window.location.search);
    return { utm_source: q.get("utm_source") || undefined, utm_medium: q.get("utm_medium") || undefined, utm_campaign: q.get("utm_campaign") || undefined };
  }, []);
  useEffect(() => { setEmbedded(window.parent !== window); }, []);
  useEffect(() => { if (done && embedded) window.parent.postMessage("aifekr-leadform-submitted", "*"); }, [done, embedded]);
  if (!form) return null;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !form) return;
    setError("");
    if (form.fields.some((f) => f.required && !(values[f.key] || "").trim())) return setError(tl("لطفاً فیلدهای الزامی را پر کنید", "Please fill in the required fields"));
    setBusy(true);
    try {
      const response = await fetch("/api/public/leadform/" + encodeURIComponent(form.slug), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, website, ...utm }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return setError(response.status === 429 ? tl("درخواست‌های زیاد. کمی بعد دوباره تلاش کنید.", "Too many requests. Try again shortly.") : tl("ارسال نشد. دوباره تلاش کنید.", "Could not submit. Please try again."));
      if (body.redirectUrl) { window.location.href = body.redirectUrl; return; }
      setDone(true);
    } catch { setError(tl("خطای شبکه", "Network error")); }
    finally { setBusy(false); }
  }
  return (
    <div className="link-page link-center" style={{ "--link-accent": form.accent } as React.CSSProperties}>
      <main className="link-form" id="main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {form.logoUrl ? <img src={form.logoUrl} alt="" className="link-logo" /> : <Brand />}
        <h1><bdi>{form.title}</bdi></h1>
        {form.description && <p><bdi>{form.description}</bdi></p>}
        {done ? (
          <div className="form-done" role="status"><Icon name="CircleCheck" size={34} /><strong>{form.successMessage || tl("دریافت شد! به‌زودی با شما تماس می‌گیریم.", "Got it! We'll be in touch soon.")}</strong></div>
        ) : (
          <form onSubmit={submit}>
            {form.fields.map((f) => (
              <div className="tool-field" key={f.key}>
                <label htmlFor={"lf-" + f.key}>{f.label}{f.required ? " *" : ""}</label>
                {f.key === "message"
                  ? <textarea id={"lf-" + f.key} rows={3} value={values[f.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
                  : <input id={"lf-" + f.key} type={f.key === "email" ? "email" : f.key === "phone" ? "tel" : "text"} dir={f.key === "email" || f.key === "phone" ? "ltr" : undefined} value={values[f.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />}
              </div>
            ))}
            <input className="link-trap" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} />
            {error && <p role="alert">{error}</p>}
            <button type="submit" className="btn full link-submit" disabled={busy}>{busy ? tl("در حال ارسال…", "Sending…") : form.submitLabel || tl("ثبت", "Submit")}</button>
          </form>
        )}
        <small className="link-power">{tl("قدرت‌گرفته از", "Powered by")} AIFekr</small>
      </main>
    </div>
  );
}

type Property = { id: string; title: string; listingType: string; price: number; nightlyPrice: number | null; priceText: string; nightlyPriceText: string | null; address: string; city: string | null; bedrooms: number | null; bathrooms: number | null; areaSqm: number | null; description: string | null; status: string; images: string[] };
const LISTING: Record<string, [string, string]> = { buy: ["خرید", "For purchase"], sell: ["فروش", "For sale"], rent: ["اجاره", "For rent"], short_term_rent: ["اجاره روزانه", "Short-term rental"] };

/** The listing an agent sends to a prospective buyer. */
export function LiveProperty({ id }: { id: string }) {
  const { fa, tl } = useApp();
  const [property, setProperty] = useState<Property | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/public/property/" + encodeURIComponent(id)).then((r) => r.json())
      .then((d) => { if (d.property) { setProperty(d.property); setState("ready"); } else setState("missing"); })
      .catch(() => setState("missing"));
  }, [id]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!form.name.trim() || !form.phone.trim()) return setError(tl("نام و شماره تماس الزامی است", "Name and phone number are required"));
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/public/property-lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyId: id, name: form.name.trim(), phone: form.phone.trim(), message: form.message.trim() || undefined }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(body.error || "");
      setSent(true);
    } catch (e) { setError((e instanceof Error && e.message) || tl("خطا در ارسال درخواست", "Could not send your request")); }
    finally { setBusy(false); }
  }
  if (state === "loading") return <div className="link-page link-center"><p role="status">{tl("در حال بارگذاری…", "Loading…")}</p></div>;
  if (!property) return <div className="link-page link-center"><p>{tl("ملک یافت نشد", "Property not found")}</p></div>;
  const label = LISTING[property.listingType];
  const nightly = property.listingType === "short_term_rent" && property.nightlyPriceText;
  return (
    <div className="link-page">
      <main className="listing" id="main">
        {property.images.length > 0 && (
          <div className="listing-gallery">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {property.images.map((url, i) => <img key={url} src={url} alt={`${property.title} ${i + 1}`} />)}
          </div>
        )}
        <div className="listing-body">
          {label && <span className="link-badge">{fa ? label[0] : label[1]}</span>}
          <h1><bdi>{property.title}</bdi></h1>
          <p className="link-sub"><Icon name="MapPin" size={15} /> <bdi>{property.address}{property.city ? `${fa ? "، " : ", "}${property.city}` : ""}</bdi></p>
          <div className="listing-price">{nightly ? `${property.nightlyPriceText} ${tl("/ شب", "/ night")}` : property.priceText}</div>
          <div className="listing-facts">
            {property.bedrooms != null && <span>{property.bedrooms} {tl("خواب", "bedrooms")}</span>}
            {property.bathrooms != null && <span>{property.bathrooms} {tl("سرویس", "bathrooms")}</span>}
            {property.areaSqm != null && <span>{property.areaSqm} {tl("متر", "sqm")}</span>}
          </div>
          {property.description && <p><bdi>{property.description}</bdi></p>}
          {property.status !== "available" && <p role="status" className="listing-off">{tl("این ملک دیگر در دسترس نیست", "This property is no longer available")}</p>}
          {sent ? (
            <div className="form-done" role="status"><Icon name="CircleCheck" size={30} /><strong>{tl("درخواست شما ثبت شد، به‌زودی با شما تماس گرفته می‌شود.", "Your request has been received. We'll contact you soon.")}</strong></div>
          ) : (
            <form onSubmit={submit}>
              <h2>{tl("برای اطلاعات بیشتر یا رزرو بازدید، اطلاعات تماستان را بگذارید", "Leave your details for more information or to book a visit")}</h2>
              <div className="tool-field"><label htmlFor="pl-name">{tl("نام", "Name")}</label><input id="pl-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div className="tool-field"><label htmlFor="pl-phone">{tl("شماره تماس", "Phone number")}</label><input id="pl-phone" dir="ltr" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
              <div className="tool-field"><label htmlFor="pl-msg">{tl("توضیحات (اختیاری)", "Message (optional)")}</label><textarea id="pl-msg" rows={2} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} /></div>
              {error && <p role="alert">{error}</p>}
              <Button type="submit" variant="primary" className="full" disabled={busy}>{busy ? tl("در حال ارسال…", "Sending…") : tl("ارسال درخواست", "Send request")}</Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
