"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * The design's credit tiers and exchange-rate screens on aifekr.com. They
 * read and write the same endpoints as the classic admin pages
 * (/api/admin/credit-tiers, /api/admin/billing/rates, /api/admin/billing/provider);
 * nothing here sets a price or rate on its own.
 */
type Tx = [string, string, string, string];
const useTx = () => { const { n, locale } = useApp(); const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1; return { n, i, tx: (c: Tx) => c[i] }; };
async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw Error(out.error || "REQUEST_FAILED");
  return out;
}

type Tier = { id: string; creditsAmount: number; priceToman: number; discountPercent: number; badge: string | null; sortOrder: number; isActive: boolean };
type TierDraft = { id?: string; creditsAmount: string; priceToman: string; discountPercent: string; badge: string; sortOrder: string };

export function LiveCreditTiers() {
  const { n, tx } = useTx();
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [draft, setDraft] = useState<TierDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setTiers((await call("/api/admin/credit-tiers", "GET")).tiers ?? []); } catch { setTiers([]); toast.error(tx(["دریافت تعرفه‌ها انجام نشد", "Could not load tiers", "Stufen konnten nicht geladen werden", "Kademeler yüklenemedi"])); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  async function save() {
    if (!draft) return;
    const credits = Number(draft.creditsAmount), price = Number(draft.priceToman), discount = Number(draft.discountPercent || 0), sort = Number(draft.sortOrder || 0);
    if (!Number.isInteger(credits) || credits < 1 || !Number.isInteger(price) || price < 1) return toast.error(tx(["تعداد اعتبار و قیمت الزامی است", "Credits and price are required", "Credits und Preis sind erforderlich", "Kredi ve fiyat gerekli"]));
    if (!Number.isInteger(discount) || discount < 0 || discount > 100) return toast.error(tx(["درصد تخفیف باید بین ۰ تا ۱۰۰ باشد", "Discount must be 0–100", "Rabatt muss 0–100 sein", "İndirim 0–100 olmalı"]));
    setBusy(true);
    try {
      const body = { creditsAmount: credits, priceToman: price, discountPercent: discount, badge: draft.badge.trim() || null, sortOrder: Number.isFinite(sort) ? sort : 0 };
      await call("/api/admin/credit-tiers", draft.id ? "PUT" : "POST", draft.id ? { id: draft.id, ...body } : body);
      toast.success(draft.id ? tx(["تعرفه ذخیره شد", "Tier saved", "Stufe gespeichert", "Kademe kaydedildi"]) : tx(["تعرفه اضافه شد", "Tier added", "Stufe hinzugefügt", "Kademe eklendi"]));
      setDraft(null); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : ""); }
    finally { setBusy(false); }
  }
  async function toggle(t: Tier) { try { await call("/api/admin/credit-tiers", "PUT", { id: t.id, isActive: !t.isActive }); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : ""); } }
  async function remove(t: Tier) {
    if (!confirm(tx(["این تعرفه حذف شود؟ کاربران دیگر آن را در خرید اعتبار نمی‌بینند.", "Delete this tier? Users will no longer see it when buying credits.", "Stufe löschen? Nutzer sehen sie beim Kauf nicht mehr.", "Kademe silinsin mi? Kullanıcılar kredi alırken artık görmez."]))) return;
    try { await call("/api/admin/credit-tiers", "DELETE", { id: t.id }); toast.success(tx(["حذف شد", "Deleted", "Gelöscht", "Silindi"])); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : ""); }
  }
  const set = (k: keyof TierDraft) => (e: React.ChangeEvent<HTMLInputElement>) => draft && setDraft({ ...draft, [k]: e.target.value });
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Sparkles" size={28} /></span>
        <div>
          <h2>{tx(["تعرفه‌های خرید اعتبار", "Credit purchase tiers", "Credit-Kaufstufen", "Kredi satın alma kademeleri"])}</h2>
          <p>{tx(["بسته‌های فعال همان‌هایی هستند که کاربران در صفحهٔ خرید اعتبار می‌بینند.", "Active tiers are exactly what users see on the credit purchase page.", "Aktive Stufen sind genau das, was Nutzer beim Credit-Kauf sehen.", "Aktif kademeler, kullanıcıların kredi satın alma sayfasında gördükleridir."])}</p>
        </div>
      </div>
      <div className="domain-toolbar">
        <Button variant="primary" onClick={() => setDraft({ creditsAmount: "", priceToman: "", discountPercent: "0", badge: "", sortOrder: "0" })}><Icon name="Plus" size={16} />{tx(["بستهٔ اعتبار تازه", "New credit tier", "Neue Stufe", "Yeni kademe"])}</Button>
      </div>
      <div className="tool-grid" aria-busy={!tiers}>
        {tiers?.map((t) => (
          <article className={"panel admin-credit-tier" + (t.isActive ? "" : " inactive")} key={t.id}>
            <Icon name="Sparkles" size={30} />
            <h3>{t.badge || tx(["بستهٔ اعتبار", "Credit tier", "Credit-Stufe", "Kredi kademesi"])}</h3>
            <strong>{n(t.creditsAmount)} {tx(["اعتبار", "credits", "Credits", "kredi"])}</strong>
            <p>{n(t.priceToman)} {tx(["تومان", "Toman", "Toman", "Tümen"])}{t.discountPercent ? " · " + n(t.discountPercent) + "% " + tx(["تخفیف", "off", "Rabatt", "indirim"]) : ""}</p>
            <small>{tx(["هزینهٔ هر اعتبار", "Cost per credit", "Kosten pro Credit", "Kredi başına"])}: {n(Math.round(t.priceToman / t.creditsAmount))} {tx(["تومان", "Toman", "Toman", "Tümen"])}</small>
            <label>{tx(["فعال برای کاربران", "Live for users", "Für Nutzer aktiv", "Kullanıcılara açık"])}<input type="checkbox" checked={t.isActive} onChange={() => void toggle(t)} /></label>
            <div className="domain-actions">
              <Button onClick={() => setDraft({ id: t.id, creditsAmount: String(t.creditsAmount), priceToman: String(t.priceToman), discountPercent: String(t.discountPercent), badge: t.badge || "", sortOrder: String(t.sortOrder) })}>{tx(["ویرایش بسته", "Edit tier", "Bearbeiten", "Düzenle"])}</Button>
              <Button variant="danger" label={tx(["حذف", "Delete", "Löschen", "Sil"])} onClick={() => void remove(t)}><Icon name="Trash2" size={16} /></Button>
            </div>
          </article>
        ))}
      </div>
      {tiers && !tiers.length && <Empty />}
      {draft && (
        <Modal title={tx(["بستهٔ اعتبار", "Credit tier", "Credit-Stufe", "Kredi kademesi"])} onClose={() => setDraft(null)}>
          <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <div className="domain-fields">
              <label>{tx(["تعداد اعتبار", "Credit count", "Anzahl Credits", "Kredi sayısı"])}<input required type="number" min={1} step={1} dir="ltr" value={draft.creditsAmount} onChange={set("creditsAmount")} /></label>
              <label>{tx(["مبلغ به تومان", "Price in Toman", "Preis in Toman", "Tümen fiyatı"])}<input required type="number" min={1} step={1} dir="ltr" value={draft.priceToman} onChange={set("priceToman")} /></label>
              <label>{tx(["درصد تخفیف", "Discount %", "Rabatt %", "İndirim %"])}<input type="number" min={0} max={100} step={1} dir="ltr" value={draft.discountPercent} onChange={set("discountPercent")} /></label>
              <label>{tx(["برچسب (اختیاری)", "Badge (optional)", "Badge (optional)", "Rozet (isteğe bağlı)"])}<input maxLength={40} value={draft.badge} onChange={set("badge")} /></label>
              <label>{tx(["ترتیب نمایش", "Sort order", "Reihenfolge", "Sıra"])}<input type="number" step={1} dir="ltr" value={draft.sortOrder} onChange={set("sortOrder")} /></label>
            </div>
            <Button variant="primary" type="submit" disabled={busy}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button>
          </form>
        </Modal>
      )}
    </>
  );
}

