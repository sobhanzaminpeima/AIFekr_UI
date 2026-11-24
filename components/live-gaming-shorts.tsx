"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "./providers";
import Link from "./site-link";

const endpoint = "/api/video-factory/gaming";
type Delivery = { title: string; description: string; tags: string[] };
type Order = {
  id: string; userId: string; sourceName: string; sourceFingerprint: string; sourceBytes: number; uploadedBytes: number; channel: string; language: string;
  status: string; delivery: string; createdAt: string;
  notifiedAt: string | null;
  pendingPaymentId?: string | null;
  requests?: { action: string; metadata: string | null; createdAt: string }[];
};
type Catalog = { orders: Order[]; unusedPurchases?: number; salesEnabled: boolean; uploadAllowed: boolean; maxBytes: number; maxSeconds: number; chunkBytes: number; planCode: string };
async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, credentials: "include" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.code || "REQUEST_FAILED");
  return data;
}
export function GamingShorts({ admin = false }: { admin?: boolean }) {
  const { fa, locale, n } = useApp();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [channel, setChannel] = useState("");
  const [rights, setRights] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<"CHECKING" | "UPLOADING" | "VERIFYING" | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [actionForm, setActionForm] = useState<{ id: string; action: string } | null>(null);
  const [actionText, setActionText] = useState("");
  const active = useRef(false);
  const attempt = useRef({ signature: "", key: "" });
  const load = useCallback(async () => {
    const data = await request(admin ? "/api/admin/video-factory/gaming" : endpoint);
    setOrders(data.orders);
    if (!admin) setCatalog(data);
  }, [admin]);
  useEffect(() => { load().catch(() => setError(fa ? "دریافت سفارش‌ها ممکن نشد." : "Could not load orders.")); }, [load, fa]);
  useEffect(() => {
    fetch("/api/packages", { cache: "no-store" }).then(r => r.json()).then(data => {
      const plan = data.packages?.find((p: { planCode: string; purchaseAvailable: boolean }) => p.planCode === "GAMING_SHORTS_3" && p.purchaseAvailable);
      const offer = plan?.offers?.monthly;
      if (offer?.minor > 0) setPrice(offer.currency === "IRT" ? n(offer.minor) + (fa ? " تومان" : " toman") :
        new Intl.NumberFormat(locale, { style: "currency", currency: offer.currency }).format(offer.minor / 100));
    }).catch(() => {});
  }, [fa, locale, n]);
  function readable(code: string) {
    const errors: Record<string, [string, string]> = {
      GAMING_PACKAGE_REQUIRED: ["بستهٔ Gaming Shorts تهیه نشده یا قبلاً مصرف شده است.", "Purchase an unused Gaming Shorts package."],
      GAMING_SALES_NOT_OPEN: ["فروش این خدمت پس از نهایی‌شدن نمونه و قیمت باز می‌شود.", "Sales open after the samples and pricing are approved."],
      SOURCE_LIMIT_EXCEEDED: ["ویدیو باید حداکثر ۳۰ دقیقه باشد.", "The source must be at most 30 minutes."],
      SOURCE_RESOLUTION_TOO_LOW: ["کیفیت فایل کمتر از 720p است؛ نسخهٔ اصلی را بارگذاری کنید.", "Upload the original file at 720p or higher."],
      INVALID_VIDEO: ["ویدیو قابل خواندن نیست؛ فایل MP4 با کدک H.264 انتخاب کنید.", "Choose a playable H.264 MP4 file."],
      UPLOAD_BUSY: ["آپلود دیگری در جریان است. کمی بعد دوباره ادامه دهید.", "Another upload is active. Resume shortly."],
      UPLOAD_QUOTA_EXCEEDED: ["دو پیش‌نویس فعال دارید؛ یکی را حذف کنید.", "Remove an unused draft before starting another upload."],
      STORAGE_FULL: ["فضای آپلود موقتاً پر است؛ با پشتیبانی تماس بگیرید.", "Upload storage is temporarily full. Contact support."],
      GAMING_CAPACITY_FULL: ["ظرفیت سفارش‌ها فعلاً تکمیل است؛ پرداخت جدید پذیرفته نمی‌شود.", "Order capacity is full. New purchases are paused."],
      REVISION_ALREADY_USED: ["یک نوبت اصلاح این سفارش استفاده شده است.", "This order's included revision has been used."],
      REVISION_WINDOW_CLOSED: ["مهلت هفت‌روزهٔ درخواست اصلاح تمام شده است؛ با پشتیبانی تماس بگیرید.", "The seven-day revision window has ended. Contact support."],
      RATE_LIMITED: ["آپلود موقتاً متوقف شد. یک دقیقه دیگر وضعیت را تازه کنید و از بخش ثبت‌شده ادامه دهید.", "Pause for one minute, refresh status, then resume from the saved offset."],
      FILE_CHANGED: ["فایل با انتخاب قبلی مطابقت ندارد؛ فایل اصلی را انتخاب کنید.", "Select the same original file to resume."],
    };
    return errors[code]?.[fa ? 0 : 1] || (fa ? "عملیات کامل نشد. وضعیت را تازه کنید و دوباره تلاش کنید." : "Could not finish. Refresh and retry.");
  }
  async function act(fn: () => Promise<void>) {
    if (active.current) return;
    active.current = true; setBusy(true); setError("");
    try { await fn(); await load(); }
    catch (e) { setError(readable(e instanceof Error ? e.message : "")); }
    finally { active.current = false; setBusy(false); setUploadPhase(null); }
  }
  async function upload() {
    if (!file || !catalog || !rights || !channel.trim()) return;
    setProgress(0); setUploadPhase("CHECKING");
    if (!file.name.toLowerCase().endsWith(".mp4") || file.size > catalog.maxBytes) throw Error("SOURCE_LIMIT_EXCEEDED");
    const sourceUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(Error("INVALID_VIDEO")), 20000);
        video.onloadedmetadata = () => { clearTimeout(timeout); resolve(); };
        video.onerror = () => { clearTimeout(timeout); reject(Error("INVALID_VIDEO")); };
        video.preload = "metadata";
        video.src = sourceUrl;
      });
      if (!Number.isFinite(video.duration) || video.duration <= 0 || video.duration > catalog.maxSeconds) throw Error("SOURCE_LIMIT_EXCEEDED");
      if (Math.min(video.videoWidth, video.videoHeight) < 720) throw Error("SOURCE_RESOLUTION_TOO_LOW");
    } finally { video.removeAttribute("src"); video.load(); URL.revokeObjectURL(sourceUrl); }
    // Fingerprint the ends to avoid accidentally appending a different source
    // after a browser restart. The server separately hashes the complete file.
    const sample = new Blob([file.slice(0, 65536), file.slice(Math.max(0, file.size - 65536))]);
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await sample.arrayBuffer())))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    const signature = JSON.stringify([file.name, file.size, digest, channel.trim(), locale]);
    let order: Order | undefined;
    if (resumeId) {
      order = catalog.orders.find(o => o.id === resumeId);
      if (!order || order.sourceName !== file.name || order.sourceBytes !== file.size || order.sourceFingerprint !== digest) throw Error("FILE_CHANGED");
    } else {
      const storageKey = "aifekr:gaming-upload";
      let saved: { signature: string; key: string } | null = null;
      try { saved = JSON.parse(localStorage.getItem(storageKey) || "null"); } catch {}
      const key = saved?.signature === signature ? saved.key :
        attempt.current.signature === signature ? attempt.current.key : crypto.randomUUID();
      attempt.current = { signature, key };
      try { localStorage.setItem(storageKey, JSON.stringify({ signature, key })); } catch {}
      order = (await request(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestKey: key, sourceName: file.name, sourceBytes: file.size, sourceFingerprint: digest,
          channel: channel.trim(), language: locale, rightsConfirmed: true }) })).order;
    }
    if (!order) throw Error();
    let offset = order.uploadedBytes;
    setUploadPhase("UPLOADING");
    setProgress(Math.round(offset * 100 / file.size));
    while (offset < file.size) {
      const chunk = file.slice(offset, Math.min(offset + catalog.chunkBytes, file.size));
      const result = await request(endpoint + "/" + order.id, { method: "PUT",
        headers: { "Content-Type": "application/octet-stream", "X-Upload-Offset": String(offset) }, body: chunk });
      offset = result.uploadedBytes;
      setProgress(Math.round(offset * 100 / file.size));
    }
    setUploadPhase("VERIFYING");
    await request(endpoint + "/" + order.id, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "FINISH_UPLOAD" }) });
    setFile(null); setResumeId(null);
  }
  const adminAction = async (id: string, action: string) => {
    await request("/api/admin/video-factory/gaming", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
  };
  const state: Record<string, string> = fa
    ? { DRAFT: "آپلود ناتمام", UPLOADED: "فایل آماده؛ منتظر ثبت سفارش", PENDING: "در انتظار تأیید تیم", APPROVED: "در حال تدوین", DELIVERED: "آمادهٔ دریافت", REVISION_REQUESTED: "درخواست اصلاح ثبت شد", CANCEL_REQUESTED: "لغو در انتظار بررسی و تعیین تکلیف پرداخت", CANCELLED: "پس از بررسی مدیر لغو شد" }
    : { DRAFT: "Upload incomplete", UPLOADED: "Ready to submit", PENDING: "Awaiting team approval", APPROVED: "Editing", DELIVERED: "Ready", REVISION_REQUESTED: "Revision requested", CANCEL_REQUESTED: "Cancellation and payment review pending", CANCELLED: "Cancelled after administrator review" };
  function customerRequest(id: string, action: string) {
    setActionForm({ id, action });setActionText("");
  }
  return <section className="panel vf-quick" id="gaming-shorts">
    <h2>{fa ? "تبدیل گیم‌پلی به سه شورت" : "Turn gameplay into three Shorts"}</h2>
    <p>{fa ? "یک فایل MP4 با کیفیت 720p یا بالاتر، حداکثر ۳۰ دقیقه و ۵۰۰ مگابایت؛ سه شورت عمودی با بازبینی تیم، کاور، زیرنویس قابل ویرایش و اطلاعات انتشار. تحویل ۱ تا ۲ روز کاری پس از تأیید سفارش و کیفیت فایل." :
      "One MP4 at 720p or higher, up to 30 minutes and 500 MB. Three team-reviewed vertical Shorts, covers, editable captions and publishing details. Delivery in 1–2 business days after order and source-quality approval."}</p>
    {!admin && <>
      <p>{fa ? "پس از خرید، ۳۰ روز برای ثبت سفارش فرصت دارید. یک نوبت اصلاح در چارچوب سفارش، تا هفت روز پس از تحویل. پیش از شروع تدوین می‌توانید درخواست لغو بدهید؛ وضعیت پرداخت پس از بررسی مدیر مشخص می‌شود." : "Submit within 30 days of purchase. Request one in-scope revision within seven days of delivery. Before editing begins, you may request cancellation; the administrator reviews payment resolution."}</p>
      <p role="status">{price && catalog?.salesEnabled ? price : fa ? "پذیرش سفارش هنوز باز نشده است. قیمت و شرایط نهایی پیش از پرداخت نمایش داده می‌شود." : "Order intake is not open yet. Final pricing and terms will be shown before payment."}</p>
      <ol><li>{fa ? "آپلود و بررسی فایل، بدون پرداخت" : "Upload and check your file, without payment"}</li><li>{fa ? "بررسی مبلغ و شرایط، سپس پرداخت زرین‌پال" : "Review the price and terms, then pay with Zarinpal"}</li><li>{fa ? "ثبت خودکار سفارش پس از پرداخت موفق؛ تدوین با بازبینی تیم" : "Automatic order submission after payment; team-reviewed editing"}</li></ol>
      <label>{fa ? "کانال شما" : "Your channel"}<input value={channel} onChange={e => setChannel(e.target.value)} disabled={busy} maxLength={500} /></label>
      <label>{fa ? "فایل اصلی MP4" : "Original MP4"}<input type="file" accept="video/mp4,.mp4" disabled={busy} onChange={e => setFile(e.target.files?.[0] || null)} /></label>
      <label><input type="checkbox" checked={rights} disabled={busy} onChange={e => setRights(e.target.checked)} />{fa ? "این ویدیو متعلق به من است یا اجازهٔ تدوین و انتشار آن را دارم." : "I own this video or have permission to edit and publish it."}</label>
      <button className="btn" disabled={busy || !file || !rights || !channel.trim() || !catalog?.uploadAllowed} onClick={() => void act(upload)}>{fa ? "آپلود / ادامهٔ آپلود" : "Upload / resume"}</button>
      {busy && uploadPhase && <p role="status">{uploadPhase === "CHECKING"
        ? (fa ? "در حال بررسی کیفیت و مدت فایل…" : "Checking source quality and duration…")
        : uploadPhase === "VERIFYING" ? (fa ? "آپلود کامل شد؛ در حال تأیید فایل…" : "Upload complete; verifying the file…")
        : (fa ? `در حال آپلود؛ ${n(progress)}٪` : `Uploading: ${n(progress)}%`)}</p>}
      {busy && uploadPhase === "UPLOADING" && <progress aria-label={fa ? "پیشرفت آپلود" : "Upload progress"} max={100} value={progress} />}
    </>}
    {error && <p role="alert">{error}</p>}
    {actionForm && <form className="panel" onSubmit={e => { e.preventDefault();void act(async () => {
      await request(admin ? "/api/admin/video-factory/gaming" : endpoint + "/" + actionForm.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(admin ? { ...actionForm, note: actionText.trim() } : { action: actionForm.action, message: actionText.trim() }) });
      setActionForm(null);setActionText("");
    }); }}>
      <h3>{admin ? (fa ? "ثبت نتیجهٔ بررسی" : "Record review outcome") : (fa ? "جزئیات درخواست" : "Request details")}</h3>
      {actionForm.action === "RESOLVE_CANCEL" && <p>{fa ? "فقط پس از توافق با مشتری و تعیین تکلیف واقعی وجه، نتیجه و مرجع پیگیری را ثبت کنید. این دکمه وجهی منتقل نمی‌کند." : "Record the agreement and payment-resolution reference only after resolving it with the customer. This button does not transfer money."}</p>}
      <label>{fa ? "توضیحات (حداقل ۱۰ حرف)" : "Details (at least 10 characters)"}<textarea required minLength={10} maxLength={2000} rows={4} value={actionText} onChange={e => setActionText(e.target.value)} /></label>
      <button className="btn primary" disabled={busy || actionText.trim().length < 10}>{fa ? "ثبت و اطلاع‌رسانی" : "Submit and notify"}</button>
      <button className="btn" type="button" disabled={busy} onClick={() => setActionForm(null)}>{fa ? "انصراف" : "Back"}</button>
    </form>}
    <button className="btn" disabled={busy} onClick={() => void act(load)}>{fa ? "تازه‌سازی وضعیت" : "Refresh status"}</button>
    {orders.map(order => {
      const base = endpoint + "/" + order.id + "/";
      const delivery: Delivery[] = JSON.parse(order.delivery || "[]");
      return <article className="panel" key={order.id}>
        <h3 dir="auto" style={{ overflowWrap: "anywhere" }}>{order.sourceName}</h3><p>{state[order.status] || order.status} · {n(Math.round(order.uploadedBytes / 104857.6) / 10)} MB</p>
        {!admin && order.status === "DRAFT" && <button className="btn" disabled={busy} onClick={() => { setResumeId(order.id); setChannel(order.channel); setRights(false); setError(""); }}>{fa ? "انتخاب این آپلود برای ادامه" : "Resume this upload"}</button>}
        {!admin && ["DRAFT", "UPLOADED"].includes(order.status) && <button className="btn" disabled={busy} onClick={() => {
          if (confirm(fa ? "پیش‌نویس و فایل آن حذف شود؟" : "Delete this draft and its source?")) void act(async () => { await request(endpoint + "/" + order.id, { method: "DELETE" }); });
        }}>{fa ? "حذف پیش‌نویس" : "Delete draft"}</button>}
        {!admin && order.status === "UPLOADED" && order.pendingPaymentId && <Link className="btn primary" href="/payments">{fa ? "ادامه یا لغو پرداخت این سفارش" : "Continue or cancel this order's payment"}</Link>}
        {!admin && order.status === "UPLOADED" && !order.pendingPaymentId && catalog?.salesEnabled && !catalog?.unusedPurchases && <>
          <p>{fa ? "فایل از بررسی فنی عبور کرد. مبلغ و شرایط را پیش از پرداخت بررسی کنید؛ تدوین پس از پرداخت و تأیید تیم شروع می‌شود." : "Your file passed technical checks. Review the price and terms before paying. Editing starts after payment and team approval."}</p>
          <Link className="btn primary" href={"/plans?plan=GAMING_SHORTS_3&gamingOrderId=" + order.id}>{fa ? "بررسی سفارش و پرداخت با زرین‌پال" : "Review order and pay with Zarinpal"}</Link>
        </>}
        {!admin && order.status === "UPLOADED" && !!catalog?.unusedPurchases && <button className="btn primary" disabled={busy} onClick={() => {
          if (confirm(fa ? "ثبت سفارش با مصرف یک بستهٔ خریداری‌شده؟" : "Submit using one purchased package?")) void act(async () => { await request(endpoint + "/" + order.id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "SUBMIT" }) }); });
        }}>{fa ? "ثبت با بستهٔ خریداری‌شده" : "Submit using purchased package"}</button>}
        {!admin && order.status === "PENDING" && <button className="btn" disabled={busy} onClick={() => customerRequest(order.id, "REQUEST_CANCEL")}>{fa ? "درخواست لغو پیش از تدوین" : "Request cancellation before editing"}</button>}
        {!admin && order.status === "DELIVERED" && <button className="btn" disabled={busy} onClick={() => customerRequest(order.id, "REQUEST_REVISION")}>{fa ? "درخواست یک نوبت اصلاح" : "Request the included revision"}</button>}
        {admin && <>
          <p>{order.userId || ""}</p>
          <p dir="auto" style={{ overflowWrap: "anywhere" }}>{order.channel} · {order.language}</p>
          {order.requests?.map((item, index) => <p key={index} dir="auto">{JSON.parse(item.metadata || "{}").message}</p>)}
          {order.status === "CANCEL_REQUESTED" && <><p>{fa ? "تدوین متوقف است. درخواست و وضعیت وجه را با کاربر تعیین تکلیف کنید؛ بازگشت وجه خودکار نیست." : "Editing is paused. Resolve the request and payment with the customer. Refunds are not automatic."}</p>
            <button className="btn" disabled={busy} onClick={() => customerRequest(order.id, "RESOLVE_CANCEL")}>{fa ? "ثبت نتیجه و بستن سفارش" : "Record resolution and close"}</button>
            <button className="btn" disabled={busy} onClick={() => customerRequest(order.id, "RESUME")}>{fa ? "ادامه با توافق مشتری" : "Resume with customer agreement"}</button></>}
          {order.status === "REVISION_REQUESTED" && <button className="btn" disabled={busy} onClick={() => void act(() => adminAction(order.id, "APPROVE"))}>{fa ? "شروع اصلاح" : "Start revision"}</button>}
          <a className="btn" href={"/api/admin/video-factory/gaming/" + order.id + "/source"}>{fa ? "دانلود منبع" : "Download source"}</a>
          {order.status === "PENDING" && <button className="btn" disabled={busy} onClick={() => void act(() => adminAction(order.id, "APPROVE"))}>{fa ? "تأیید و ایمیل" : "Approve and email"}</button>}
          {order.status === "APPROVED" && <label>{fa ? "آپلود ZIP سه شورت و فایل‌های انتشار (حداکثر ۱۵۰ MB)" : "Upload delivery ZIP, max 150 MB"}
            <small dir="ltr">clip-1.mp4 / cover-1.png / captions-1.srt · repeat for 2 and 3 · publishing.json: [&#123; title, description, tags &#125;, …]</small>
            <input type="file" accept=".zip,application/zip" disabled={busy} onChange={e => {
              const zip = e.target.files?.[0]; if (!zip) return;
              void act(async () => { await request("/api/admin/video-factory/gaming?id=" + order.id, { method: "POST", headers: { "Content-Type": "application/zip" }, body: zip }); });
            }} />
          </label>}
          {order.status === "DELIVERED" && <button className="btn" disabled={busy || !!order.notifiedAt} onClick={() => void act(() => adminAction(order.id, "NOTIFY"))}>{order.notifiedAt ? (fa ? "ایمیل در صف ارسال قرار گرفت" : "Email queued") : (fa ? "اطلاع‌رسانی تحویل" : "Notify customer")}</button>}
        </>}
        {!admin && order.status === "DELIVERED" && <>
          <a className="btn primary" href={base + "delivery.zip"}>{fa ? "دانلود همهٔ فایل‌ها" : "Download everything"}</a>
          {delivery.map((clip, index) => <div key={index}>
            <h4 dir="auto">{clip.title}</h4><video className="economy-video" controls preload="metadata" poster={base + `cover-${index + 1}.png?preview=1`} src={base + `clip-${index + 1}.mp4?preview=1`} />
            <p dir="auto">{clip.description}</p><p dir="auto">{clip.tags.join(", ")}</p>
            <a className="btn" href={base + `clip-${index + 1}.mp4`}>{fa ? "ویدیو" : "Video"}</a>
            <a className="btn" href={base + `cover-${index + 1}.png`}>{fa ? "کاور" : "Cover"}</a>
            <a className="btn" href={base + `captions-${index + 1}.srt`}>{fa ? "زیرنویس" : "Captions"}</a>
          </div>)}
        </>}
      </article>;
    })}
  </section>;
}
