"use client";
import { useState } from "react";
import Link from "./site-link";
import { useApp } from "./providers";
import { useSite } from "./site-link";
import { Button, Icon } from "./ui";
import type { Locale } from "@/lib/i18n";

/** Passwordless: the link goes to the email the agency registered. The reply never reveals whether it exists. */
export function LiveOwnerLogin() {
  const { locale, tl } = useApp();
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState<Locale>(locale);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/owner/request-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), lang: language }) });
      if (!response.ok && response.status >= 500) throw Error("");
      setSent(true);
    } catch { setError(tl("ارسال لینک انجام نشد. دوباره تلاش کنید.", "Could not send the link. Please try again.")); }
    finally { setBusy(false); }
  }
  return (
    <main className="form-page" id="main">
      <section className="form-card">
        <h1>{tl("پنل مالک", "Owner portal")}</h1>
        <p>{tl("با ایمیلی که آژانس برایتان ثبت کرده وارد شوید", "Sign in with the email your agency registered for you")}</p>
        {sent ? (
          <div className="form-done" role="status">
            <Icon name="CircleCheck" size={34} />
            <strong>{tl("اگر این ایمیل ثبت شده باشد، لینک ورود برایتان ارسال شد.", "If that email is registered, a login link is on its way.")}</strong>
            <span>{tl("لینک تا ۲۰ دقیقه معتبر است.", "The link is valid for 20 minutes.")}</span>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="tool-field">
              <label htmlFor="owner-email">{tl("ایمیل شما", "Your email")}</label>
              <input id="owner-email" type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="tool-field">
              <span className="form-label">{tl("زبان ایمیل", "Email language")}</span>
              <div className="form-segments">
                {([["fa", "فارسی"], ["en", "English"], ["de", "Deutsch"]] as [Locale, string][]).map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={language === value} onClick={() => setLanguage(value)}>{label}</button>
                ))}
              </div>
            </div>
            {error && <p role="alert">{error}</p>}
            <Button type="submit" variant="primary" className="full" disabled={busy}>{busy ? tl("در حال ارسال…", "Sending…") : tl("ارسال لینک ورود", "Send login link")}</Button>
          </form>
        )}
      </section>
    </main>
  );
}

const STARTUP_FEATURES: [string, string, string, string, string][] = [
  ["Target", "طراحی MVP", "MVP design", "طراحی و توسعه نسخه اول محصول شما", "Design and develop the first version of your product"],
  ["Bot", "هوش مصنوعی سفارشی", "Custom AI", "یکپارچه‌سازی AI متناسب با کسب‌وکارتان", "AI integration tailored to your business"],
  ["ChartNoAxesCombined", "داشبورد تحلیلی", "Analytics dashboard", "پنل مدیریت و آمار حرفه‌ای", "Professional management panel and statistics"],
  ["Rocket", "لانچ و دیپلوی", "Launch & deploy", "راه‌اندازی کامل روی سرور", "Full deployment on server"],
];

