"use client";
import Link from "@/components/site-link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * The package & pricing editor on aifekr.com in the design's panels: a
 * field-for-field port of the classic /admin/packages page. Amounts keep the
 * classic units: term and fixed prices are stored in minor units (IRT in
 * toman, other currencies ×100), and the server validates every save with
 * its own package schema (lib/billing/plans packageSchema).
 */
type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Tx = [string, string, string, string];
type Category = { code: string; labels: Record<string, string> };

const blank: Rec = { planCode: "", name: "", nameEn: "", description: "", category: "PERSONAL", publicationStatus: "DRAFT", publicVisible: false, baseCurrency: "USD", termPrices: { monthly: 0 }, entitlements: { modules: [], agents: [], limits: {} }, price: 0, priceUsd: null, priceTry: null, market: "BOTH", duration: 30, credits: 1000, mediaCredits: 0, voiceMinutes: 0, crmContactLimit: 0, teamSeatLimit: null, crmSeatLimit: null, features: "", featuresEn: "", badge: "", color: "#ea580c", sortOrder: 0, isActive: true, isFeatured: false, studentEligibility: "ACCOUNT_TYPE", creditAllocation: "TERM", trialEligible: false, promoEligible: false };
const unit = (currency: string) => (currency === "IRT" ? 1 : 100);
const TERMS = ["monthly", "quarterly", "semiannual", "annual", "custom"];
const parse = (v: unknown, fallback: Rec) => { try { return typeof v === "string" ? JSON.parse(v || "{}") : (v as Rec) ?? fallback; } catch { return fallback; } };

