"use client";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useApp } from "./providers";
import Link from "./site-link";
import { GamingShorts } from "./live-gaming-shorts";
import { GamingShortsBanner } from "./gaming-shorts-banner";
import { useSearchParams } from "next/navigation";
import { VIDEO_SKUS, videoPurchasePath } from "@/lib/video-purchase";
import type { VideoPackage } from "./live-factory";

const endpoint = "/api/video-factory/economy";
type Order = {
  id: string; topic: string; channel: string; status: "PENDING" | "APPROVED" | "DELIVERED";
  credits: number; createdAt: string; deliveredAt: string | null; title: string | null;
  description: string | null; tags: string[]; videoUrl: string | null; thumbnailUrl: string | null;
};
type Catalog = {
  quote: { standardCredits: number; credits: number; discountPercent: number; durationSeconds: number } | null;
  orders: Order[];
};

function useEconomyData() {
  const [data, setData] = useState<Catalog | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    setData(null);
    fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw Error();
        return await response.json() as Catalog;
      })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [revision]);
  return { data, failed, reload: () => setRevision(i => i + 1) };
}

export function EconomyCreation({ children, packages }: { children: ReactNode; packages?: VideoPackage[] }) {
  const { fa, n, locale } = useApp();
  const params = useSearchParams();
  const requested = params.get("package");
  const mode = requested === "main" || requested === "economy" ? requested : null;
  function setMode(next: "main" | "economy" | null) {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("package", next); else url.searchParams.delete("package");
    window.history.pushState(null, "", url);
  }
  function buy(mode: keyof typeof VIDEO_SKUS) {
    const sku = VIDEO_SKUS[mode];
    const offer = packages?.find(pkg => pkg.planCode === sku)?.offer;
    if (!offer) return null;
    const price = offer.currency === "IRT" ? `${n(offer.minor)} ${fa ? "تومان" : "toman"}` : new Intl.NumberFormat(locale, { style: "currency", currency: offer.currency }).format(offer.minor / 100);
    return <Link className="btn primary" href={videoPurchasePath(sku)}>{fa ? "خرید بسته" : "Buy package"} · {price}</Link>;
  }
  const catalog = useEconomyData();
  const quote = catalog.data?.quote;
  if (params.get("service") === "gaming") return <><Link className="btn" href="/video-factory">{fa ? "بازگشت به کارخانه" : "Back to factory"}</Link><GamingShorts /></>;
  return <>
    {!mode && <GamingShortsBanner />}
    {!mode ? <section className="vf-quick">
      <h1>{fa ? "بسته ساخت ویدیو را انتخاب کنید" : "Choose your video package"}</h1>
      <div className="economy-package-options">
        <article className="panel">
          <strong>{fa ? "بسته اصلی" : "Main package"}</strong>
          <span>{fa ? "همین حالا شروع کنید و مراحل تولید را خودتان مدیریت کنید." : "Start now and manage each production step."}</span>
          <span>{fa ? "قیمت بر اساس تنظیمات ویدیو، پیش از شروع تولید اعلام می‌شود." : "Review the price for your settings before production starts."}</span>
          {buy("main")}
          <button className="btn" type="button" onClick={() => setMode("main")}>{fa ? "شروع ساخت با اعتبار حساب" : "Create with account credits"}</button>
        </article>
        <article className="panel">
          <strong>{fa ? "بسته اقتصادی" : "Economy package"}</strong>
          <span>{fa ? "موضوع و کانال را بفرستید. ویدیو و بسته انتشار را طی ۱ تا ۲ روز دریافت کنید." : "Send your topic and channel. Receive the video and publishing kit in 1–2 days."}</span>
          {quote && <span>{n(quote.credits)} {fa ? "اعتبار" : "credits"} · {n(quote.discountPercent)}% {fa ? "تخفیف" : "discount"}</span>}
          {buy("economy")}
          <button className="btn" type="button" onClick={() => setMode("economy")}>{fa ? "سفارش با اعتبار حساب" : "Order with account credits"}</button>
        </article>
      </div>
    </section> : <>
      <button type="button" className="btn" onClick={() => setMode(null)}>{fa ? "بازگشت به انتخاب بسته" : "Back to packages"}</button>
      {mode === "main" ? children : <EconomyForm catalog={catalog} />}
    </>}
  </>;
}