export function LiveStartupContact() {
  const { tl } = useApp();
  const [form, setForm] = useState({ name: "", email: "", phone: "", startupName: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/startup/inquiry", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(body.error || "");
      setSent(true);
    } catch (e) { setError((e instanceof Error && e.message) || tl("خطا در ارسال", "Could not send")); }
    finally { setBusy(false); }
  }
  return (
    <div className="module-workspace accent-purple" data-module="startup">
      <div className="module-hero">
        <span className="module-hero-icon" aria-hidden="true"><Icon name="Rocket" size={26} /></span>
        <div className="section-title"><div><h2>{tl("پیاده‌سازی استارتاپ با تیم AIFekr", "Build your startup with the AIFekr team")}</h2><p>{tl("تیم حرفه‌ای ما ایده شما را از صفر تا محصول کامل پیاده‌سازی می‌کند", "Our professional team takes your idea from zero to a complete product")}</p></div></div>
      </div>
      <div className="guided-tool-grid">
        <div className="startup-features">
          {STARTUP_FEATURES.map(([icon, fa, en, faBody, enBody]) => (
            <section className="panel" key={en}><Icon name={icon} size={22} /><h3>{tl(fa, en)}</h3><p>{tl(faBody, enBody)}</p></section>
          ))}
        </div>
        <section className="panel">
          {sent ? (
            <div className="form-done" role="status">
              <Icon name="CircleCheck" size={34} />
              <strong>{tl("درخواست شما ثبت شد!", "Request submitted!")}</strong>
              <span>{tl("تیم AIFekr در اسرع وقت با شما تماس می‌گیرد.", "The AIFekr team will contact you as soon as possible.")}</span>
              <Link className="btn" href="/startup/builder">{tl("بازگشت به سازنده استارتاپ", "Back to Startup Builder")}</Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="tool-field"><label htmlFor="sc-name">{tl("نام و نام خانوادگی *", "Full name *")}</label><input id="sc-name" required value={form.name} onChange={set("name")} /></div>
              <div className="tool-field"><label htmlFor="sc-email">{tl("ایمیل *", "Email *")}</label><input id="sc-email" type="email" dir="ltr" required value={form.email} onChange={set("email")} /></div>
              <div className="tool-field"><label htmlFor="sc-phone">{tl("شماره تلفن", "Phone number")}</label><input id="sc-phone" dir="ltr" value={form.phone} onChange={set("phone")} /></div>
              <div className="tool-field"><label htmlFor="sc-startup">{tl("نام استارتاپ", "Startup name")}</label><input id="sc-startup" value={form.startupName} onChange={set("startupName")} /></div>
              <div className="tool-field"><label htmlFor="sc-message">{tl("توضیح ایده و نیاز شما *", "Describe your idea and needs *")}</label><textarea id="sc-message" rows={5} required placeholder={tl("ایده‌تان را توضیح دهید، در کجا هستید، چه چیزی نیاز دارید…", "Describe your idea, where you are, what you need…")} value={form.message} onChange={set("message")} /></div>
              {error && <p role="alert">{error}</p>}
              <Button type="submit" variant="primary" className="full" disabled={busy}>{busy ? tl("در حال ارسال…", "Sending…") : tl("ارسال درخواست", "Send request")}</Button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

export function LiveCertificate() {
  const { locale, tl } = useApp();
  const c = useSite()?.certificate;
  const valid = c?.status === "ACTIVE";
  const rows: [string, string][] = c ? [
    [tl("نام دانشجو", "Student name"), c.studentName],
    [tl("دوره", "Course"), `${c.courseTitle} · v${c.version}`],
    [tl("تاریخ صدور", "Issue date"), new Intl.DateTimeFormat(locale === "fa" ? "fa-IR-u-ca-persian" : locale, { dateStyle: "long" }).format(new Date(c.issuedAt))],
    [tl("شناسه گواهی", "Certificate ID"), c.id],
    [tl("صادرکننده", "Issuer"), "AIFekr Student Academy"],
  ] : [];
  return (
    <main className="form-page" id="main">
      <section className="form-card cert-card">
        <span className={"cert-state " + (valid ? "ok" : "bad")} role="status">
          <Icon name={valid ? "ShieldCheck" : "CircleX"} size={22} />
          {c ? (valid ? tl("گواهی معتبر", "Valid certificate") : tl("گواهی لغوشده", "Revoked certificate")) : tl("گواهی پیدا نشد", "Certificate not found")}
        </span>
        {c && <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}</dl>}
        <p>{tl("این گواهی، اتمام تأییدشدهٔ دوره را ثبت می‌کند و مدرک دانشگاهیِ دارای اعتبار رسمی نیست.", "A verified record of course completion; not an accredited academic qualification.")}</p>
      </section>
    </main>
  );
}
