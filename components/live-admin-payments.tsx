"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { useShell } from "./live-shell-context";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * The design's purchase & receipt register on aifekr.com (main site
 * /api/admin/payments). Reviews use the classic endpoints unchanged: bank
 * receipts are approved or rejected (with a note) only after the admin
 * confirms the transfer, gateway orders are re-checked with the gateway, and
 * unpaid orders get a continuation link or are cancelled with a reason.
 */
type Payment = { id: string; userId: string; plan: string; amount: number; status: string; gateway: string | null; transferMinor: number | null; transferCurrency: string | null; receiptAt: string | null; reviewNote: string | null; notificationSentAt: string | null; notificationError: boolean; createdAt: string; user: { name: string | null; email: string | null; phone: string | null } };
type Total = { status: string; gateway: string | null; currency: string | null; count: number; amount: number; transferMinor: number };
type Data = { payments: Payment[]; total: number; totalPages: number; totals: Total[]; buyers: number; commission: { amount: number; count: number }; payouts: { status: string; amount: number; count: number }[] };
type Tx = [string, string, string, string];

export function LiveAdminPayments() {
  const { n, locale } = useApp();
  const shell = useShell();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const planName = (code: string) => shell?.copy.planNames?.[code] || code;
  const seq = useRef(0);
  const [filters, setFilters] = useState({ search: "", status: "", from: "", to: "", userId: "" });
  // ?status= and ?userId= links (e.g. from a user profile) open the register filtered.
  useEffect(() => { const q = new URLSearchParams(location.search); if (q.get("status") || q.get("userId")) setFilters((f) => ({ ...f, status: q.get("status") || "", userId: q.get("userId") || "" })); }, []);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Payment | null>(null);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page) });
      for (const [k, v] of Object.entries(filters)) if (v.trim()) q.set(k, v.trim());
      const res = await fetch("/api/admin/payments?" + q, { credentials: "include" });
      const body = await res.json().catch(() => ({}));
      if (mine !== seq.current) return;
      if (!res.ok) throw Error(body.error || "");
      setData(body);
    } catch (e) { if (mine === seq.current) toast.error((e instanceof Error && e.message) || tx(["دریافت پرداخت‌ها انجام نشد", "Could not load payments", "Zahlungen konnten nicht geladen werden", "Ödemeler yüklenemedi"])); }
    finally { if (mine === seq.current) setLoading(false); }
  }, [page, filters]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const set = (k: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setFilters({ ...filters, [k]: e.target.value }); setPage(1); };
  const money = (p: { gateway: string | null; transferMinor: number | null; transferCurrency: string | null; amount: number }) =>
    p.gateway === "bank_transfer" && p.transferCurrency ? n((p.transferMinor || 0) / 100) + " " + p.transferCurrency : n(p.amount) + " " + tx(["تومان", "Toman", "Toman", "Tümen"]);
  const statusLabel: Record<string, Tx> = {
    PENDING: ["در انتظار", "Pending", "Ausstehend", "Bekliyor"], SUCCESS: ["موفق", "Paid", "Bezahlt", "Ödendi"], REJECTED: ["ردشده", "Rejected", "Abgelehnt", "Reddedildi"],
    FAILED: ["ناموفق", "Failed", "Fehlgeschlagen", "Başarısız"], CANCELLED: ["لغوشده", "Cancelled", "Storniert", "İptal"],
  };
  const badge = (s: string) => "badge " + (s === "SUCCESS" ? "green" : s === "PENDING" ? "orange" : "red");
  const date = (iso: string) => new Date(iso).toLocaleString(["fa-IR", "en-GB", "de-DE", "tr-TR"][i], { dateStyle: "medium", timeStyle: "short" });
  // Sales per currency (successful payments only), as on the classic page.
  const sales = new Map<string, number>();
  for (const g of data?.totals ?? []) if (g.status === "SUCCESS") { const key = g.gateway === "bank_transfer" && g.currency ? g.currency : "IRT"; sales.set(key, (sales.get(key) || 0) + (key === "IRT" ? g.amount : g.transferMinor / 100)); }
  const pending = (data?.totals ?? []).filter((g) => g.status === "PENDING").reduce((a, g) => a + g.count, 0);

  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Receipt" size={28} /></span>
        <div>
          <h2>{tx(["دفتر خریدها و رسیدها", "Purchase & receipt register", "Käufe & Belege", "Satın alma ve dekont defteri"])}</h2>
          <p>{tx(["هر سفارش را باز کن، رسید را بررسی کن و فقط پس از اطمینان از واریز تأیید کن.", "Open each order, check its receipt and approve only once the transfer is confirmed.", "Öffne jede Bestellung, prüfe den Beleg und gib erst nach bestätigtem Eingang frei.", "Her siparişi aç, dekontu kontrol et ve yalnızca transfer doğrulanınca onayla."])}</p>
        </div>
      </div>
      <nav className="admin-finance-links">
        <Link className="btn" href="/admin/financial/customers">{tx(["خریداران و مدیریت انقضا", "Customers & expiry", "Käufer & Ablauf", "Müşteriler ve süre"])}</Link>
        <Link className="btn" href="/admin/referrals">{tx(["کد دعوت و اینفلوئنسرها", "Invite codes & influencers", "Einladungscodes & Influencer", "Davet kodları ve influencerlar"])}</Link>
        <Link className="btn" href="/admin/wallet">{tx(["ولت و تسویه‌ها", "Wallets & payouts", "Wallets & Auszahlungen", "Cüzdan ve ödemeler"])}</Link>
      </nav>
      <div className="stats-grid">
        <div className="panel stat"><span>{tx(["خریداران تأییدشده", "Approved buyers", "Bestätigte Käufer", "Onaylı alıcılar"])}</span><strong>{data ? n(data.buyers) : "—"}</strong></div>
        <button type="button" className="panel stat admin-pulse-stat" onClick={() => { setFilters({ ...filters, status: "PENDING" }); setPage(1); }}>
          <span>{tx(["در انتظار بررسی", "Awaiting review", "Wartet auf Prüfung", "İnceleme bekliyor"])}</span><strong>{data ? n(pending) : "—"}</strong>
        </button>
        {[...sales].map(([code, amount]) => (
          <div className="panel stat" key={code}><span>{tx(["فروش موفق", "Paid sales", "Bezahlte Umsätze", "Başarılı satış"])} · {code === "IRT" ? tx(["تومان", "Toman", "Toman", "Tümen"]) : code}</span><strong>{n(amount)}</strong></div>
        ))}
        <div className="panel stat"><span>{tx(["کمیسیون رفرال (تومان)", "Referral commission (Toman)", "Empfehlungsprovision (Toman)", "Referans komisyonu (Tümen)"])}</span><strong>{data ? n(data.commission.amount) : "—"}</strong>
          {data?.payouts.length ? <small>{data.payouts.map((p) => p.status + ": " + n(p.count)).join(" · ")}</small> : null}
        </div>
      </div>
      <div className="admin-finance-filters">
        <label>{tx(["جست‌وجو", "Search", "Suche", "Ara"])}<input value={filters.search} onChange={set("search")} placeholder={tx(["شناسه، طرح، نام یا ایمیل", "ID, plan, name or email", "ID, Tarif, Name oder E-Mail", "Kimlik, plan, ad veya e-posta"])} /></label>
        <label>{tx(["وضعیت پرداخت", "Payment status", "Zahlungsstatus", "Ödeme durumu"])}
          <select value={filters.status} onChange={set("status")}>
            <option value="">{tx(["همه", "All", "Alle", "Tümü"])}</option>
            {Object.keys(statusLabel).map((s) => <option key={s} value={s}>{tx(statusLabel[s])}</option>)}
          </select>
        </label>
        <label>{tx(["از تاریخ", "From date", "Von", "Başlangıç"])}<input type="date" value={filters.from} onChange={set("from")} /></label>
        <label>{tx(["تا تاریخ", "To date", "Bis", "Bitiş"])}<input type="date" min={filters.from || undefined} value={filters.to} onChange={set("to")} /></label>
        {filters.userId && <Button onClick={() => { setFilters({ ...filters, userId: "" }); setPage(1); }}><Icon name="X" size={14} />{tx(["حذف فیلتر کاربر", "Clear user filter", "Benutzerfilter entfernen", "Kullanıcı filtresini kaldır"])}</Button>}
      </div>
      <section className="panel" aria-busy={loading}>
        {data?.payments.length ? (
          <div className="table-scroll">
            <table className="admin-finance-table">
              <thead><tr>{[tx(["رسید و تاریخ", "Receipt & date", "Beleg & Datum", "Dekont ve tarih"]), tx(["خریدار", "Buyer", "Käufer", "Alıcı"]), tx(["طرح", "Plan", "Tarif", "Plan"]), tx(["مبلغ", "Amount", "Betrag", "Tutar"]), tx(["وضعیت", "Status", "Status", "Durum"]), ""].map((h, k) => <th key={k}>{h}</th>)}</tr></thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td><Link href={"/admin/financial/invoices/" + encodeURIComponent(p.id)}><bdi dir="ltr">{p.id.slice(-10)}</bdi></Link><small>{date(p.createdAt)}</small></td>
                    <td><Link href={"/admin/users/" + encodeURIComponent(p.userId)}>{p.user.name || p.user.email || p.user.phone || p.userId}</Link></td>
                    <td>{planName(p.plan)}</td>
                    <td dir="ltr">{money(p)}</td>
                    <td><span className={badge(p.status)}>{tx(statusLabel[p.status] || [p.status, p.status, p.status, p.status])}</span>{p.receiptAt && <small>{tx(["رسید دارد", "Has receipt", "Mit Beleg", "Dekontlu"])}</small>}</td>
                    <td><Button variant={p.status === "PENDING" ? "primary" : ""} onClick={() => setOpen(p)}>{p.status === "PENDING" ? tx(["بررسی", "Review", "Prüfen", "İncele"]) : tx(["جزئیات", "Details", "Details", "Ayrıntılar"])}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !loading && <Empty />}
        <div className="pagination">
          <span>{n(data?.total ?? 0)} {tx(["سفارش", "orders", "Bestellungen", "sipariş"])}</span>
          <div>
            <Button disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>{tx(["قبلی", "Previous", "Zurück", "Önceki"])}</Button>
            <span>{n(page)} / {n(data?.totalPages ?? 1)}</span>
            <Button disabled={page >= (data?.totalPages ?? 1) || loading} onClick={() => setPage(page + 1)}>{tx(["بعدی", "Next", "Weiter", "Sonraki"])}</Button>
          </div>
        </div>
      </section>
      {open && <PaymentReview payment={open} tx={tx} money={money} planName={planName} statusLabel={statusLabel} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); void load(); }} />}
    </>
  );
}

