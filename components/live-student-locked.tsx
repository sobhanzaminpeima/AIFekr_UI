"use client";
import { useApp } from "./providers";
import Link from "./site-link";
import { Icon } from "./ui";
import { useLiveData, liveRows } from "./live-module-kit";

/**
 * What a signed-in account without an active student package sees on /student:
 * the real student packages in the visitor's currency and a clear way to buy,
 * instead of an empty dashboard whose every request is refused.
 */
type Offer = { minor: number; currency: string; days: number; credits: number };

function price(o: Offer, locale: string) {
  const fa = locale === "fa";
  if (o.currency === "IRT") return `${new Intl.NumberFormat(fa ? "fa-IR" : locale).format(o.minor)} ${fa ? "تومان" : "Toman"}`;
  return new Intl.NumberFormat(fa ? "fa-IR" : locale, { style: "currency", currency: o.currency }).format(o.minor / 100);
}

export function StudentLocked({ pending }: { pending: number }) {
  const { tl, locale } = useApp();
  const r = useLiveData("/api/packages");
  const plans = liveRows(r.data?.packages)
    .filter((p) => String(p.planCode).startsWith("STUDENT_") && (p.offers as Record<string, Offer> | undefined)?.monthly)
    .sort((a, b) => Number(a.duration) - Number(b.duration));
  const monthly = plans.find((p) => Number(p.duration) <= 31);
  const perDay = (p: Record<string, unknown>) => { const o = (p.offers as Record<string, Offer>).monthly; return o.minor / Math.max(1, o.days); };
  return (
    <div className="sl">
      {pending > 0 && (
        <Link className="panel sl-pending" href="/payments">
          <Icon name="Clock" size={18} />
          <span>{tl("یک سفارش در انتظار داری؛ اگر پرداخت کرده‌ای رسیدت را ارسال کن تا بررسی شود.", "You have a pending order. If you already paid, send your receipt for review.")}</span>
          <Icon name="ArrowLeft" size={16} />
        </Link>
      )}
      <section className="panel sl-intro">
        <h2>{tl("پکیج دانشجویی را فعال کن", "Activate your student package")}</h2>
        <p>{tl("با فعال‌سازی، درس‌هایت را بساز، جزوه آپلود کن و با هوش مصنوعی خلاصه، فلش‌کارت و آزمون بگیر.", "Create your subjects, upload notes, and get AI summaries, flashcards and quizzes.")}</p>
        <ul>
          {[
            ["FolderOpen", tl("جزوه و منابع درسی با پوشه‌بندی", "Course notes and sources in folders")],
            ["CircleCheck", tl("آزمون‌سازی از جزوه‌های خودت", "Quizzes generated from your own notes")],
            ["Layers", tl("فلش‌کارت با مرور هوشمند", "Flashcards with spaced review")],
            ["CalendarDays", tl("برنامهٔ امتحان و زمان‌سنج مطالعه", "Exam planner and study timer")],
            ["Users", tl("گروه مطالعه با دوستانت", "Study groups with friends")],
            ["IdCard", tl("کارت دانشجویی AIFekr", "AIFekr student card")],
          ].map(([icon, text]) => <li key={text}><Icon name={icon} size={18} />{text}</li>)}
        </ul>
      </section>
      <div className="sl-plans">
        {plans.map((p) => {
          const o = (p.offers as Record<string, Offer>).monthly;
          const months = Math.round(o.days / 30);
          const saving = monthly && p !== monthly ? Math.round((1 - perDay(p) / perDay(monthly)) * 100) : 0;
          return (
            <article className={"panel sl-plan" + (p.isFeatured || saving > 0 ? " featured" : "")} key={String(p.planCode)}>
              {saving > 0 && <span className="ac-flag">{tl(`${saving}٪ صرفه‌جویی`, `Save ${saving}%`)}</span>}
              <h3>{months > 1 ? tl(`${months} ماهه`, `${months} months`) : tl("یک ماهه", "One month")}</h3>
              <strong>{price(o, locale)}</strong>
              <small>{tl(`${o.credits.toLocaleString()} کردیت هوش مصنوعی`, `${o.credits.toLocaleString()} AI credits`)} · {o.days} {tl("روز", "days")}</small>
              <Link className="btn primary" href={`/plans?plan=${encodeURIComponent(String(p.planCode))}&period=monthly`}>{tl("خرید و فعال‌سازی", "Buy and activate")}</Link>
            </article>
          );
        })}
      </div>
      {r.data && !plans.length && <p className="sd-empty">{tl("پکیج دانشجویی در حال حاضر در دسترس نیست.", "Student packages are not available right now.")}</p>}
      <p className="sd-fine">{tl("پرداخت با زرین‌پال یا انتقال بانکی (IBAN). دسترسی بلافاصله پس از تأیید پرداخت فعال می‌شود.", "Pay with Zarinpal or bank transfer (IBAN). Access starts as soon as the payment is confirmed.")}</p>
    </div>
  );
}