function EconomyForm({ catalog }: { catalog: ReturnType<typeof useEconomyData> }) {
  const { fa, n } = useApp();
  const { data, failed, reload } = catalog;
  const [topic, setTopic] = useState("");
  const [channel, setChannel] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [review, setReview] = useState(false);
  const attempt = useRef({ signature: "", key: "" });
  const submitting = useRef(false);
  const quote = data?.quote;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!quote || submitting.current) return;
    if (!review) { setReview(true); return; }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const payload = { topic: topic.trim(), channel: channel.trim(), expectedCredits: quote.credits };
      const signature = JSON.stringify(payload);
      if (signature !== attempt.current.signature) attempt.current = { signature, key: crypto.randomUUID() };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, idempotencyKey: attempt.current.key }) });
      if (!response.ok) {
        if (response.status === 409) {
          setReview(false);
          reload();
          throw Error(fa ? "اطلاعات سفارش تغییر کرد. قیمت را دوباره بررسی کنید." : "Order details changed. Review the refreshed price.");
        }
        if (response.status === 402) throw Error(fa ? "اعتبار کافی نیست." : "Insufficient credits.");
        if (response.status === 400) throw Error(fa ? "موضوع و آدرس کانال یوتیوب را بررسی کنید." : "Check the topic and YouTube channel.");
        throw Error();
      }
      setOrdered(true);
    } catch (reason) {
      setError(reason instanceof Error && reason.message && !(reason instanceof TypeError) ? reason.message :
        fa ? "ثبت سفارش انجام نشد. دوباره تلاش کنید." : "Could not confirm the order. Try again.");
    } finally { submitting.current = false; setBusy(false); }
  }
  if (ordered) return <section className="panel" role="status">
    <h2>{fa ? "سفارش شما ثبت شد" : "Order received"}</h2>
    <p>{fa ? "بسته شما طی ۱ تا ۲ روز در پروفایلتان آماده می‌شود." : "Your package will be ready in your profile in 1–2 days."}</p>
    <Link href="/settings?tab=economy">{fa ? "مشاهده سفارش‌ها در پروفایل" : "View orders in my profile"}</Link>
  </section>;
  return <form className="vf-quick panel" onSubmit={submit}>
    <h2>{fa ? "بسته اقتصادی ویدیو" : "Economy video package"}</h2>
    <p>{fa ? "موضوع و کانال یوتیوبتان را بفرستید. طی ۱ تا ۲ روز، ویدیو، تصویر بندانگشتی و اطلاعات انتشار را از پروفایلتان تحویل بگیرید." :
      "Send your topic and YouTube channel. In 1–2 days, collect your video, thumbnail and publishing details from your profile."}</p>
    {quote && <p><strong>{n(quote.credits)} {fa ? "اعتبار" : "credits"}</strong> · {n(quote.durationSeconds)} {fa ? "ثانیه" : "seconds"} · {n(quote.discountPercent)}% {fa ? "تخفیف نسبت به قیمت عادی" : "off the standard price"} ({n(quote.standardCredits)})</p>}
    {failed ? <button type="button" onClick={reload}>{fa ? "تلاش دوباره برای دریافت قیمت" : "Retry loading price"}</button> :
      !quote && <p role="status">{data ? (fa ? "این بسته فعلاً در دسترس نیست." : "This package is currently unavailable.") : (fa ? "دریافت قیمت…" : "Loading price…")}</p>}
    {review ? <section aria-live="polite">
      <h3>{fa ? "تأیید سفارش" : "Review your order"}</h3>
      <p dir="auto">{topic}</p><p><bdi>{channel}</bdi></p>
      {quote && <p>{fa ? `با تأیید سفارش، ${n(quote.credits)} اعتبار از حسابتان کسر می‌شود.` : `Confirming this order will deduct ${n(quote.credits)} credits from your account.`}</p>}
      <button type="button" disabled={busy} onClick={() => setReview(false)}>{fa ? "ویرایش سفارش" : "Edit order"}</button>
    </section> : <><label className="vf-quick-topic">{fa ? "موضوع ویدیو" : "Video topic"}
      <textarea required rows={3} maxLength={2000} value={topic} onChange={e => setTopic(e.target.value)} /></label>
    <label className="vf-quick-topic">{fa ? "کانال یوتیوب" : "YouTube channel"}
      <input required maxLength={500} dir="ltr" placeholder="https://www.youtube.com/@channel" value={channel} onChange={e => setChannel(e.target.value)} /></label></>}
    {error && <p role="alert">{error}</p>}
    <button className="btn primary" disabled={!quote || busy || !topic.trim() || !channel.trim()}>
      {busy ? (fa ? "در حال ثبت…" : "Submitting…") : review ? (fa ? "تأیید و پرداخت با اعتبار" : "Confirm and pay with credits") : (fa ? "بررسی سفارش" : "Review order")}
    </button>
  </form>;
}

