"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { useShell } from "./live-shell-context";
import { Button, Empty, Icon, Modal, download } from "./ui";

/**
 * The design's customer / subscription cards on aifekr.com (main site
 * /api/admin/financial/customers). Expiry changes go through the classic
 * /api/admin/financial/expiry endpoint with a required reason and the
 * expiry the admin saw, so a stale page cannot overwrite a newer change.
 */
type Paid = { gateway: string | null; currency: string | null; count: number; amount: number; transferMinor: number };
type History = { id: string; createdAt: string; subscription: string | null; before: string | null; after: string | null; reason: string | null };
type Customer = { id: string; name: string | null; email: string | null; phone: string | null; plan: string; planExpiry: string | null; crmPlan: string | null; crmPlanExpiry: string | null; voicePlanExpiry: string | null; credits: number; isBlocked: boolean; _count: { payments: number }; paid: Paid[]; expiryHistory: History[] };
type Data = { customers: Customer[]; total: number; totalPages: number; summary: { active: number; expired: number; expiringWeek: number; monthRevenue: number } };
type Tx = [string, string, string, string];

export function LiveAdminCustomers({ subscriptions }: { subscriptions: boolean }) {
  const { n, locale } = useApp();
  const shell = useShell();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const planName = (code: string) => shell?.copy.planNames?.[code] || code;
  const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(["fa-IR", "en-GB", "de-DE", "tr-TR"][i]) : "—");
  const seq = useRef(0);
  const [query, setQuery] = useState("");
  const [expiry, setExpiry] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Customer | null>(null);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    try {
      const q = new URLSearchParams({ view: subscriptions ? "subscriptions" : "customers", page: String(page) });
      if (query.trim()) q.set("q", query.trim());
      if (expiry) q.set("expiry", expiry);
      const res = await fetch("/api/admin/financial/customers?" + q, { credentials: "include" });
      const body = await res.json().catch(() => ({}));
      if (mine !== seq.current) return;
      if (!res.ok) throw Error(body.error || "");
      setData(body);
    } catch (e) { if (mine === seq.current) toast.error((e instanceof Error && e.message) || tx(["دریافت حساب‌ها انجام نشد", "Could not load accounts", "Konten konnten nicht geladen werden", "Hesaplar yüklenemedi"])); }
    finally { if (mine === seq.current) setLoading(false); }
  }, [subscriptions, page, query, expiry]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const state = (c: Customer) => c.isBlocked ? "blocked" : c.plan === "FREE" ? "free" : !c.planExpiry || new Date(c.planExpiry).getTime() < Date.now() ? "expired" : "subscribed";
  const labels: Record<string, Tx> = { blocked: ["مسدود", "Blocked", "Gesperrt", "Engelli"], expired: ["منقضی", "Expired", "Abgelaufen", "Süresi dolmuş"], subscribed: ["دارای اشتراک", "Subscribed", "Abonniert", "Abone"], free: ["رایگان", "Free", "Kostenlos", "Ücretsiz"] };
  const tone: Record<string, string> = { blocked: "red", expired: "red", subscribed: "green", free: "" };
  const money = (p: Paid) => p.gateway === "bank_transfer" && p.currency ? n(p.transferMinor / 100) + " " + p.currency : n(p.amount) + " " + tx(["تومان", "Toman", "Toman", "Tümen"]);

  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name={subscriptions ? "BadgeCheck" : "Users"} size={28} /></span>
        <div>
          <h2>{subscriptions ? tx(["وضعیت اشتراک حساب‌ها", "Account subscriptions", "Kontoabos", "Hesap abonelikleri"]) : tx(["حساب مشتری و خریدهای مرتبط", "Customer accounts & linked purchases", "Kundenkonten & Käufe", "Müşteri hesapları ve satın almalar"])}</h2>
          <p>{tx(["تمدید یا تغییر انقضا با ذکر دلیل در همین کارت ثبت می‌شود؛ بقیهٔ دسترسی‌ها در پروندهٔ کاربر.", "Extend or change an expiry with a reason on each card; other access lives in the user profile.", "Ablauf mit Begründung direkt auf der Karte ändern; weiterer Zugriff im Benutzerprofil.", "Süreyi her kartta gerekçeyle uzat veya değiştir; diğer erişimler kullanıcı profilinde."])}</p>
        </div>
      </div>
      <nav className="admin-finance-links">
        <Link className="btn" href="/admin/financial">{tx(["پرداخت‌ها و رسیدها", "Payments & receipts", "Zahlungen & Belege", "Ödemeler ve dekontlar"])}</Link>
        <Link className="btn" href={subscriptions ? "/admin/financial/customers" : "/admin/subscriptions"}>{subscriptions ? tx(["خریداران", "Customers", "Käufer", "Müşteriler"]) : tx(["اشتراک‌ها", "Subscriptions", "Abos", "Abonelikler"])}</Link>
        <Link className="btn" href="/admin/referrals">{tx(["کدهای دعوت", "Invitation codes", "Einladungscodes", "Davet kodları"])}</Link>
        {subscriptions && <Link className="btn" href="/admin/industry-packs">{tx(["پکیج‌های صنفی", "Industry packs", "Branchenpakete", "Sektör paketleri"])}</Link>}
      </nav>
      {subscriptions && (
        <div className="stats-grid">
          {([
            [tx(["اشتراک فعال", "Active subscriptions", "Aktive Abos", "Aktif abonelik"]), data?.summary.active, "active"],
            [tx(["انقضا تا ۷ روز", "Expiring within 7 days", "Läuft in 7 Tagen ab", "7 gün içinde bitiyor"]), data?.summary.expiringWeek, "week"],
            [tx(["منقضی‌شده", "Expired", "Abgelaufen", "Süresi dolmuş"]), data?.summary.expired, "expired"],
          ] as [string, number | undefined, string][]).map(([label, value, filter]) => (
            <button type="button" className={"panel stat admin-pulse-stat" + (expiry === filter ? " selected" : "")} key={filter} onClick={() => { setExpiry(expiry === filter ? "" : filter); setPage(1); }}>
              <span>{label}</span><strong>{value === undefined ? "—" : n(value)}</strong>
            </button>
          ))}
          <div className="panel stat"><span>{tx(["فروش ماه جاری (تومان)", "This month’s sales (Toman)", "Umsatz diesen Monat (Toman)", "Bu ayın satışı (Tümen)"])}</span><strong>{data ? n(data.summary.monthRevenue) : "—"}</strong></div>
        </div>
      )}
      <div className="domain-toolbar">
        <label>{tx(["جست‌وجوی مشتری", "Search customers", "Kunden suchen", "Müşteri ara"])}<input value={query} placeholder={tx(["نام، ایمیل یا موبایل", "Name, email or phone", "Name, E-Mail oder Telefon", "Ad, e-posta veya telefon"])} onChange={(e) => { setQuery(e.target.value); setPage(1); }} /></label>
        <label>{tx(["وضعیت انقضا", "Expiry status", "Ablaufstatus", "Süre durumu"])}
          <select value={expiry} onChange={(e) => { setExpiry(e.target.value); setPage(1); }}>
            <option value="">{tx(["همه", "All", "Alle", "Tümü"])}</option>
            <option value="active">{tx(["فعال", "Active", "Aktiv", "Etkin"])}</option>
            <option value="week">{tx(["انقضا تا ۷ روز", "Expiring within 7 days", "Läuft in 7 Tagen ab", "7 gün içinde bitiyor"])}</option>
            <option value="expired">{tx(["منقضی", "Expired", "Abgelaufen", "Süresi dolmuş"])}</option>
          </select>
        </label>
        <Button disabled={!data?.customers.length} onClick={() => download("customers-page-" + page + ".json", JSON.stringify(data?.customers.map(({ expiryHistory: _h, ...c }) => c), null, 2), "application/json")}>{tx(["خروجی این صفحه", "Export this page", "Diese Seite exportieren", "Bu sayfayı dışa aktar"])}</Button>
      </div>
      <div className="tool-grid" aria-busy={loading}>
        {data?.customers.map((c) => (
          <article className="panel admin-customer-card" key={c.id}>
            <div className="row-between">
              <span className="icon-chip orange"><Icon name="User" /></span>
              <span className={"badge " + tone[state(c)]}>{tx(labels[state(c)])}</span>
            </div>
            <h3><Link href={"/admin/users/" + encodeURIComponent(c.id)}>{c.name || c.email || c.phone || c.id}</Link></h3>
            <p dir="ltr">{c.email || c.phone || "—"}</p>
            <dl className="domain-detail">
              <div><dt>{tx(["طرح", "Plan", "Tarif", "Plan"])}</dt><dd>{planName(c.plan)}</dd></div>
              <div><dt>{tx(["انقضا", "Expiry", "Ablauf", "Bitiş"])}</dt><dd>{day(c.planExpiry)}</dd></div>
              {c.crmPlan && c.crmPlan !== "NONE" && <div><dt>CRM</dt><dd>{c.crmPlan} · {day(c.crmPlanExpiry)}</dd></div>}
              {c.voicePlanExpiry && <div><dt>{tx(["تماس", "Voice", "Telefonie", "Ses"])}</dt><dd>{day(c.voicePlanExpiry)}</dd></div>}
              <div><dt>{tx(["اعتبار", "Credits", "Credits", "Kredi"])}</dt><dd>{n(c.credits)}</dd></div>
              <div><dt>{tx(["سفارش‌ها", "Orders", "Bestellungen", "Siparişler"])}</dt><dd>{n(c._count.payments)}</dd></div>
            </dl>
            {c.paid.map((p) => <p className="admin-customer-paid" dir="ltr" key={(p.gateway || "") + (p.currency || "")}>{money(p)} · {n(p.count)} {tx(["خرید موفق", "paid", "bezahlt", "ödendi"])}</p>)}
            <div className="domain-actions">
              <Button onClick={() => setEdit(c)}><Icon name="CalendarClock" size={16} />{tx(["مدیریت انقضا", "Manage expiry", "Ablauf verwalten", "Süre yönetimi"])}</Button>
              <Link className="btn" href={"/admin/financial?userId=" + encodeURIComponent(c.id)}>{tx(["خریدها و رسیدها", "Purchases & receipts", "Käufe & Belege", "Satın almalar"])}</Link>
            </div>
          </article>
        ))}
      </div>
      {!loading && !data?.customers.length && <Empty />}
      <div className="pagination">
        <span>{n(data?.total ?? 0)} {tx(["حساب", "accounts", "Konten", "hesap"])}</span>
        <div>
          <Button disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>{tx(["قبلی", "Previous", "Zurück", "Önceki"])}</Button>
          <span>{n(page)} / {n(data?.totalPages ?? 1)}</span>
          <Button disabled={page >= (data?.totalPages ?? 1) || loading} onClick={() => setPage(page + 1)}>{tx(["بعدی", "Next", "Weiter", "Sonraki"])}</Button>
        </div>
      </div>
      {edit && <ExpiryDialog customer={edit} tx={tx} day={day} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void load(); }} />}
    </>
  );
}

