"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon } from "./ui";

/**
 * Referral commission and wallet payouts on aifekr.com: /api/admin/wallet/overview,
 * /api/admin/wallet/payout-requests (mark paid / reject, which refunds the
 * reserved amount) and the referral_commission_percent setting. "Paid" only
 * records a transfer the admin already made; nothing here moves money.
 */
type Tx = [string, string, string, string];
type Overview = { commissionPercent: number; totalOutstandingWalletBalance: number; totalCommissionGranted: number; pendingPayouts: { count: number; total: number }; paidPayouts: { count: number; total: number } };
type Payout = { id: string; amount: number; method: string; sheba: string | null; cardNumber: string | null; cardHolderName: string | null; paypalEmail: string | null; status: string; adminNote: string | null; createdAt: string; resolvedAt: string | null; user: { id: string; name: string | null; phone: string | null; email: string | null } };
const METHODS: Record<string, Tx> = { iran_sheba: ["شبا (ایران)", "Sheba (Iran)", "Sheba (Iran)", "Sheba (İran)"], iran_card: ["کارت بانکی (ایران)", "Bank card (Iran)", "Bankkarte (Iran)", "Banka kartı (İran)"], intl_card: ["کارت اعتباری (بین‌الملل)", "International card", "Internationale Karte", "Uluslararası kart"], paypal: ["PayPal", "PayPal", "PayPal", "PayPal"] };
const STATUS: [string, Tx][] = [["pending", ["در انتظار", "Pending", "Ausstehend", "Bekliyor"]], ["paid", ["پرداخت‌شده", "Paid", "Bezahlt", "Ödendi"]], ["rejected", ["ردشده", "Rejected", "Abgelehnt", "Reddedildi"]]];