export function EconomyHistory() {
  const { fa, locale, n } = useApp();
  const { data, failed, reload } = useEconomyData();
  return <section id="economy-orders" className="panel">
    <h2>{fa ? "سفارش‌های بسته اقتصادی ویدیو" : "Economy video orders"}</h2>
    {failed ? <button type="button" onClick={reload}>{fa ? "دریافت دوباره سفارش‌ها" : "Retry loading orders"}</button> :
      !data ? <p role="status">{fa ? "در حال دریافت سفارش‌ها…" : "Loading orders…"}</p> :
      !data.orders.length && <p>{fa ? "هنوز سفارشی ثبت نکرده‌اید." : "You have no economy video orders yet."}</p>}
    {data?.orders.map(order => <article key={order.id}>
      <h3 dir="auto">{order.topic}</h3>
      <p><bdi>{order.channel}</bdi> · {new Date(order.createdAt).toLocaleDateString(locale)} · {n(order.credits)} {fa ? "اعتبار" : "credits"}</p>
      {order.status === "PENDING" ? <p>{fa ? "در انتظار تأیید" : "Pending approval"}</p> : order.status === "APPROVED" ? <p>{fa ? "تأیید شده و در حال آماده‌سازی" : "Approved and in production"}</p> : <>
        <p>{fa ? "آماده انتشار" : "Ready to publish"} {order.deliveredAt && new Date(order.deliveredAt).toLocaleDateString(locale)}</p>
        {order.videoUrl && <video className="economy-video" controls preload="metadata" src={order.videoUrl + "?preview=1"} poster={order.thumbnailUrl ? order.thumbnailUrl + "?preview=1" : undefined} aria-label={order.title || order.topic} />}
        {order.thumbnailUrl && <img className="economy-thumbnail" src={order.thumbnailUrl + "?preview=1"} alt={fa ? "تصویر بندانگشتی ویدیو" : "Video thumbnail"} loading="lazy" />}
        {order.videoUrl && <a className="btn" href={order.videoUrl} download>{fa ? "دریافت ویدیو" : "Download video"}</a>}
        {order.thumbnailUrl && <a className="btn" href={order.thumbnailUrl} download>{fa ? "دریافت تصویر بندانگشتی" : "Download thumbnail"}</a>}
        <a className="btn" download="publishing-details.json" href={"data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ title: order.title, description: order.description, tags: order.tags }, null, 2))}>
          {fa ? "دریافت اطلاعات انتشار" : "Download publishing details"}
        </a>
        <dl><dt>{fa ? "عنوان" : "Title"}</dt><dd dir="auto">{order.title}</dd>
          <dt>{fa ? "توضیحات" : "Description"}</dt><dd dir="auto" style={{ whiteSpace: "pre-wrap" }}>{order.description}</dd>
          <dt>{fa ? "برچسب‌ها" : "Tags"}</dt><dd dir="auto">{order.tags.join(fa ? "، " : ", ")}</dd></dl>
      </>}
    </article>)}
  </section>;
}
