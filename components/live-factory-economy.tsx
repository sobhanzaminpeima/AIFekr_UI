"use client";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useApp } from "./providers";
import Link from "./site-link";

const endpoint = "/api/video-factory/economy";
type Order = {
  id: string; topic: string; channel: string; status: "PENDING" | "DELIVERED";
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

export function EconomyCreation({ children }: { children: ReactNode }) {
  const { fa } = useApp();
  const [economy, setEconomy] = useState(false);
  return <>
    <fieldset className="vf-quick-row">
      <legend>{fa ? "روش ساخت ویدیو" : "Video production"}</legend>
      {[false, true].map(value => <button type="button" key={String(value)} aria-pressed={economy === value}
        className={"vf-chip" + (economy === value ? " selected" : "")} onClick={() => setEconomy(value)}>
        {value ? (fa ? "بسته اقتصادی" : "Economy package") : (fa ? "ساخت خودکار" : "Automatic production")}
      </button>)}
    </fieldset>
    <div hidden={economy}>{children}</div>
    {economy && <EconomyForm />}
  </>;
}

function EconomyForm() {
  const { fa, n } = useApp();
  const { data, failed, reload } = useEconomyData();
  const [topic, setTopic] = useState("");
  const [channel, setChannel] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const attempt = useRef({ signature: "", key: "" });
  const submitting = useRef(false);
  const quote = data?.quote;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!quote || submitting.current) return;
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
    <Link href="/settings#economy-orders">{fa ? "مشاهده سفارش‌ها در پروفایل" : "View orders in my profile"}</Link>
  </section>;
  return <form className="vf-quick panel" onSubmit={submit}>
    <h2>{fa ? "بسته اقتصادی ویدیو" : "Economy video package"}</h2>
    <p>{fa ? "موضوع و کانال یوتیوبتان را بفرستید. طی ۱ تا ۲ روز، ویدیو، تصویر بندانگشتی و اطلاعات انتشار را از پروفایلتان تحویل بگیرید." :
      "Send your topic and YouTube channel. In 1–2 days, collect your video, thumbnail and publishing details from your profile."}</p>
    {quote && <p><strong>{n(quote.credits)} {fa ? "اعتبار" : "credits"}</strong> · {n(quote.durationSeconds)} {fa ? "ثانیه" : "seconds"} · {n(quote.discountPercent)}% {fa ? "تخفیف نسبت به قیمت عادی" : "off the standard price"} ({n(quote.standardCredits)})</p>}
    {failed ? <button type="button" onClick={reload}>{fa ? "تلاش دوباره برای دریافت قیمت" : "Retry loading price"}</button> :
      !quote && <p role="status">{data ? (fa ? "این بسته فعلاً در دسترس نیست." : "This package is currently unavailable.") : (fa ? "دریافت قیمت…" : "Loading price…")}</p>}
    <label className="vf-quick-topic">{fa ? "موضوع ویدیو" : "Video topic"}
      <textarea required rows={3} maxLength={2000} value={topic} onChange={e => setTopic(e.target.value)} /></label>
    <label className="vf-quick-topic">{fa ? "کانال یوتیوب" : "YouTube channel"}
      <input required maxLength={500} dir="ltr" placeholder="https://www.youtube.com/@channel" value={channel} onChange={e => setChannel(e.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <button className="btn primary" disabled={!quote || busy || !topic.trim() || !channel.trim()}>
      {busy ? (fa ? "در حال ثبت…" : "Submitting…") : (fa ? "ثبت سفارش" : "Place order")}
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
      {order.status === "PENDING" ? <p>{fa ? "در حال آماده‌سازی · تحویل طی ۱ تا ۲ روز از ثبت سفارش" : "In preparation · delivery within 1–2 days of ordering"}</p> : <>
        <p>{fa ? "آماده انتشار" : "Ready to publish"} {order.deliveredAt && new Date(order.deliveredAt).toLocaleDateString(locale)}</p>
        {order.videoUrl && <a className="btn" href={order.videoUrl} download>{fa ? "دریافت ویدیو" : "Download video"}</a>}
        {order.thumbnailUrl && <a className="btn" href={order.thumbnailUrl} download>{fa ? "دریافت تصویر بندانگشتی" : "Download thumbnail"}</a>}
        <dl><dt>{fa ? "عنوان" : "Title"}</dt><dd dir="auto">{order.title}</dd>
          <dt>{fa ? "توضیحات" : "Description"}</dt><dd dir="auto" style={{ whiteSpace: "pre-wrap" }}>{order.description}</dd>
          <dt>{fa ? "برچسب‌ها" : "Tags"}</dt><dd dir="auto">{order.tags.join(fa ? "، " : ", ")}</dd></dl>
      </>}
    </article>)}
  </section>;
}