function PaymentReview({ payment: p, tx, money, planName, statusLabel, onClose, onChanged }: { payment: Payment; tx: (c: Tx) => string; money: (p: Payment) => string; planName: (c: string) => string; statusLabel: Record<string, Tx>; onClose: () => void; onChanged: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  async function call(url: string, init: RequestInit) {
    setBusy(true); setMessage("");
    try {
      const res = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw Error(body.error || "REQUEST_FAILED");
      return body;
    } catch (e) { setMessage(e instanceof Error ? e.message : "REQUEST_FAILED"); return null; }
    finally { setBusy(false); }
  }
  const patch = (action: string, text: string) => call("/api/admin/payments/" + encodeURIComponent(p.id), { method: "PATCH", body: JSON.stringify({ action, note: text }) });
  async function review(action: "approve" | "reject") {
    if (action === "approve" && !confirm(tx(["انتقال بانکی را بررسی کردید؟ با تأیید، اشتراک و کمیسیون ثبت می‌شود.", "Have you verified the bank transfer? Approval activates the subscription and commission.", "Bankeingang geprüft? Die Freigabe aktiviert Abo und Provision.", "Banka transferini doğruladınız mı? Onay aboneliği ve komisyonu etkinleştirir."]))) return;
    if (await patch(action, note)) { toast.success(action === "approve" ? tx(["پرداخت تأیید شد", "Payment approved", "Zahlung freigegeben", "Ödeme onaylandı"]) : tx(["رسید رد شد", "Receipt rejected", "Beleg abgelehnt", "Dekont reddedildi"])); onChanged(); }
  }
  async function cancel() {
    if (!confirm(tx(["فقط سفارش پرداخت‌نشده لغو می‌شود؛ این کار برگشت وجه درگاه نیست. ادامه می‌دهید؟", "Cancel the unpaid order? This does not refund a gateway payment.", "Unbezahlte Bestellung stornieren? Dies ist keine Rückerstattung.", "Ödenmemiş sipariş iptal edilsin mi? Bu işlem para iadesi değildir."]))) return;
    const body = await patch("cancel", note);
    if (body) { toast.success(body.status === "SUCCESS" ? tx(["پرداخت قبلاً انجام شده بود؛ تأیید و فعال شد.", "Payment was already completed and has been verified.", "Die Zahlung war bereits erfolgt und wurde bestätigt.", "Ödeme zaten tamamlanmış ve doğrulanmıştır."]) : tx(["سفارش لغو شد؛ سوابق محفوظ است.", "Order cancelled; history retained.", "Bestellung storniert; Verlauf bleibt.", "Sipariş iptal edildi; kayıtlar korundu."])); onChanged(); }
  }
  async function continuation() {
    const body = await patch("continue", "Continue pending payment");
    if (!body) return;
    if (body.url) setLink(new URL(body.url, location.origin).toString());
    else if (body.status === "SUCCESS") { toast.success(tx(["پرداخت قبلاً انجام شده بود؛ تأیید و فعال شد.", "Payment was already completed and has been verified.", "Die Zahlung war bereits erfolgt und wurde bestätigt.", "Ödeme zaten tamamlanmış ve doğrulanmıştır."])); onChanged(); }
  }
  async function recheck() {
    if (await call("/api/admin/payments/" + encodeURIComponent(p.id) + "/verify", { method: "POST" })) { toast.success(tx(["پرداخت تأیید و پکیج فعال شد.", "Payment verified and the package activated.", "Zahlung bestätigt, Paket aktiviert.", "Ödeme doğrulandı, paket etkinleştirildi."])); onChanged(); }
  }
  async function notify() {
    if (await call("/api/admin/payments/" + encodeURIComponent(p.id) + "/notify", { method: "POST" })) setMessage(tx(["سرویس ایمیل ارسال را پذیرفت؛ پوشه اسپم را هم بررسی کنید.", "Email accepted by the provider; also check spam.", "Versand angenommen; auch Spam prüfen.", "E-posta kabul edildi; spam klasörünü de kontrol edin."]));
  }
  const pending = p.status === "PENDING";
  return (
    <Modal title={tx(["سفارش", "Order", "Bestellung", "Sipariş"]) + " · " + planName(p.plan)} onClose={onClose}>
      <dl className="domain-detail">
        <div><dt>{tx(["شناسه", "ID", "ID", "Kimlik"])}</dt><dd dir="ltr">{p.id}</dd></div>
        <div><dt>{tx(["خریدار", "Buyer", "Käufer", "Alıcı"])}</dt><dd>{p.user.name || "—"} <bdi dir="ltr">{p.user.email || p.user.phone || ""}</bdi></dd></div>
        <div><dt>{tx(["مبلغ", "Amount", "Betrag", "Tutar"])}</dt><dd dir="ltr">{money(p)}</dd></div>
        <div><dt>{tx(["روش", "Method", "Methode", "Yöntem"])}</dt><dd>{p.gateway || "—"}</dd></div>
        <div><dt>{tx(["وضعیت", "Status", "Status", "Durum"])}</dt><dd>{tx(statusLabel[p.status] || [p.status, p.status, p.status, p.status])}</dd></div>
        {p.reviewNote && <div><dt>{tx(["یادداشت بررسی", "Review note", "Prüfnotiz", "İnceleme notu"])}</dt><dd>{p.reviewNote}</dd></div>}
      </dl>
      <div className="admin-payment-review">
        {p.receiptAt && <a className="btn" href={"/api/payment/" + encodeURIComponent(p.id) + "/receipt"} target="_blank" rel="noopener"><Icon name="Download" size={16} />{tx(["دریافت رسید", "Download receipt", "Beleg herunterladen", "Dekontu indir"])}</a>}
        {pending && <label>{p.receiptAt ? tx(["توضیح بررسی (برای رد الزامی)", "Review note (required to reject)", "Prüfnotiz (für Ablehnung nötig)", "İnceleme notu (ret için gerekli)"]) : tx(["دلیل لغو سفارش پرداخت‌نشده", "Reason for cancelling the unpaid order", "Grund für die Stornierung", "Ödenmemiş siparişin iptal nedeni"])}
          <input value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
        </label>}
        <div className="domain-actions">
          {pending && p.receiptAt && <>
            <Button variant="primary" disabled={busy} onClick={() => void review("approve")}>{tx(["تأیید پرداخت", "Approve payment", "Zahlung freigeben", "Ödemeyi onayla"])}</Button>
            <Button variant="danger" disabled={busy || !note.trim()} onClick={() => void review("reject")}>{tx(["رد رسید", "Reject receipt", "Beleg ablehnen", "Dekontu reddet"])}</Button>
          </>}
          {pending && p.gateway === "zarinpal" && <Button disabled={busy} onClick={() => void recheck()}>{tx(["استعلام و تأیید زرین‌پال", "Re-check with Zarinpal", "Bei Zarinpal prüfen", "Zarinpal ile kontrol et"])}</Button>}
          {pending && <Button disabled={busy} onClick={() => void continuation()}>{tx(["لینک ادامهٔ پرداخت", "Payment continuation link", "Link zur Fortsetzung", "Ödemeye devam bağlantısı"])}</Button>}
          {pending && !p.receiptAt && <Button variant="danger" disabled={busy || note.trim().length < 3} onClick={() => void cancel()}>{tx(["لغو سفارش", "Cancel order", "Bestellung stornieren", "Siparişi iptal et"])}</Button>}
          {p.receiptAt && <Button disabled={busy} onClick={() => void notify()}>{tx(["ارسال مجدد اعلان رسید", "Resend receipt notification", "Belegbenachrichtigung erneut senden", "Dekont bildirimini tekrar gönder"])}</Button>}
        </div>
        {p.receiptAt && <small>{p.notificationSentAt ? tx(["اعلان رسید توسط سرویس ایمیل پذیرفته شده است.", "The receipt notification was accepted by the email provider.", "Belegbenachrichtigung vom E-Mail-Dienst angenommen.", "Dekont bildirimi e-posta sağlayıcısı tarafından kabul edildi."]) : tx(["ارسال ایمیل ناموفق یا در انتظار تلاش مجدد است.", "The email failed or is waiting for a retry.", "E-Mail fehlgeschlagen oder wartet auf Wiederholung.", "E-posta başarısız veya yeniden denemeyi bekliyor."])}</small>}
        {link && <div className="admin-payment-link"><input readOnly dir="ltr" value={link} aria-label={tx(["لینک پرداخت", "Payment link", "Zahlungslink", "Ödeme bağlantısı"])} /><Button onClick={() => void navigator.clipboard.writeText(link).then(() => toast.success(tx(["کپی شد", "Copied", "Kopiert", "Kopyalandı"])))}>{tx(["کپی لینک", "Copy link", "Link kopieren", "Bağlantıyı kopyala"])}</Button></div>}
        {message && <p role="status">{message}</p>}
        <Link className="text-link" href={"/admin/financial/invoices/" + encodeURIComponent(p.id)}>{tx(["فاکتور و جزئیات سفارش", "Invoice & order details", "Rechnung & Bestelldetails", "Fatura ve sipariş detayları"])} ↗</Link>
      </div>
    </Modal>
  );
}