type Rate = { id: string; target: string; rate: string; provider: string; rateType: string; createdAt: string; validUntil: string };
type Provider = { configured: boolean; enabled: boolean; authMode: string; accountId: string; health?: { status: string; observedAt?: string; error?: string } | null };

export function LiveExchangeRates() {
  const { n, i, tx } = useTx();
  const [rates, setRates] = useState<Rate[] | null>(null);
  const [form, setForm] = useState({ target: "IRT", rate: "", provider: "", hours: "24" });
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("1");
  const [selected, setSelected] = useState("");
  const date = (iso: string) => new Date(iso).toLocaleString(["fa-IR", "en-GB", "de-DE", "tr-TR"][i], { dateStyle: "medium", timeStyle: "short" });
  const load = useCallback(async () => { try { setRates((await call("/api/admin/billing/rates", "GET")).rates ?? []); } catch { setRates([]); } }, []);
  useEffect(() => { void load(); }, [load]);
  const live = (r: Rate) => new Date(r.validUntil).getTime() > Date.now();
  // The newest rate per currency is the one checkout uses while it is valid.
  const current = ["IRT", "TRY", "EUR"].map((code) => rates?.find((r) => r.target === code)).filter(Boolean) as Rate[];
  const active = current.find((r) => r.id === selected) || current[0];
  async function approve() {
    const hours = Number(form.hours);
    if (!form.rate.trim() || !form.provider.trim() || !Number.isInteger(hours) || hours < 1 || hours > 168) return toast.error(tx(["نرخ، منبع و مدت اعتبار (۱ تا ۱۶۸ ساعت) را وارد کنید", "Enter the rate, its source and a validity of 1–168 hours", "Kurs, Quelle und Gültigkeit (1–168 h) eingeben", "Kur, kaynak ve geçerlilik (1–168 saat) girin"]));
    if (!confirm(tx(["این نرخ از همین حالا در قیمت‌های پرداخت استفاده می‌شود. تأیید می‌کنید؟", "This rate is used for checkout prices from now on. Approve it?", "Dieser Kurs gilt ab sofort für Checkout-Preise. Freigeben?", "Bu kur bundan sonra ödeme fiyatlarında kullanılır. Onaylıyor musunuz?"]))) return;
    setBusy(true);
    try {
      await call("/api/admin/billing/rates", "POST", { target: form.target, rate: form.rate.trim(), provider: form.provider.trim(), validHours: hours, rateType: form.target === "IRT" ? "FREE_MARKET" : "COMMERCIAL" });
      toast.success(tx(["نرخ تأیید و ثبت شد", "Rate approved and recorded", "Kurs freigegeben und gespeichert", "Kur onaylandı ve kaydedildi"]));
      setForm({ ...form, rate: "" }); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : ""); }
    finally { setBusy(false); }
  }
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="ArrowLeftRight" size={28} /></span>
        <div>
          <h2>{tx(["نرخ‌های تبدیل ارز", "Exchange rates", "Wechselkurse", "Döviz kurları"])}</h2>
          <p>{tx(["تومان فقط با نرخ بازار آزاد تأییدشده محاسبه می‌شود؛ لیر و یورو از ارائه‌دهندهٔ نرخ یا ثبت دستی.", "Toman uses only an approved free-market rate; TRY and EUR come from the rate provider or a manual entry.", "Toman nutzt nur einen freigegebenen freien Marktkurs; TRY und EUR vom Anbieter oder manuell.", "Toman yalnızca onaylı serbest piyasa kurunu kullanır; TRY ve EUR sağlayıcıdan veya elle."])}</p>
        </div>
      </div>
      <div className="admin-rate-layout">
        <section className="panel">
          <div className="row-between"><h2>{tx(["ثبت و تأیید نرخ", "Approve a rate", "Kurs freigeben", "Kur onayla"])}</h2></div>
          <form className="domain-fields" onSubmit={(e) => { e.preventDefault(); void approve(); }}>
            <label>{tx(["ارز", "Currency", "Währung", "Para birimi"])}<select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>{["IRT", "TRY", "EUR"].map((v) => <option key={v}>{v}</option>)}</select></label>
            <label>1 USD =<input required inputMode="decimal" dir="ltr" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></label>
            <label>{tx(["منبع نرخ", "Rate source", "Kursquelle", "Kur kaynağı"])}<input required value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></label>
            <label>{tx(["اعتبار (ساعت)", "Validity (hours)", "Gültigkeit (Stunden)", "Geçerlilik (saat)"])}<input type="number" min={1} max={168} dir="ltr" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></label>
            <Button variant="primary" type="submit" disabled={busy}>{tx(["تأیید و ذخیرهٔ نرخ", "Approve & save rate", "Kurs freigeben & speichern", "Kuru onayla ve kaydet"])}</Button>
          </form>
          <h3>{tx(["سابقهٔ نرخ‌ها", "Rate history", "Kursverlauf", "Kur geçmişi"])}</h3>
          {rates?.slice(0, 30).map((r) => (
            <article className="domain-card" key={r.id}>
              <div className="row-between"><strong dir="ltr">1 USD = {r.rate} {r.target}</strong><span className={"badge " + (live(r) ? "green" : "")}>{live(r) ? tx(["معتبر", "Active", "Gültig", "Geçerli"]) : tx(["منقضی", "Expired", "Abgelaufen", "Süresi doldu"])}</span></div>
              <small>{r.provider} · {r.rateType} · {date(r.createdAt)} → {date(r.validUntil)}</small>
            </article>
          ))}
          {rates && !rates.length && <Empty />}
        </section>
        <section className="panel">
          <h3>{tx(["محاسبهٔ نمونهٔ تبدیل", "Conversion preview", "Umrechnungsvorschau", "Dönüşüm önizlemesi"])}</h3>
          <label>{tx(["جفت ارز", "Currency pair", "Währungspaar", "Döviz çifti"])}<select value={active?.id || ""} onChange={(e) => setSelected(e.target.value)}>{current.map((r) => <option key={r.id} value={r.id}>USD → {r.target}</option>)}</select></label>
          <label>{tx(["مبلغ به دلار", "Amount in USD", "Betrag in USD", "USD tutarı"])}<input type="number" min={0} dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
          <output className="admin-calculator-output">{active ? n(Number(amount || 0) * Number(active.rate)) + " " + active.target : "—"}</output>
          <XeProvider tx={tx} date={date} />
        </section>
      </div>
    </>
  );
}