function ExpiryDialog({ customer: c, tx, day, onClose, onSaved }: { customer: Customer; tx: (c: Tx) => string; day: (iso: string | null) => string; onClose: () => void; onSaved: () => void }) {
  const expires = { ai: c.planExpiry, crm: c.crmPlanExpiry, voice: c.voicePlanExpiry };
  const [subscription, setSubscription] = useState<"ai" | "crm" | "voice">("ai");
  const [mode, setMode] = useState<"extend" | "set">("extend");
  const [days, setDays] = useState("30");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = reason.trim().length >= 5 && (mode === "set" ? !!date : Number.isInteger(Number(days)) && Number(days) >= 1 && Number(days) <= 3650);
  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/financial/expiry", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: c.id, subscription, mode, days: Number(days), date, reason: reason.trim(), expectedExpiry: expires[subscription] }) });
      if (!res.ok) throw Error();
      toast.success(tx(["انقضا به‌روز شد و در تاریخچه ثبت شد", "Expiry updated and recorded", "Ablauf aktualisiert und protokolliert", "Süre güncellendi ve kaydedildi"]));
      onSaved();
    } catch { toast.error(tx(["ذخیره نشد؛ صفحه را تازه کنید و دلیل معتبر وارد کنید", "Not saved; refresh and enter a valid reason", "Nicht gespeichert; aktualisieren und Grund eingeben", "Kaydedilmedi; yenileyin ve geçerli neden girin"])); }
    finally { setBusy(false); }
  }
  return (
    <Modal title={tx(["مدیریت انقضا", "Manage expiry", "Ablauf verwalten", "Süre yönetimi"]) + " · " + (c.name || c.email || c.id)} onClose={onClose}>
      <form className="admin-expiry-form" onSubmit={(e) => { e.preventDefault(); if (valid) void save(); }}>
        <div className="domain-fields">
          <label>{tx(["اشتراک", "Subscription", "Abo", "Abonelik"])}
            <select value={subscription} onChange={(e) => setSubscription(e.target.value as typeof subscription)}>
              <option value="ai">AI</option><option value="crm">CRM</option><option value="voice">{tx(["تماس", "Voice", "Telefonie", "Ses"])}</option>
            </select>
          </label>
          <label>{tx(["نوع تغییر", "Adjustment", "Änderung", "Değişiklik"])}
            <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="extend">{tx(["افزایش مدت", "Extend", "Verlängern", "Uzat"])}</option>
              <option value="set">{tx(["تغییر تاریخ", "Change date", "Datum ändern", "Tarih değiştir"])}</option>
            </select>
          </label>
          {mode === "extend"
            ? <label>{tx(["روز", "Days", "Tage", "Gün"])}<input type="number" min={1} max={3650} dir="ltr" value={days} onChange={(e) => setDays(e.target.value)} /></label>
            : <label>{tx(["تاریخ جدید", "New date", "Neues Datum", "Yeni tarih"])}<input type="datetime-local" required value={date} onChange={(e) => setDate(e.target.value)} /></label>}
        </div>
        <p className="fine-print">{tx(["انقضای فعلی", "Current expiry", "Aktueller Ablauf", "Mevcut bitiş"])}: {expires[subscription] ? day(expires[subscription]) : tx(["بدون تاریخ ثبت‌شده", "No expiry set", "Kein Ablaufdatum", "Süre belirtilmedi"])}</p>
        <label>{tx(["دلیل تغییر (در تاریخچه ثبت می‌شود)", "Reason (recorded in the history)", "Grund (wird protokolliert)", "Neden (geçmişe kaydedilir)"])}<input required minLength={5} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        <Button type="submit" variant="primary" disabled={busy || !valid}>{tx(["ذخیره و ثبت در تاریخچه", "Save and record", "Speichern und protokollieren", "Kaydet ve geçmişe ekle"])}</Button>
      </form>
      {c.expiryHistory.length > 0 && (
        <div className="admin-expiry-history">
          <h3>{tx(["تاریخچهٔ تغییر انقضا", "Expiry adjustment history", "Ablaufänderungsverlauf", "Süre değişikliği geçmişi"])}</h3>
          {c.expiryHistory.map((h) => (
            <article className="domain-card" key={h.id}>
              <strong>{h.subscription?.toUpperCase() || "—"} · {day(h.before)} → {day(h.after)}</strong>
              <p>{h.reason}</p>
              <small>{day(h.createdAt)}</small>
            </article>
          ))}
        </div>
      )}
    </Modal>
  );
}