export function LiveAdminAffiliate() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const toman = (v: number) => n(v) + " " + tx(["تومان", "Toman", "Toman", "Tümen"]);
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleString(["fa-IR", "en-GB", "de-DE", "tr-TR"][i], { dateStyle: "medium", timeStyle: "short" }) : "");
  const [status, setStatus] = useState("pending");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [rows, setRows] = useState<Payout[] | null>(null);
  const [commission, setCommission] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const [o, r] = await Promise.all([fetch("/api/admin/wallet/overview", { credentials: "include" }), fetch("/api/admin/wallet/payout-requests?status=" + status, { credentials: "include" })]);
      const ov = await o.json(); const rq = await r.json();
      if (!o.ok) throw Error(ov.error || "");
      setOverview(ov); setCommission(String(ov.commissionPercent)); setRows(rq.requests ?? []);
    } catch (e) { setRows([]); toast.error((e instanceof Error && e.message) || tx(["خطا در دریافت اطلاعات", "Could not load", "Laden fehlgeschlagen", "Yüklenemedi"])); }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  async function saveCommission() {
    const v = Number(commission);
    if (!Number.isFinite(v) || v < 0 || v > 100) return toast.error(tx(["درصد باید بین ۰ تا ۱۰۰ باشد", "Percent must be 0–100", "Prozent muss 0–100 sein", "Yüzde 0–100 olmalı"]));
    setBusy("commission");
    try {
      const r = await fetch("/api/admin/settings", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings: { referral_commission_percent: String(v) } }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.code === "SUPER_ADMIN_REQUIRED" ? tx(["فقط سوپر ادمین می‌تواند این را تغییر دهد", "Only a super admin can change this", "Nur ein Super-Admin darf das ändern", "Bunu yalnızca süper yönetici değiştirebilir"]) : d.error || "");
      toast.success(tx(["درصد کمیسیون ذخیره شد", "Commission saved", "Provision gespeichert", "Komisyon kaydedildi"])); await load();
    } catch (e) { toast.error((e instanceof Error && e.message) || tx(["خطا در ذخیره", "Could not save", "Speichern fehlgeschlagen", "Kaydedilemedi"])); }
    finally { setBusy(null); }
  }
  async function resolve(p: Payout, next: "paid" | "rejected") {
    const ask = next === "paid"
      ? tx(["مبلغ را واقعاً به حساب کاربر واریز کرده‌اید؟ این فقط واریز را ثبت می‌کند.", "Have you actually transferred the amount? This only records the transfer.", "Haben Sie den Betrag wirklich überwiesen? Dies erfasst nur die Überweisung.", "Tutarı gerçekten gönderdiniz mi? Bu yalnızca transferi kaydeder."])
      : tx(["درخواست رد شود؟ مبلغ به ولت کاربر برمی‌گردد.", "Reject the request? The amount returns to the user’s wallet.", "Anfrage ablehnen? Der Betrag geht zurück ins Wallet.", "İstek reddedilsin mi? Tutar kullanıcının cüzdanına döner."]);
    if (!confirm(toman(p.amount) + " — " + ask)) return;
    setBusy(p.id);
    try {
      const r = await fetch("/api/admin/wallet/payout-requests", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, status: next, adminNote: notes[p.id]?.trim() || undefined }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || "");
      toast.success(next === "paid" ? tx(["به‌عنوان پرداخت‌شده ثبت شد", "Recorded as paid", "Als bezahlt erfasst", "Ödendi olarak kaydedildi"]) : tx(["درخواست رد شد و مبلغ بازگشت داده شد", "Rejected; the amount was returned", "Abgelehnt; Betrag zurückgebucht", "Reddedildi; tutar iade edildi"]));
      setNotes((x) => ({ ...x, [p.id]: "" })); await load();
    } catch (e) { toast.error((e instanceof Error && e.message) || tx(["خطا در ثبت", "Could not save", "Speichern fehlgeschlagen", "Kaydedilemedi"])); }
    finally { setBusy(null); }
  }
  const detail = (p: Payout) => p.method === "iran_sheba" ? (p.sheba || "") + " — " + (p.cardHolderName || "") : p.method === "iran_card" ? (p.cardNumber || "") + " — " + (p.cardHolderName || "") : p.method === "intl_card" ? p.cardNumber || "" : p.paypalEmail || "";
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Wallet" size={28} /></span>
        <div>
          <h2>{tx(["همکاری در فروش و ولت", "Affiliate & wallet", "Affiliate & Wallet", "Ortaklık ve cüzdan"])}</h2>
          <p>{tx(["کمیسیون رفرال و درخواست‌های برداشت نقدی؛ «پرداخت شد» فقط واریزی را که خودتان انجام داده‌اید ثبت می‌کند.", "Referral commission and cash-out requests; “Paid” only records a transfer you already made.", "Empfehlungsprovision und Auszahlungen; „Bezahlt“ erfasst nur eine bereits erfolgte Überweisung.", "Referans komisyonu ve çekim istekleri; “Ödendi” yalnızca yaptığınız transferi kaydeder."])}</p>
        </div>
        <Link className="btn" href="/admin/referrals">{tx(["کدهای دعوت", "Invite codes", "Einladungscodes", "Davet kodları"])}</Link>
      </div>
      <div className="stats-grid" aria-busy={!overview}>
        <div className="panel stat"><span>{tx(["مجموع موجودی ولت کاربران", "Total user wallet balance", "Gesamtes Wallet-Guthaben", "Toplam cüzdan bakiyesi"])}</span><strong>{overview ? toman(overview.totalOutstandingWalletBalance) : "—"}</strong></div>
        <div className="panel stat"><span>{tx(["مجموع کمیسیون اعطاشده", "Total commission granted", "Gewährte Provision", "Verilen komisyon"])}</span><strong>{overview ? toman(overview.totalCommissionGranted) : "—"}</strong></div>
        <div className="panel stat"><span>{tx(["درخواست‌های در انتظار", "Pending requests", "Offene Anfragen", "Bekleyen istekler"])}</span><strong className="pending">{overview ? n(overview.pendingPayouts.count) : "—"}</strong>{overview && <small>{toman(overview.pendingPayouts.total)}</small>}</div>
        <div className="panel stat"><span>{tx(["مجموع پرداخت‌شده", "Total paid", "Ausgezahlt", "Toplam ödenen"])}</span><strong className="ok">{overview ? n(overview.paidPayouts.count) : "—"}</strong>{overview && <small>{toman(overview.paidPayouts.total)}</small>}</div>
      </div>
      <form className="panel admin-commission-row" onSubmit={(e) => { e.preventDefault(); void saveCommission(); }}>
        <Icon name="Users" size={20} />
        <span>{tx(["درصد کمیسیون رفرال (از مبلغ خرید دعوت‌شده)", "Referral commission (% of the invitee’s purchase)", "Empfehlungsprovision (% vom Kauf)", "Referans komisyonu (alımın %’si)"])}</span>
        <input type="number" min={0} max={100} step={0.5} dir="ltr" value={commission} onChange={(e) => setCommission(e.target.value)} />
        <span>٪</span>
        <Button type="submit" variant="primary" disabled={busy === "commission" || !overview}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button>
      </form>
      <nav className="module-tabs">
        {STATUS.map(([s, label]) => <button key={s} className={status === s ? "selected" : ""} aria-pressed={status === s} onClick={() => { setRows(null); setStatus(s); }}>{tx(label)}</button>)}
      </nav>
      <div className="admin-payout-list" aria-busy={!rows}>
        {rows?.map((p) => (
          <article className="panel admin-payout" key={p.id}>
            <div className="row-between">
              <div>
                <strong><Link href={"/admin/users/" + encodeURIComponent(p.user.id)}>{p.user.name || tx(["بدون نام", "No name", "Ohne Namen", "İsimsiz"])}</Link></strong> <bdi dir="ltr">{p.user.phone || p.user.email}</bdi>
                <p>{METHODS[p.method] ? tx(METHODS[p.method]) : p.method} — <bdi dir="ltr">{detail(p)}</bdi></p>
              </div>
              <strong className="admin-payout-amount">{toman(p.amount)}</strong>
            </div>
            <small>{date(p.createdAt)}{p.resolvedAt ? " → " + date(p.resolvedAt) : ""}</small>
            {p.adminNote && <p className="fine-print">{tx(["یادداشت", "Note", "Notiz", "Not"])}: {p.adminNote}</p>}
            {p.status === "pending" && (
              <div className="admin-payout-actions">
                <input value={notes[p.id] ?? ""} placeholder={tx(["یادداشت (اختیاری)", "Note (optional)", "Notiz (optional)", "Not (isteğe bağlı)"])} onChange={(e) => setNotes({ ...notes, [p.id]: e.target.value })} />
                <Button variant="primary" disabled={busy === p.id} onClick={() => void resolve(p, "paid")}><Icon name="CheckCircle2" size={16} />{tx(["پرداخت شد", "Mark paid", "Als bezahlt", "Ödendi"])}</Button>
                <Button variant="danger" disabled={busy === p.id} onClick={() => void resolve(p, "rejected")}><Icon name="XCircle" size={16} />{tx(["رد کردن", "Reject", "Ablehnen", "Reddet"])}</Button>
              </div>
            )}
          </article>
        ))}
        {rows && !rows.length && <Empty />}
      </div>
    </>
  );
}
