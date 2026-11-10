"use client";
import { useEffect, useState } from "react";
import { useApp } from "./providers";
import Link, { useSite } from "./site-link";
import { Button, Icon } from "./ui";
import { renderStudentBrandCard, studentBrandCopy } from "@/lib/student-brandCard";
import { shareCardImage } from "@/lib/student-shareCard";

type Statement = { month: string; currency: string; netProfit: number; managementFee: number; ownerShare: number; property: { title: string; address: string; city: string | null }; entries: { date: string; description: string; category: string; income: number | null; expense: number | null }[] };

const WORDS: Record<string, [string, string]> = { IRT: ["تومان", "Toman"], IRR: ["ریال", "Rial"], USD: ["دلار", "USD"], GBP: ["پوند", "GBP"], EUR: ["یورو", "EUR"], TRY: ["لیر", "TRY"] };
const CATEGORIES: Record<string, [string, string]> = { guest_stay: ["اقامت مهمان", "Guest stay"], maintenance: ["نگهداری", "Maintenance"], utilities: ["قبوض", "Utilities"], consumables: ["مصرفی", "Consumables"], other: ["سایر", "Other"] };

/** Opened from the link in a statement email; shows only what that token was issued for. */
export function LiveOwnerStatement({ token }: { token: string }) {
  const { locale, fa, tl } = useApp();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  useEffect(() => {
    fetch("/api/public/owner-statement/" + encodeURIComponent(token)).then((r) => r.json())
      .then((d) => { if (d.statement) { setStatement(d.statement); setState("ready"); } else setState("missing"); })
      .catch(() => setState("missing"));
  }, [token]);
  if (state === "loading") return <div className="link-page link-center"><p role="status">{tl("در حال بارگذاری…", "Loading…")}</p></div>;
  if (!statement) return <div className="link-page link-center"><p>{tl("گزارشی با این لینک یافت نشد", "No statement found for this link")}</p></div>;
  const code = (statement.currency || "IRT").toUpperCase();
  const numbers = (code === "IRT" || code === "IRR") && fa ? "fa-IR" : locale === "de" ? "de-DE" : "en-US";
  const money = (n: number) => `${n.toLocaleString(numbers)} ${WORDS[code]?.[fa ? 0 : 1] ?? code}`;
  const tag = fa ? "fa-IR" : locale;
  const { property: p } = statement;
  return (
    <div className="link-page">
      <main className="statement" id="main">
        <header className="statement-head">
          <span className="module-hero-icon" aria-hidden="true"><Icon name="Building2" size={24} /></span>
          <div>
            <h1><bdi>{p.title}</bdi></h1>
            <p><bdi>{p.address}{p.city ? `${fa ? "، " : ", "}${p.city}` : ""}</bdi></p>
            <p>{tl("گزارش تسویه", "Owner statement")} — {new Date(statement.month).toLocaleDateString(tag, { year: "numeric", month: "long" })}</p>
          </div>
        </header>
        <div className="statement-totals">
          <div><small>{tl("سود خالص", "Net profit")}</small><strong>{money(statement.netProfit)}</strong></div>
          <div><small>{tl("کارمزد مدیریت", "Management fee")}</small><strong>{money(statement.managementFee)}</strong></div>
          <div><small>{tl("سهم مالک", "Owner share")}</small><strong>{money(statement.ownerShare)}</strong></div>
        </div>
        <h2>{tl("جزئیات", "Details")}</h2>
        {statement.entries.map((e, i) => {
          const category = CATEGORIES[e.category];
          return (
            <div className="statement-row" key={i}>
              <div><bdi>{e.description}</bdi><small>{new Date(e.date).toLocaleDateString(tag)} · {category ? category[fa ? 0 : 1] : e.category}</small></div>
              {e.income ? <b className="in">+{money(e.income)}</b> : e.expense ? <b className="out">-{money(e.expense)}</b> : null}
            </div>
          );
        })}
        <footer className="statement-foot">
          {tl("این گزارش توسط آژانس ملک ارسال شده و فقط با این لینک قابل مشاهده است.", "This statement was sent by the property agency and is viewable only with this link.")}
          <br />
          <a href={"/api/owner/session-from-share?token=" + encodeURIComponent(token)}>{tl("ورود به پنل مالک برای دیدن همهٔ گزارش‌ها", "Open the owner portal to see every statement")}</a>
        </footer>
      </main>
    </div>
  );
}

/** A student's public card, ready for a story. */
export function LiveStudentCard() {
  const { locale, tl } = useApp();
  const profile = useSite()?.studentProfile;
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!profile) return;
    let cancelled = false, url = "";
    renderStudentBrandCard({ lang: locale, name: profile.name, avatar: profile.avatar, slug: profile.slug })
      .then(({ blob }: { blob: Blob }) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setImage({ file: new File([blob], `AIFekr-student-${locale}.png`, { type: "image/png" }), url });
      })
      .catch(() => { if (!cancelled) setError(tl("ساخت کارت انجام نشد.", "The card could not be created.")); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [locale, profile, tl]);
  if (!profile) return null;
  const copy = studentBrandCopy(locale);
  function download() {
    if (!image) return;
    const a = document.createElement("a"); a.href = image.url; a.download = image.file.name; document.body.append(a); a.click(); a.remove();
  }
  async function share() {
    if (!image) return;
    try { await shareCardImage(image.file, copy.statement, navigator, download); }
    catch (e) { if (!(e instanceof Error && e.name === "AbortError")) setError(tl("اشتراک‌گذاری انجام نشد؛ عکس کارت را دانلود کن.", "Sharing failed. Download the card instead.")); }
  }
  return (
    <div className="link-page">
      <main className="student-card-page" id="main">
        <div className="student-card-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {image ? <img src={image.url} alt={`${profile.name || copy.fallbackName} — ${copy.statement}`} /> : <p role="status" className="link-center">{tl("در حال آماده‌سازی…", "Preparing…")}</p>}
        </div>
        <div className="student-card-actions">
          <Button disabled={!image} onClick={() => void share()}>{tl("اشتراک‌گذاری", "Share")}</Button>
          <Button disabled={!image} onClick={download}>{tl("دانلود", "Download")}</Button>
        </div>
        {error && <p role="alert">{error}</p>}
        <Link className="btn primary full" href="/plans?category=STUDENT">{tl("من هم به AIFekr می‌پیوندم", "Join me at AIFekr")}</Link>
      </main>
    </div>
  );
}