export function LiveAdminPackages() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const [plans, setPlans] = useState<Rec[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [retired, setRetired] = useState<string[]>([]);
  const [landing, setLanding] = useState<Rec>({});
  const [form, setForm] = useState<Rec | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("ALL");
  async function load() {
    const r = await fetch("/api/admin/packages", { credentials: "include" });
    if (!r.ok) { setPlans([]); return; }
    const b = await r.json();
    setPlans(b.packages ?? []); setLanding(b.landingPreview || {}); setCategories(b.categories ?? []); setRetired(b.retired ?? []);
  }
  useEffect(() => { void load(); const requested = new URLSearchParams(location.search).get("category"); if (requested === "VIDEO_FACTORY") setCategory(requested); }, []);

  const labels: Record<string, string> = {
    DRAFT: tx(["پیش‌نویس", "Draft", "Entwurf", "Taslak"]), PUBLISHED: tx(["منتشرشده", "Published", "Veröffentlicht", "Yayımlanan"]), ARCHIVED: tx(["بایگانی", "Archived", "Archiviert", "Arşivlenen"]),
    monthly: tx(["یک ماهه", "1 month", "1 Monat", "1 ay"]), quarterly: tx(["سه ماهه", "3 months", "3 Monate", "3 ay"]), semiannual: tx(["شش ماهه", "6 months", "6 Monate", "6 ay"]), annual: tx(["یک ساله", "1 year", "1 Jahr", "1 yıl"]), custom: tx(["مدت دلخواه", "Custom duration", "Eigene Laufzeit", "Özel süre"]),
    isActive: tx(["پکیج فعال", "Active package", "Aktives Paket", "Etkin paket"]), publicVisible: tx(["نمایش عمومی", "Visible publicly", "Öffentlich sichtbar", "Herkese görünür"]), isFeatured: tx(["پکیج پیشنهادی", "Recommended package", "Empfohlenes Paket", "Önerilen paket"]), promoEligible: tx(["شامل هدیه خرید", "Purchase bonus eligible", "Kaufbonus möglich", "Satın alma bonusu"]), trialEligible: tx(["شامل دوره آزمایشی", "Trial eligible", "Testzugang möglich", "Deneme erişimi"]),
    credits: tx(["اعتبار هوش مصنوعی", "AI credits", "KI-Credits", "Yapay zekâ kredisi"]), mediaCredits: tx(["اعتبار رسانه", "Media credits", "Medien-Credits", "Medya kredisi"]), voiceMinutes: tx(["دقیقه تماس", "Voice minutes", "Anrufminuten", "Arama dakikası"]), crmContactLimit: tx(["سقف مخاطبان CRM", "CRM contacts", "CRM-Kontakte", "CRM kişileri"]), teamSeatLimit: tx(["اعضای تیم", "Team seats", "Teammitglieder", "Ekip üyesi"]), crmSeatLimit: tx(["کاربران CRM", "CRM seats", "CRM-Nutzer", "CRM kullanıcısı"]), duration: tx(["مدت دلخواه (روز)", "Custom duration (days)", "Eigene Laufzeit (Tage)", "Özel süre (gün)"]), sortOrder: tx(["ترتیب نمایش", "Display order", "Anzeigereihenfolge", "Gösterim sırası"]),
    features: tx(["امکانات فارسی", "Features (Persian)", "Funktionen (Persisch)", "Özellikler (Farsça)"]), featuresEn: tx(["امکانات بین‌المللی", "Features (international)", "Funktionen (international)", "Özellikler (uluslararası)"]),
    TERM: tx(["اعتبار کل دوره", "Total credits for the term", "Credits je Laufzeit", "Dönem toplam kredisi"]), MONTHLY_TOTAL: tx(["اعتبار ماهانه × ماه‌ها؛ یکجا", "Monthly amount × months, granted upfront", "Monatsbetrag × Monate, sofort", "Aylık tutar × ay, peşin"]),
    ACCOUNT_TYPE: tx(["حساب دانشجویی", "Student account", "Studierendenkonto", "Öğrenci hesabı"]), VERIFIED: tx(["تأیید دانشجویی (هنوز آماده نیست)", "Verified student (not yet available)", "Studierendenprüfung (noch nicht verfügbar)", "Öğrenci doğrulama (henüz hazır değil)"]),
    ...Object.fromEntries(categories.map((c) => [c.code, c.labels[locale] || c.labels.en || c.code])),
  };
  const change = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  function edit(p: Rec) {
    const next: Rec = { ...blank };
    for (const k of Object.keys(blank)) next[k] = p[k] ?? blank[k];
    next.id = p.id; next.termPrices = parse(p.termPrices, {}); next.entitlements = parse(p.entitlements, {});
    setForm(next); setError(""); setPreview(false);
  }
  async function save() {
    if (!form) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/admin/packages", { method: form.id ? "PUT" : "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(b.error || "Error");
      setForm(null); await load();
      toast.success(tx(["ذخیره شد؛ قیمت‌ها برای خریدهای جدید اعمال می‌شوند", "Saved. New prices apply to new purchases.", "Gespeichert. Neue Preise gelten für neue Käufe.", "Kaydedildi. Yeni fiyatlar yeni satın almalara uygulanır."]));
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setBusy(false); }
  }
  async function setActive(p: Rec, isActive: boolean) {
    const r = await fetch("/api/admin/packages", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, isActive }) });
    if (!r.ok) return toast.error(tx(["تغییر انجام نشد", "Not changed", "Nicht geändert", "Değiştirilmedi"]));
    await load();
  }

  const field = (k: string, label: string, type = "text") => (
    <label key={k}>{labels[k] || label}
      <input type={type} dir={type === "number" || k === "planCode" ? "ltr" : undefined} disabled={k === "planCode" && !!form?.id} min={type === "number" ? 0 : undefined} value={form?.[k] ?? ""} onChange={(e) => change(k, type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)} />
    </label>
  );
  const select = (k: string, label: string, values: string[]) => (
    <label key={k}>{label}
      <select value={form?.[k]} onChange={(e) => change(k, e.target.value)}>{values.map((v) => <option key={v} value={v} disabled={v === "VERIFIED"}>{labels[v] || v}</option>)}</select>
    </label>
  );
  const visible = (plans ?? []).filter((p) => (category === "ALL" || p.category === category) && String((p.name || "") + (p.nameEn || "") + p.planCode).toLowerCase().includes(q.toLowerCase()));
  const money = (minor: number, currency: string) => (currency === "IRT" ? n(minor) + " " + tx(["تومان", "Toman", "Toman", "Tümen"]) : currency + " " + n(minor / unit(currency)));

  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Package" size={28} /></span>
        <div>
          <h2>{tx(["مدیریت پکیج و قیمت‌گذاری", "Packages & pricing", "Pakete & Preise", "Paketler ve fiyatlandırma"])}</h2>
          <p>{tx(["یک منبع برای لندینگ، پرداخت و دسترسی‌ها", "One source for landing, checkout and entitlements", "Eine Quelle für Landingpage, Checkout und Zugriffe", "Tanıtım, ödeme ve erişim için tek kaynak"])}</p>
        </div>
      </div>
      <nav className="admin-finance-links">
        <Button variant="primary" onClick={() => { setForm({ ...blank, category: category !== "ALL" ? category : "BUSINESS" }); setError(""); setPreview(false); }}><Icon name="Plus" size={16} />{tx(["پکیج جدید", "New package", "Neues Paket", "Yeni paket"])}</Button>
        <Link className="btn" href="/admin/billing/rates">{tx(["نرخ ارز", "Exchange rates", "Wechselkurse", "Döviz kurları"])}</Link>
        <Link className="btn" href="/admin/billing/promotions">{tx(["پروموشن‌ها", "Promotions", "Aktionen", "Promosyonlar"])}</Link>
        <Link className="btn" href="/admin/financial">{tx(["خریدها و رسیدها", "Purchases & receipts", "Käufe & Belege", "Satın almalar ve dekontlar"])}</Link>
      </nav>
      <div className="stats-grid">
        <div className="panel stat"><span>{tx(["کل پکیج‌ها", "Total packages", "Pakete gesamt", "Toplam paket"])}</span><strong>{plans ? n(plans.length) : "—"}</strong></div>
        <div className="panel stat"><span>{tx(["منتشرشده", "Published", "Veröffentlicht", "Yayımlanan"])}</span><strong>{plans ? n(plans.filter((p) => p.isActive && p.publicVisible && p.publicationStatus === "PUBLISHED").length) : "—"}</strong></div>
        <div className="panel stat"><span>{tx(["پیش‌نویس", "Drafts", "Entwürfe", "Taslaklar"])}</span><strong>{plans ? n(plans.filter((p) => p.publicationStatus === "DRAFT").length) : "—"}</strong></div>
      </div>
      <div className="domain-toolbar">
        <label>{tx(["جست‌وجوی پکیج", "Search packages", "Pakete suchen", "Paket ara"])}<input value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label>{tx(["دسته پکیج", "Package category", "Paketkategorie", "Paket kategorisi"])}
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="ALL">{tx(["همه دسته‌ها", "All categories", "Alle Kategorien", "Tüm kategoriler"])}</option>
            {categories.filter((c) => plans?.some((p) => p.category === c.code)).map((c) => <option key={c.code} value={c.code}>{labels[c.code]}</option>)}
          </select>
        </label>
      </div>
      <div className="tool-grid" aria-busy={!plans}>
        {visible.map((p) => {
          const terms = parse(p.termPrices, {});
          const live = p.isActive && p.publicVisible && p.publicationStatus === "PUBLISHED";
          return (
            <article className={"panel admin-package-card" + (p.isActive ? "" : " inactive")} key={p.id}>
              <div className="row-between"><span className="badge">{labels[p.category] || p.category}</span><span className={"badge " + (live ? "green" : p.publicationStatus === "ARCHIVED" ? "red" : "")}>{labels[p.publicationStatus] || p.publicationStatus}</span></div>
              <h3>{i === 0 ? p.name : p.nameEn || p.name}</h3>
              <code dir="ltr">{p.planCode}</code>
              <div className="admin-package-prices">{Object.entries(terms).map(([term, price]) => <p key={term}><strong dir="ltr">{money(price as number, p.baseCurrency)}</strong><small>{labels[term] || term}</small></p>)}</div>
              <details className="admin-package-landing">
                <summary>{tx(["پیش‌نمایش قیمت لندینگ", "Landing price preview", "Landingpreis-Vorschau", "Tanıtım fiyatı önizlemesi"])}</summary>
                {["fa", "en", "de", "tr"].map((loc) => { const shown = (landing[loc] || []).find((x: Rec) => x.code === p.planCode); return <p key={loc}><span>{({ fa: "فارسی", en: "English", de: "Deutsch", tr: "Türkçe" } as Record<string, string>)[loc]}</span><strong>{shown ? money(shown.minor, shown.currency) + " · " + (labels[shown.period] || shown.period) : tx(["نمایش داده نمی‌شود", "Not displayed", "Nicht angezeigt", "Gösterilmiyor"])}</strong></p>; })}
                {retired.includes(p.planCode) && <small>{tx(["پکیج قدیمی؛ جایگزین‌شده با پکیج‌های فعلی چت", "Legacy package, replaced by the current chat tiers", "Altpaket, durch aktuelle Chat-Pakete ersetzt", "Eski paket, güncel sohbet paketleriyle değiştirildi"])}</small>}
              </details>
              <p className="admin-package-meta">{n(p.credits)} AI · {n(p.mediaCredits)} Media · {n(p.voiceMinutes)} Voice</p>
              <label className="toggle-row"><span>{labels.isActive}</span><input type="checkbox" checked={!!p.isActive} onChange={(e) => void setActive(p, e.target.checked)} /></label>
              <Button onClick={() => edit(p)}>{tx(["ویرایش و پیش‌نمایش", "Edit & preview", "Bearbeiten & Vorschau", "Düzenle ve önizle"])}</Button>
            </article>
          );
        })}
      </div>
      {plans && !visible.length && <Empty />}
      {form && (
        <Modal title={form.id ? tx(["ویرایش پکیج", "Edit package", "Paket bearbeiten", "Paketi düzenle"]) : tx(["پکیج جدید", "New package", "Neues Paket", "Yeni paket"])} onClose={() => setForm(null)}>
          <form className="admin-package-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <div className="domain-fields">
              {field("planCode", tx(["کد یکتا", "Unique code", "Eindeutiger Code", "Benzersiz kod"]))}
              {field("name", tx(["نام فارسی", "Persian name", "Persischer Name", "Farsça ad"]))}
              {field("nameEn", tx(["نام بین‌المللی", "International name", "Internationaler Name", "Uluslararası ad"]))}
              {select("category", tx(["دسته", "Category", "Kategorie", "Kategori"]), categories.map((c) => c.code))}
              {select("baseCurrency", tx(["ارز پایه", "Base currency", "Basiswährung", "Temel para birimi"]), ["USD", "TRY", "IRT"])}
              {select("publicationStatus", tx(["وضعیت انتشار", "Publication status", "Veröffentlichung", "Yayın durumu"]), ["DRAFT", "PUBLISHED", "ARCHIVED"])}
              {field("description", tx(["توضیح", "Description", "Beschreibung", "Açıklama"]))}
              {field("badge", tx(["برچسب", "Badge", "Abzeichen", "Etiket"]))}
            </div>
            <h3>{tx(["قیمت کل دوره", "Whole-term prices", "Gesamtpreise", "Dönem toplam fiyatları"])} · {form.baseCurrency}</h3>
            <div className="domain-fields">
              {TERMS.map((k) => (
                <label key={k}>{labels[k] || k}
                  <input type="number" min="0" dir="ltr" step={form.baseCurrency === "IRT" ? 1 : 0.01} value={form.termPrices[k] === undefined ? "" : form.termPrices[k] / unit(form.baseCurrency)} onChange={(e) => { const prices = { ...form.termPrices }; if (e.target.value === "") delete prices[k]; else prices[k] = Math.round(Number(e.target.value) * unit(form.baseCurrency)); change("termPrices", prices); }} />
                </label>
              ))}
            </div>
            <p className="fine-print">{tx(["خالی = دوره غیرقابل خرید. مبلغ کل دوره را وارد کنید.", "Blank = unavailable. Enter the total price for each term.", "Leer = nicht verfügbar. Gesamtpreis je Laufzeit eingeben.", "Boş = kullanılamaz. Dönem toplam fiyatını girin."])}</p>
            <fieldset className="admin-checks admin-fixed-prices">
              <legend>{tx(["قیمت ثابت هر ارز", "Fixed retail prices", "Feste Verkaufspreise", "Sabit satış fiyatları"])}</legend>
              <p className="fine-print">{tx(["قیمت لندینگ و پرداخت از همین مبالغ است؛ نرخ ارز آن‌ها را تغییر نمی‌دهد. IRT = تومان؛ بقیه به واحد اصلی.", "Landing and checkout use these fixed amounts, independent of exchange rates. IRT = toman; other currencies use major units.", "Landingpage und Kasse verwenden feste Beträge unabhängig vom Wechselkurs. IRT = Toman.", "Tanıtım ve ödeme sayfaları döviz kurundan bağımsız bu sabit tutarları kullanır. IRT = tümen."])}</p>
              <div className="domain-fields">
                {["USD", "TRY", "IRT", "EUR"].filter((c) => c !== form.baseCurrency).flatMap((currency) => Object.keys(form.termPrices || {}).map((period) => {
                  const prices = form.entitlements?.fixedPrices || {};
                  return (
                    <label key={currency + "-" + period}>{currency} · {labels[period] || period}
                      <input type="number" min="0" dir="ltr" step={currency === "IRT" ? 1 : 0.01} value={prices[currency]?.[period] === undefined ? "" : prices[currency][period] / unit(currency)} onChange={(e) => { const next = { ...prices, [currency]: { ...prices[currency] } }; if (e.target.value === "") delete next[currency][period]; else next[currency][period] = Math.round(+e.target.value * unit(currency)); change("entitlements", { ...form.entitlements, fixedPrices: next }); }} />
                    </label>
                  );
                }))}
              </div>
            </fieldset>
            <label>{tx(["قیمت قبل از تخفیف (تومان)", "Previous price (toman)", "Vorheriger Preis (Toman)", "Önceki fiyat (tümen)"])}
              <input type="number" min="0" dir="ltr" value={form.entitlements.limits?.compareAtToman ?? ""} onChange={(e) => { const limits = { ...form.entitlements.limits }; if (e.target.value === "") delete limits.compareAtToman; else limits.compareAtToman = Number(e.target.value); change("entitlements", { ...form.entitlements, limits }); }} />
            </label>
            <h3>{tx(["دسترسی و محدودیت", "Access & limits", "Zugriff & Limits", "Erişim ve limitler"])}</h3>
            <div className="domain-fields">
              {[["credits", "AI Credits"], ["mediaCredits", "Media Credits"], ["voiceMinutes", "Voice Minutes"], ["crmContactLimit", "CRM Contacts"], ["teamSeatLimit", "Team seats"], ["crmSeatLimit", "CRM seats"], ["duration", "Custom duration (days)"], ["sortOrder", "Display order"]].map(([k, l]) => field(k, l, "number"))}
              {select("creditAllocation", tx(["تخصیص اعتبار", "Credit allocation", "Credit-Zuteilung", "Kredi tahsisi"]), ["TERM", "MONTHLY_TOTAL"])}
              {select("studentEligibility", tx(["شرایط دانشجو", "Student eligibility", "Studierendenzugang", "Öğrenci uygunluğu"]), ["ACCOUNT_TYPE", "VERIFIED"])}
              {field("features", "Features (Persian)")}
              {field("featuresEn", "Features (international)")}
            </div>
            {form.category === "VIDEO_FACTORY" && (
              <div className="domain-fields">
                {([["videoCount", tx(["تعداد ویدیو", "Video count", "Videoanzahl", "Video sayısı"])], ["videoSeconds", tx(["کل ثانیه تولید", "Total production seconds", "Produktionssekunden", "Toplam üretim saniyesi"])], ["videoMaxSeconds", tx(["حداکثر هر ویدیو / ثانیه (۴۸۰)", "Maximum seconds per video (480)", "Maximale Sekunden je Video (480)", "Video başına azami saniye (480)"])]] as [string, string][]).map(([key, label]) => (
                  <label key={key}>{label}<input type="number" min="1" dir="ltr" max={key === "videoMaxSeconds" ? 480 : 480000} value={form.entitlements.limits?.[key] || ""} onChange={(e) => change("entitlements", { ...form.entitlements, limits: { ...form.entitlements.limits, [key]: +e.target.value } })} /></label>
                ))}
              </div>
            )}
            <label>{tx(["کلید ماژول‌ها (با کاما)", "Module keys (comma-separated)", "Modulschlüssel (Kommas)", "Modül anahtarları (virgülle)"])}<input dir="ltr" value={(form.entitlements.modules || []).join(",")} onChange={(e) => change("entitlements", { ...form.entitlements, modules: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></label>
            <label>{tx(["کلید ایجنت‌ها (با کاما)", "Agent keys (comma-separated)", "Agentenschlüssel (Kommas)", "Ajan anahtarları (virgülle)"])}<input dir="ltr" value={(form.entitlements.agents || []).join(",")} onChange={(e) => change("entitlements", { ...form.entitlements, agents: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></label>
            <fieldset className="admin-checks">
              {["isActive", "publicVisible", "isFeatured", "promoEligible", "trialEligible"].map((k) => <label key={k}><input type="checkbox" disabled={k === "trialEligible"} checked={!!form[k]} onChange={(e) => change(k, e.target.checked)} />{labels[k] || k}</label>)}
            </fieldset>
            <p className="fine-print">{tx(["سقف سفارشی CRM و تأیید دانشجویی هنوز فعال نیستند. از امکانات پکیج‌های موجود استفاده کنید.", "Custom CRM caps and student verification are not active yet. Use the existing package capabilities.", "Eigene CRM-Limits und Studierendenprüfung sind noch nicht aktiv. Nutzen Sie bestehende Paketfunktionen.", "Özel CRM limitleri ve öğrenci doğrulama henüz etkin değil. Mevcut paket özelliklerini kullanın."])}</p>
            <button type="button" className="text-link" onClick={() => setPreview(!preview)}>{tx(["پیش‌نمایش کارت", "Preview card", "Kartenvorschau", "Kart önizlemesi"])}</button>
            {preview && <article className="panel admin-package-card"><span className="badge">{form.badge}</span><h3>{form.nameEn}</h3><strong dir="ltr">{money(form.termPrices.monthly || 0, form.baseCurrency)}</strong><p>{form.description}</p><p>{n(form.credits || 0)} AI Credits</p></article>}
            {error && <p role="alert">{error}</p>}
            <Button type="submit" variant="primary" disabled={busy}>{tx(["ذخیره پکیج", "Save package", "Paket speichern", "Paketi kaydet"])}</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