function XeProvider({ tx, date }: { tx: (c: Tx) => string; date: (iso: string) => string }) {
  const [status, setStatus] = useState<Provider | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { call("/api/admin/billing/provider", "GET").then((s: Provider) => { setStatus(s); setEnabled(s.enabled); setAccountId(s.accountId || ""); }).catch(() => {}); }, []);
  async function submit(sync: boolean) {
    setBusy(true);
    try {
      const b = await call("/api/admin/billing/provider", "POST", sync ? { action: "sync" } : { enabled, apiKey, accountId, authMode: "BEARER" });
      setStatus(b); setApiKey("");
      toast.success(sync ? (b.synced ? tx(["نرخ‌ها همگام شدند", "Rates synchronized", "Kurse synchronisiert", "Kurlar eşitlendi"]) : tx(["همگام‌سازی انجام نشد؛ وضعیت اتصال را بررسی کنید", "Sync did not complete; check the connection status", "Synchronisierung fehlgeschlagen; Status prüfen", "Eşitleme tamamlanmadı; bağlantıyı kontrol edin"])) : tx(["تنظیمات امن ذخیره شد", "Secure settings saved", "Sichere Einstellungen gespeichert", "Güvenli ayarlar kaydedildi"]));
    } catch { toast.error(tx(["عملیات انجام نشد", "Operation failed", "Vorgang fehlgeschlagen", "İşlem başarısız"])); }
    finally { setBusy(false); }
  }
  return (
    <div className="admin-xe-provider">
      <h3>{tx(["اتصال خودکار XE", "Automatic XE connection", "Automatische XE-Verbindung", "Otomatik XE bağlantısı"])} <span className={"badge " + (status?.configured ? "green" : "")}>{status?.configured ? tx(["تنظیم‌شده", "Configured", "Eingerichtet", "Yapılandırıldı"]) : tx(["تنظیم‌نشده", "Not configured", "Nicht eingerichtet", "Yapılandırılmadı"])}</span></h3>
      <label>{tx(["کلید API (خالی = حفظ کلید قبلی)", "API key (blank keeps the existing key)", "API-Schlüssel (leer behält den bisherigen)", "API anahtarı (boş = mevcut korunur)"])}<input type="password" autoComplete="new-password" dir="ltr" value={apiKey} onChange={(e) => setApiKey(e.target.value)} /></label>
      <label>Account ID<input dir="ltr" value={accountId} onChange={(e) => setAccountId(e.target.value)} /></label>
      <label className="toggle-row"><span>{tx(["همگام‌سازی فعال", "Synchronization enabled", "Synchronisierung aktiv", "Eşitleme etkin"])}</span><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /></label>
      <div className="domain-actions">
        <Button disabled={busy} onClick={() => void submit(false)}>{tx(["ذخیره امن", "Save securely", "Sicher speichern", "Güvenli kaydet"])}</Button>
        <Button disabled={busy || !status?.configured} onClick={() => void submit(true)}>{tx(["تست و همگام‌سازی", "Test & sync", "Testen & synchronisieren", "Test et ve eşitle"])}</Button>
      </div>
      {status?.health && <small role="status">{status.health.status}{status.health.observedAt ? " · " + date(status.health.observedAt) : ""}{status.health.error ? " · " + status.health.error : ""}</small>}
    </div>
  );
}
