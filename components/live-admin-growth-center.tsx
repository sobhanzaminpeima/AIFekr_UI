"use client";
import Link from "@/components/site-link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * Customer Follow-up & Conversion center on aifekr.com: /api/admin/growth
 * (overview, customers, customer, campaigns, automations, settings, exports)
 * and /api/admin/followup (engine, jobs, analytics, live). Real data only.
 * Anything that would start real sending (growth send flags, engine live mode,
 * channels, a live "run now") asks for confirmation first; the server still
 * requires a super admin for those.
 */
type Tx = [string, string, string, string];
type Two = [string, string];
const GROWTH = "/api/admin/growth";
const FOLLOWUP = "/api/admin/followup";

function useG() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const two = (c: Two | undefined, fallback = "") => (c ? (i === 0 ? c[0] : c[1]) : fallback);
  const tag = ["fa-IR", "en-GB", "de-DE", "tr-TR"][i];
  const date = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString(tag, { year: "numeric", month: "short", day: "numeric" }) : "—");
  const dateTime = (v: string) => new Date(v).toLocaleString(tag, { dateStyle: "medium", timeStyle: "short" });
  return { n, i, fa: i === 0, tx, two, date, dateTime };
}

function useData<T>(api: string, query: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (query === null) return;
    let live = true;
    setLoading(true);
    fetch(api + "?" + query, { cache: "no-store", credentials: "include" })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw Error(d.error || "HTTP_" + r.status); return d; })
      .then((d) => { if (live) { setData(d); setError(""); } })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "FAILED"); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [api, query, tick]);
  const reload = useCallback(() => setTick((x) => x + 1), []);
  return { data, error, loading, reload };
}

async function post(api: string, body: Record<string, unknown>) {
  const r = await fetch(api, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error([d.error, ...(d.issues || [])].filter(Boolean).join(" · ") || "HTTP_" + r.status);
  return d;
}

/** Saves a file from the growth API; an API error is returned instead of being saved. */
async function saveFile(query: string, fallbackName: string): Promise<string | null> {
  const r = await fetch(GROWTH + "?" + query, { cache: "no-store", credentials: "include" });
  if (!r.ok) { const d = await r.json().catch(() => ({})); return d.error || "HTTP_" + r.status; }
  const name = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") || "")?.[1] || fallbackName;
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86_400_000));

const MODULES: Record<string, Tx> = {
  "voice-studio": ["استودیوی صدا", "Voice Studio", "Voice Studio", "Ses Stüdyosu"], image: ["تولید تصویر", "Image creation", "Bilderstellung", "Görsel üretimi"],
  video: ["تولید ویدئو", "Video creation", "Videoerstellung", "Video üretimi"], "video-factory": ["کارخانهٔ ویدئو", "Video Factory", "Video Factory", "Video Fabrikası"],
  music: ["تولید موسیقی", "Music creation", "Musikerstellung", "Müzik üretimi"], chat: ["دستیار هوشمند", "AI assistant", "KI-Assistent", "Yapay zekâ asistanı"],
  crm: ["CRM و فروش", "CRM & sales", "CRM & Vertrieb", "CRM ve satış"], seo: ["محتوا و سئو", "Content & SEO", "Inhalte & SEO", "İçerik ve SEO"],
  social: ["شبکه‌های اجتماعی", "Social media", "Soziale Medien", "Sosyal medya"], "website-designer": ["طراحی وبسایت", "Website designer", "Website-Designer", "Web sitesi tasarımı"],
  student: ["فضای دانشجویی", "Student workspace", "Studienbereich", "Öğrenci alanı"], fitness: ["فیت", "Fitness", "Fitness", "Fitness"], live: ["AIFekr لایو", "AIFekr Live", "AIFekr Live", "AIFekr Canlı"],
};
const STAGES: Record<string, Tx> = {
  signed_up: ["ثبت‌نام", "Signed up", "Registriert", "Kayıt oldu"], onboarding: ["آشنایی", "Onboarding", "Onboarding", "Tanışma"], activated: ["فعال‌شده", "Activated", "Aktiviert", "Etkinleşti"],
  engaged: ["درگیر", "Engaged", "Engagiert", "Bağlı"], purchase_intent: ["نزدیک خرید", "Purchase intent", "Kaufabsicht", "Satın alma niyeti"], paid: ["مشتری پولی", "Paying", "Zahlend", "Ödeyen"],
  renewed: ["تمدیدکرده", "Renewed", "Verlängert", "Yeniledi"], at_risk: ["در خطر", "At risk", "Gefährdet", "Risk altında"], churned: ["ریزش‌کرده", "Churned", "Abgewandert", "Ayrıldı"],
};
const SEGMENTS: Record<string, Tx> = {
  new: ["کاربران جدید", "New users", "Neue Benutzer", "Yeni kullanıcılar"], unactivated: ["فعال‌نشده", "Unactivated", "Nicht aktiviert", "Etkinleşmemiş"],
  activated_free: ["رایگانِ فعال‌شده", "Activated free", "Aktiviert (gratis)", "Etkin ücretsiz"], engaged_free: ["رایگانِ درگیر", "Engaged free", "Engagiert (gratis)", "Bağlı ücretsiz"],
  high_intent: ["قصد خرید بالا", "High intent", "Hohe Kaufabsicht", "Yüksek niyet"], low_credit: ["کردیت کم", "Low credit", "Wenig Credits", "Az kredi"],
  inactive: ["غیرفعال", "Inactive", "Inaktiv", "Pasif"], paying: ["مشتریان پولی", "Paying", "Zahlend", "Ödeyen"], at_risk_paying: ["پولیِ در خطر", "At-risk paying", "Gefährdet zahlend", "Riskli ödeyen"],
  renewed: ["تمدیدکرده", "Renewed", "Verlängert", "Yeniledi"], cancelled: ["لغو/پایان‌یافته", "Cancelled/ended", "Gekündigt/beendet", "İptal/bitti"],
};
const BANDS: Record<string, Tx> = { activation: ["اولویت فعال‌سازی", "Activation priority", "Aktivierungspriorität", "Etkinleştirme önceliği"], nurture: ["اولویت پرورش", "Nurture priority", "Pflegepriorität", "Besleme önceliği"], sales: ["اولویت پیگیری فروش", "Sales follow-up", "Vertriebs-Follow-up", "Satış takibi"] };
const ACTIONS: Record<string, Tx> = {
  help_with_failed_payment: ["کمک به پرداخت ناموفق", "Help with the failed payment", "Bei der fehlgeschlagenen Zahlung helfen", "Başarısız ödemede yardım"],
  check_in_paid_customer: ["تماس و پرسیدن حال مشتری پولی", "Check in with the paying customer", "Beim zahlenden Kunden nachfragen", "Ödeyen müşteriyle görüşme"],
  offer_plan_guidance: ["راهنمایی برای انتخاب پلن مناسب", "Offer guidance on choosing a plan", "Bei der Tarifwahl beraten", "Plan seçiminde rehberlik"],
  explain_paid_benefits: ["توضیح مزایای پلن برای کاری که انجام می‌دهد", "Explain plan benefits for their use", "Tarifvorteile für ihre Nutzung erklären", "Planın faydalarını anlatma"],
  suggest_second_workflow: ["پیشنهاد یک کار مفید دوم", "Suggest a second useful workflow", "Einen zweiten nützlichen Ablauf vorschlagen", "İkinci yararlı iş önerme"],
  guide_to_first_result: ["کمک به گرفتن اولین نتیجه", "Help them reach a first result", "Zum ersten Ergebnis führen", "İlk sonuca ulaştırma"],
  ask_for_feedback: ["درخواست بازخورد", "Ask for feedback", "Um Feedback bitten", "Geri bildirim isteme"], none: ["—", "—", "—", "—"],
};
const JOB_STATUS: Record<string, Tx> = {
  queued: ["در صف", "Queued", "In Warteschlange", "Sırada"], processing: ["در حال پردازش", "Processing", "In Bearbeitung", "İşleniyor"], sent: ["ارسال‌شده", "Sent", "Gesendet", "Gönderildi"],
  dry_run: ["آزمایشی (ارسال نشد)", "Dry run (not sent)", "Testlauf (nicht gesendet)", "Deneme (gönderilmedi)"], suppressed: ["متوقف‌شده", "Suppressed", "Unterdrückt", "Durduruldu"],
  holdout: ["گروه کنترل (ارسال نشد)", "Holdout (not sent)", "Kontrollgruppe (nicht gesendet)", "Kontrol grubu (gönderilmedi)"], failed: ["ناموفق", "Failed", "Fehlgeschlagen", "Başarısız"], cancelled: ["لغوشده", "Cancelled", "Abgebrochen", "İptal"],
};
const REASONS: Record<string, Tx> = {
  engine_disabled: ["موتور پیگیری خاموش است", "Follow-up engine is off", "Follow-up-Engine ist aus", "Takip motoru kapalı"], dry_run_mode: ["حالت آزمایشی (فقط ثبت)", "Dry-run mode (record only)", "Testmodus (nur Protokoll)", "Deneme modu (yalnızca kayıt)"],
  lifecycle_automation_disabled: ["سوییچ «اتوماسیون چرخهٔ عمر» خاموش است", "Lifecycle automation flag is off", "Lebenszyklus-Automatisierung ist aus", "Yaşam döngüsü otomasyonu kapalı"],
  communications_disabled: ["سوییچ «ارسال خودکار پیام» خاموش است", "Automated communications flag is off", "Automatische Nachrichten sind aus", "Otomatik iletişim kapalı"],
  no_channel_enabled: ["هیچ کانالی روشن نیست", "No channel is on", "Kein Kanal ist an", "Açık kanal yok"], rule_disabled: ["این قاعده در «قواعد» خاموش است", "Rule is off in Rules", "Regel ist in Regeln aus", "Kural kapalı"],
  live_campaign_disabled: ["کمپین لایو خاموش است", "Live campaign is off", "Live-Kampagne ist aus", "Canlı kampanya kapalı"], expired: ["منقضی (دیر شد)", "Expired (too late)", "Abgelaufen", "Süresi doldu"],
  unknown_rule: ["قاعدهٔ ناشناخته", "Unknown rule", "Unbekannte Regel", "Bilinmeyen kural"], user_unavailable: ["کاربر در دسترس نیست", "User unavailable", "Benutzer nicht verfügbar", "Kullanıcı yok"],
  unsubscribed: ["لغو اشتراک کرده", "Unsubscribed", "Abgemeldet", "Abonelikten çıktı"], suppressed_all: ["همهٔ پیام‌ها برای کاربر متوقف شده", "All messages suppressed", "Alle Nachrichten unterdrückt", "Tüm mesajlar durduruldu"],
  no_longer_eligible: ["دیگر واجد شرایط نیست", "No longer eligible", "Nicht mehr berechtigt", "Artık uygun değil"], paid_customer: ["مشتری پولی (پیام تبلیغاتی نمی‌گیرد)", "Paying customer (no promotions)", "Zahlender Kunde (keine Werbung)", "Ödeyen müşteri (tanıtım yok)"],
  already_sent: ["قبلاً ارسال شده", "Already sent", "Bereits gesendet", "Zaten gönderildi"], quiet_hours: ["ساعت سکوت", "Quiet hours", "Ruhezeit", "Sessiz saatler"],
  frequency_cap_per24h: ["سقف ۲۴ ساعت", "24-hour cap", "24-Stunden-Limit", "24 saat sınırı"], frequency_cap_per7d: ["سقف ۷ روز", "7-day cap", "7-Tage-Limit", "7 gün sınırı"], frequency_cap: ["سقف تعداد پیام", "Frequency cap", "Häufigkeitslimit", "Sıklık sınırı"],
  no_channel: ["کانال مجاز ندارد", "No allowed channel", "Kein erlaubter Kanal", "İzinli kanal yok"], template_error: ["خطای متن پیام", "Template error", "Vorlagenfehler", "Şablon hatası"],
  max_attempts: ["تلاش‌ها تمام شد", "Out of retries", "Keine Versuche mehr", "Deneme hakkı bitti"], retry: ["در انتظار تلاش دوباره", "Waiting to retry", "Wartet auf Wiederholung", "Yeniden deneme bekliyor"],
  interrupted: ["قطع شد (دوباره ارسال نمی‌شود)", "Interrupted (never re-sent)", "Unterbrochen (kein erneutes Senden)", "Kesildi (tekrar gönderilmez)"], admin_cancelled: ["لغو توسط مدیر", "Cancelled by an admin", "Von Admin abgebrochen", "Yönetici iptal etti"],
  recorded_after_error: ["ارسال شد؛ ثبت با تأخیر", "Sent; recorded after an error", "Gesendet; nach Fehler protokolliert", "Gönderildi; hatadan sonra kaydedildi"],
};
const CHANNELS: Record<string, Tx> = {
  in_app: ["اعلان داخل برنامه", "In-app notification", "In-App-Mitteilung", "Uygulama içi bildirim"], email: ["ایمیل", "Email", "E-Mail", "E-posta"], push: ["پوش موبایل", "Mobile push", "Mobile Push", "Mobil bildirim"],
  sms: ["پیامک", "SMS", "SMS", "SMS"], whatsapp: ["واتس‌اپ", "WhatsApp", "WhatsApp", "WhatsApp"], instagram_dm: ["دایرکت اینستاگرام", "Instagram DM", "Instagram-DM", "Instagram DM"],
};
const ATTEMPT_REASONS: Record<string, Tx> = {
  credits: ["اعتبار کافی نبود", "Not enough credits", "Nicht genug Credits", "Yetersiz kredi"], plan: ["نیاز به پلن", "Plan required", "Tarif nötig", "Plan gerekli"], limit: ["سقف پلن", "Plan limit reached", "Tariflimit erreicht", "Plan sınırı"],
  rate_limited: ["محدودیت سرعت", "Rate limited", "Ratenbegrenzt", "Hız sınırı"], disabled: ["غیرفعال", "Disabled", "Deaktiviert", "Devre dışı"], invalid_input: ["ورودی نامعتبر", "Invalid input", "Ungültige Eingabe", "Geçersiz giriş"],
  content_blocked: ["رد بررسی ایمنی محتوا", "Content safety rejection", "Inhaltssicherheit abgelehnt", "İçerik güvenliği reddi"], forbidden: ["بدون دسترسی", "Not allowed", "Nicht erlaubt", "İzin yok"],
  provider: ["خطای سرویس", "Provider error", "Anbieterfehler", "Sağlayıcı hatası"], cancelled: ["لغو یا قطع", "Cancelled", "Abgebrochen", "İptal"], unknown: ["نامشخص", "Unknown", "Unbekannt", "Bilinmiyor"],
};
const lbl = (map: Record<string, Tx>, key: string | null | undefined, i: number) => (key ? map[key]?.[i] ?? key : "—");

function Missing({ children }: { children?: React.ReactNode }) {
  const { tx } = useG();
  return <span className="gc-missing" title={tx(["داده‌ای برای محاسبه وجود ندارد (صفر نیست).", "No data to calculate this (not zero).", "Keine Daten zur Berechnung (nicht null).", "Hesaplanacak veri yok (sıfır değil)."])}>{children ?? tx(["نامشخص", "N/A", "k. A.", "Yok"])}</span>;
}
function Problem({ error }: { error: string }) {
  const { tx } = useG();
  if (!error) return null;
  return <p className="admin-alert" role="alert">{error === "HTTP_403" || /FORBIDDEN/.test(error) ? tx(["این کار فقط با نقش مدیر ارشد ممکن است.", "Only a super admin can do this.", "Nur ein Super-Admin kann das.", "Bunu yalnızca süper yönetici yapabilir."]) : error}</p>;
}
function Bars({ rows, max }: { rows: [React.ReactNode, number, React.ReactNode?][]; max: number }) {
  const { n } = useG();
  return <div className="gc-bars">{rows.map(([label, v, extra], k) => <div className="gc-bar-row" key={k}><span>{label}</span><div className="gc-bar"><i style={{ width: Math.max(2, (v * 100) / Math.max(1, max)) + "%" }} /></div><b>{n(v)}{extra}</b></div>)}</div>;
}
function Pager({ page, size, total, onPage }: { page: number; size: number; total: number; onPage: (p: number) => void }) {
  const { n, tx } = useG();
  return <div className="pagination"><span>{n(total)}</span><div>
    <Button disabled={page <= 1} onClick={() => onPage(page - 1)}>{tx(["قبلی", "Previous", "Zurück", "Önceki"])}</Button>
    <span>{n(page)} / {n(Math.max(1, Math.ceil(total / size)))}</span>
    <Button disabled={page * size >= total} onClick={() => onPage(page + 1)}>{tx(["بعدی", "Next", "Weiter", "Sonraki"])}</Button>
  </div></div>;
}
function Confirm({ title, body, action, onYes, onClose }: { title: string; body: React.ReactNode; action: string; onYes: () => void; onClose: () => void }) {
  return <Modal title={title} onClose={onClose}><div className="gc-confirm">{body}</div><div className="domain-actions"><Button variant="danger" onClick={onYes}>{action}</Button></div></Modal>;
}

const TABS: [string, Tx][] = [
  ["overview", ["نمای کلی و قیف", "Overview & funnel", "Überblick & Trichter", "Genel bakış ve huni"]],
  ["customers", ["مشتریان و بخش‌ها", "Customers & segments", "Kunden & Segmente", "Müşteriler ve segmentler"]],
  ["automations", ["قواعد و متن پیام‌ها", "Rules & templates", "Regeln & Vorlagen", "Kurallar ve şablonlar"]],
  ["followup", ["موتور پیگیری", "Follow-up engine", "Follow-up-Engine", "Takip motoru"]],
  ["campaigns", ["کمپین‌ها", "Campaigns", "Kampagnen", "Kampanyalar"]],
  ["analytics", ["تحلیل تبدیل", "Conversion analytics", "Conversion-Analyse", "Dönüşüm analizi"]],
  ["logs", ["گزارش ارسال‌ها", "Send log", "Versandprotokoll", "Gönderim günlüğü"]],
  ["settings", ["تنظیمات", "Settings", "Einstellungen", "Ayarlar"]],
];

export function LiveGrowthCenter() {
  const { tx } = useG();
  const [tab, setTab] = useState("overview");
  useEffect(() => {
    const read = () => { const h = location.hash.slice(1); if (TABS.some(([k]) => k === h)) setTab(h); };
    const timer = setTimeout(read, 0);
    addEventListener("hashchange", read);
    return () => { clearTimeout(timer); removeEventListener("hashchange", read); };
  }, []);
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="TrendingUp" size={28} /></span>
        <div>
          <h2>{tx(["مرکز پیگیری و تبدیل مشتری", "Customer follow-up & conversion", "Kunden-Follow-up & Conversion", "Müşteri takibi ve dönüşüm"])}</h2>
          <p>{tx(["از کلیک تبلیغ تا اولین نتیجه، خرید و تمدید — فقط با دادهٔ واقعی. مشتریانِ CRM کاربران اینجا نیستند.", "From ad click to first result, purchase and renewal — real data only. Users' own CRM contacts are not shown here.", "Vom Anzeigenklick bis zum ersten Ergebnis, Kauf und zur Verlängerung — nur echte Daten. CRM-Kontakte der Nutzer erscheinen hier nicht.", "Reklam tıklamasından ilk sonuca, satın almaya ve yenilemeye — yalnızca gerçek veri. Kullanıcıların CRM kişileri burada yok."])}</p>
        </div>
      </div>
      <ExportReport />
      <nav className="module-tabs" role="tablist">
        {TABS.map(([k, label]) => <a key={k} href={"#" + k} role="tab" aria-selected={tab === k} className={tab === k ? "selected" : ""} onClick={(e) => { e.preventDefault(); setTab(k); history.replaceState(null, "", "#" + k); }}>{tx(label)}</a>)}
      </nav>
      <div role="tabpanel" className="gc-panel">
        {tab === "overview" ? <Overview /> : tab === "customers" ? <Customers /> : tab === "automations" ? <Automations /> : tab === "followup" ? <Engine /> : tab === "campaigns" ? <Campaigns /> : tab === "analytics" ? <Analytics /> : tab === "logs" ? <Logs /> : <GrowthSettingsTab />}
      </div>
    </>
  );
}

function ExportReport() {
  const { tx } = useG();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  async function go(full: boolean) {
    setBusy(true);
    const p = new URLSearchParams({ view: full ? "export-report" : "export" });
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const e = await saveFile(p.toString(), "aifekr-growth-" + iso(new Date()) + (full ? ".json" : ".csv")).catch(() => "FAILED");
    if (e) toast.error(e === "HTTP_403" ? tx(["فقط مدیر ارشد اجازهٔ خروجی دارد.", "Only a super admin can export.", "Nur ein Super-Admin kann exportieren.", "Yalnızca süper yönetici dışa aktarabilir."]) : tx(["خروجی آماده نشد؛ بازه را بررسی و دوباره تلاش کنید.", "Export failed. Check the range and try again.", "Export fehlgeschlagen. Zeitraum prüfen und erneut versuchen.", "Dışa aktarma başarısız. Aralığı kontrol edip tekrar deneyin."]));
    setBusy(false);
  }
  return (
    <section className="panel gc-export">
      <Button onClick={() => setOpen(!open)}><Icon name="Download" size={16} />{tx(["دریافت گزارش کامل", "Download complete report", "Vollständigen Bericht laden", "Tam raporu indir"])}</Button>
      {open && <>
        <p className="fine-print">{tx(["JSON شامل قیف رشد، کمپین‌ها و تمام کاربران پلتفرم است. CSV برای بررسی مشتریان در اکسل مناسب است. خروجی‌ها فقط برای مدیر ارشد و همراه ثبت در گزارش ممیزی هستند. بدون انتخاب تاریخ: ۳۰ روز اخیر.", "JSON includes the growth funnel, campaigns and all platform customers. CSV opens in Excel. Exports need a super admin and are audited. Default: last 30 days.", "JSON enthält Trichter, Kampagnen und alle Kunden. CSV öffnet in Excel. Exporte nur für Super-Admins und werden protokolliert. Standard: letzte 30 Tage.", "JSON büyüme hunisini, kampanyaları ve tüm müşterileri içerir. CSV Excel'de açılır. Dışa aktarmalar süper yönetici gerektirir ve denetlenir. Varsayılan: son 30 gün."])}</p>
        <div className="domain-fields">
          <label>{tx(["از تاریخ (قیف رشد)", "From (funnel)", "Von (Trichter)", "Başlangıç (huni)"])}<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>{tx(["تا تاریخ", "To", "Bis", "Bitiş"])}<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <div className="domain-actions">
          <Button variant="primary" disabled={busy} onClick={() => void go(true)}><Icon name="FileJson" size={16} />{tx(["گزارش کامل JSON", "Complete JSON report", "Vollständiger JSON-Bericht", "Tam JSON raporu"])}</Button>
          <Button disabled={busy} onClick={() => void go(false)}><Icon name="FileSpreadsheet" size={16} />{tx(["مشتریان CSV / Excel", "Customers CSV / Excel", "Kunden CSV / Excel", "Müşteriler CSV / Excel"])}</Button>
        </div>
      </>}
    </section>
  );
}

type OverviewData = {
  disabled?: boolean;
  kpis: Record<string, number | null>;
  funnel: { step: string; count: number }[];
  stages: Record<string, number>;
  modules: [string, number][];
  generation: { modules: [string, { views: number; started: number; succeeded: number; failed: number; reasons: Record<string, number> }][]; firstSuccess: { count: number; medianMinutes: number | null } };
};
function Disabled() {
  const { tx } = useG();
  return <p className="panel fine-print">{tx(["مرکز رشد مشتری در تب «تنظیمات» خاموش است.", "The Customer Growth Center is switched off in Settings.", "Das Growth Center ist in den Einstellungen ausgeschaltet.", "Büyüme merkezi Ayarlar'da kapalı."])}</p>;
}

function Overview() {
  const { n, i, tx } = useG();
  const [to, setTo] = useState(() => iso(new Date()));
  const [from, setFrom] = useState(() => daysAgo(30));
  const { data, error, loading } = useData<OverviewData>(GROWTH, `view=overview&from=${from}&to=${to}`);
  if (data?.disabled) return <Disabled />;
  const k = data?.kpis;
  const num = (v: number | null | undefined) => (v == null ? <Missing /> : n(v));
  const pct = (v: number | null | undefined) => (v == null ? <Missing /> : n(v) + "%");
  const tiles: [Tx, React.ReactNode, Tx][] = k ? [
    [["ثبت‌نام‌ها", "Signups", "Registrierungen", "Kayıtlar"], num(k.signups), ["حساب‌های ساخته‌شده در بازه (بدون مدیران)", "Accounts created in the range (excluding admins)", "Im Zeitraum erstellte Konten (ohne Admins)", "Aralıkta açılan hesaplar (yöneticiler hariç)"]],
    [["فعال‌شده (نتیجهٔ اول)", "Activated (first value)", "Aktiviert (erster Nutzen)", "Etkin (ilk değer)"], num(k.firstValue), ["کاربرانی از این گروه که حداقل یک خروجی واقعی گرفته‌اند", "Users in this cohort with at least one real output", "Nutzer dieser Kohorte mit mindestens einem echten Ergebnis", "En az bir gerçek çıktı alan kullanıcılar"]],
    [["نرخ فعال‌سازی", "Activation rate", "Aktivierungsrate", "Etkinleşme oranı"], pct(k.activationRate), ["فعال‌شده ÷ ثبت‌نام‌های بازه", "Activated ÷ signups in range", "Aktiviert ÷ Registrierungen", "Etkin ÷ kayıtlar"]],
    [["تکمیل آشنایی", "Onboarding completion", "Onboarding abgeschlossen", "Tanışma tamamlama"], pct(k.onboardingRate), ["تکمیل‌شده یا ورود مستقیم به ماژول ÷ ثبت‌نام‌ها", "Completed or contextual ÷ signups", "Abgeschlossen oder kontextuell ÷ Registrierungen", "Tamamlanan veya bağlamsal ÷ kayıtlar"]],
    [["شروع پرداخت", "Checkout starts", "Checkout-Starts", "Ödeme başlangıcı"], num(k.checkoutStarts), ["کاربرانی که رکورد پرداخت ساخته‌اند", "Users who created a payment record", "Nutzer mit Zahlungsdatensatz", "Ödeme kaydı oluşturan kullanıcılar"]],
    [["خریدار", "Paid", "Bezahlt", "Ödeyen"], num(k.paid), ["کاربران این گروه با پرداخت تأییدشده توسط سرور", "Cohort users with a server-confirmed payment", "Kohortennutzer mit serverbestätigter Zahlung", "Sunucu onaylı ödemesi olanlar"]],
    [["تبدیل رایگان به پولی", "Free-to-paid", "Gratis zu bezahlt", "Ücretsizden ücretliye"], pct(k.freeToPaid), ["خریدار ÷ ثبت‌نام‌ها؛ گروه‌های جوان هنوز کامل نیستند", "Paid ÷ signups; young cohorts are incomplete", "Bezahlt ÷ Registrierungen; junge Kohorten unvollständig", "Ödeyen ÷ kayıtlar; genç gruplar eksik"]],
    [["تبدیل گروه بالغ", "Mature cohort conversion", "Conversion reifer Kohorte", "Olgun grup dönüşümü"], k.matureCohort ? pct(k.matureFreeToPaid) : <Missing>{tx(["گروه بالغ ندارد", "No mature cohort", "Keine reife Kohorte", "Olgun grup yok"])}</Missing>, ["فقط کاربرانی که پنجرهٔ امتیازدهی‌شان کامل شده", "Only users whose scoring window has fully elapsed", "Nur Nutzer mit abgelaufenem Bewertungsfenster", "Yalnızca puanlama penceresi dolanlar"]],
    [["درآمد این گروه (تومان)", "Cohort revenue (Toman)", "Kohortenumsatz (Toman)", "Grup geliri (Tümen)"], num(k.revenueToman), ["جمع پرداخت‌های موفق این گروه (معادل تومان در لحظهٔ پرداخت)", "Successful payments by this cohort (Toman at checkout)", "Erfolgreiche Zahlungen der Kohorte (Toman beim Checkout)", "Bu grubun başarılı ödemeleri (ödeme anında Tümen)"]],
    [["مشتریان پولی فعلی", "Paying now", "Aktuell zahlend", "Şu an ödeyen"], num(k.payingNow), ["پلن فعال + حداقل یک پرداخت موفق", "Active plan + at least one successful payment", "Aktiver Tarif + mindestens eine Zahlung", "Aktif plan + en az bir ödeme"]],
    [["کاربران فعال", "Active now", "Aktiv", "Aktif"], num(k.activeNow), ["فعالیت در بازهٔ عدم‌فعالیت تنظیم‌شده", "Activity within the configured inactivity window", "Aktivität im eingestellten Fenster", "Ayarlanan pencere içinde etkinlik"]],
    [["مشترکان در خطر", "At-risk subscribers", "Gefährdete Abonnenten", "Riskli aboneler"], num(k.atRiskNow), ["قواعد تنظیم‌شده؛ پیش‌بینی آماری نیست", "Configured rules; not a statistical prediction", "Konfigurierte Regeln; keine Prognose", "Ayarlı kurallar; istatistiksel tahmin değil"]],
  ] : [];
  const steps: Record<string, Tx> = { visitors: ["بازدیدکنندهٔ ردیابی‌شده", "Tracked visitors", "Erfasste Besucher", "İzlenen ziyaretçiler"], signups: ["ثبت‌نام", "Signup", "Registrierung", "Kayıt"], onboarding: ["آشنایی", "Onboarding", "Onboarding", "Tanışma"], first_value: ["نتیجهٔ اول", "First value", "Erster Nutzen", "İlk değer"], repeat_usage: ["استفادهٔ تکراری", "Repeat usage", "Wiederholte Nutzung", "Tekrar kullanım"], checkout: ["شروع پرداخت", "Checkout", "Checkout", "Ödeme"], paid: ["خرید", "Paid", "Bezahlt", "Satın alma"] };
  return (
    <>
      <div className="domain-toolbar">
        <label>{tx(["از", "From", "Von", "Başlangıç"])}<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>{tx(["تا", "To", "Bis", "Bitiş"])}<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <p className="fine-print">{tx(["گروه ثبت‌نام: کاربرانی که در این بازه ثبت‌نام کرده‌اند. زمان‌ها UTC.", "Signup cohort: users who registered in this range. Times are UTC.", "Registrierungskohorte: in diesem Zeitraum registrierte Nutzer. Zeiten in UTC.", "Kayıt grubu: bu aralıkta kayıt olanlar. Saatler UTC."])}</p>
      <Problem error={error} />
      <div className="stats-grid gc-kpis" aria-busy={loading}>
        {tiles.map(([label, value, def]) => <div className="panel stat" key={label[1]} title={tx(def)}><span>{tx(label)}</span><strong>{value}</strong><small>{tx(def)}</small></div>)}
      </div>
      {data && <>
        <div className="gc-two">
          <section className="panel">
            <h3>{tx(["قیف تبدیل", "Conversion funnel", "Conversion-Trichter", "Dönüşüm hunisi"])}</h3>
            <p className="fine-print">{tx(["بازدیدکننده فقط از کمپین یا ارجاع خارجی شمرده می‌شود.", "Visitors only count campaign or external-referral landings.", "Besucher zählen nur über Kampagnen oder externe Verweise.", "Ziyaretçiler yalnızca kampanya veya dış yönlendirmeden sayılır."])}</p>
            <Bars max={Math.max(1, ...data.funnel.map((f) => f.count))} rows={data.funnel.map((f, k) => { const prev = k > 1 ? data.funnel[k - 1].count : 0; return [tx(steps[f.step] ?? [f.step, f.step, f.step, f.step]), f.count, prev ? <em> {Math.round((f.count * 100) / prev)}%</em> : null]; })} />
          </section>
          <section className="panel">
            <h3>{tx(["مراحل چرخهٔ عمر (همهٔ مشتریان)", "Lifecycle stages (all customers)", "Lebenszyklus (alle Kunden)", "Yaşam döngüsü (tüm müşteriler)"])}</h3>
            <Bars max={Math.max(1, ...Object.values(data.stages))} rows={Object.entries(data.stages).sort((a, b) => b[1] - a[1]).map(([s, v]) => [<span key={s} className={"gc-stage gc-stage-" + s}>{lbl(STAGES, s, i)}</span>, v])} />
            <h3>{tx(["ماژول‌هایی که این گروه در آن نتیجه گرفته", "Modules where this cohort got results", "Module mit Ergebnissen dieser Kohorte", "Bu grubun sonuç aldığı modüller"])}</h3>
            {data.modules.length ? <Bars max={Math.max(1, data.funnel[1]?.count ?? 1)} rows={data.modules.map(([m, v]) => [lbl(MODULES, m, i), v])} /> : <p className="fine-print">{tx(["هنوز نتیجه‌ای ثبت نشده.", "No results recorded yet.", "Noch keine Ergebnisse.", "Henüz sonuç yok."])}</p>}
          </section>
        </div>
        <section className="panel">
          <h3>{tx(["تلاش‌های تولید", "Generation attempts", "Generierungsversuche", "Üretim denemeleri"])}</h3>
          <p className="fine-print">{tx(["از رویدادهای ثبت‌شده در سرور (از ۳۰ اکتبر ۲۰۲۶). شکست با دلیلش جدا از رها کردن کاربر دیده می‌شود.", "From server-recorded events (since 30 Oct 2026). A failure shows with its reason, apart from a user who left.", "Aus Serverereignissen (seit 30. Okt. 2026). Fehler erscheinen mit Grund, getrennt von Abbrüchen.", "Sunucu olaylarından (30 Ekim 2026'dan beri). Başarısızlık nedeniyle, bırakmadan ayrı gösterilir."])}</p>
          <p>{tx(["اولین موفقیت حساب‌های جدید", "New accounts' first success", "Erster Erfolg neuer Konten", "Yeni hesapların ilk başarısı"])}: <strong>{n(data.generation.firstSuccess.count)}</strong>
            {data.generation.firstSuccess.medianMinutes != null && <> · {tx(["میانهٔ زمان از ثبت‌نام (دقیقه)", "median minutes from signup", "Median Minuten ab Registrierung", "kayıttan medyan dakika"])}: <strong>{n(data.generation.firstSuccess.medianMinutes)}</strong></>}</p>
          {data.generation.modules.length ? <div className="table-scroll"><table className="admin-finance-table">
            <thead><tr>{([["ابزار", "Tool", "Werkzeug", "Araç"], ["بازدید", "Views", "Aufrufe", "Görüntüleme"], ["شروع", "Started", "Gestartet", "Başladı"], ["موفق", "Succeeded", "Erfolgreich", "Başarılı"], ["ناموفق", "Failed", "Fehlgeschlagen", "Başarısız"], ["دلیل شکست", "Failure reasons", "Fehlergründe", "Başarısızlık nedenleri"]] as Tx[]).map((h) => <th key={h[1]}>{tx(h)}</th>)}</tr></thead>
            <tbody>{data.generation.modules.map(([m, r]) => <tr key={m}><td>{lbl(MODULES, m, i)}</td><td>{n(r.views)}</td><td>{n(r.started)}</td><td>{n(r.succeeded)}</td><td>{n(r.failed)}</td><td>{Object.entries(r.reasons).map(([key, v]) => lbl(ATTEMPT_REASONS, key, i) + ": " + n(v)).join(" · ") || "—"}</td></tr>)}</tbody>
          </table></div> : <Missing>{tx(["هنوز تلاشی در این بازه ثبت نشده", "No attempts recorded in this range yet", "Noch keine Versuche in diesem Zeitraum", "Bu aralıkta henüz deneme yok"])}</Missing>}
        </section>
        <details className="panel gc-defs">
          <summary>{tx(["تعریف دقیق شاخص‌ها", "Exact metric definitions", "Genaue Kennzahldefinitionen", "Metriklerin tam tanımı"])}</summary>
          <dl className="domain-detail">
            <dt>{tx(["نتیجهٔ اول", "First value", "Erster Nutzen", "İlk değer"])}</dt><dd>{tx(["اولین خروجی واقعی: تصویر/ویدئو/موسیقی بدون بازپرداخت، صدای آماده، پاسخ دستیار، مخاطب CRM، تحلیل سئو، پست، وبسایت، منبع درسی، پروفایل فیت. کلیک روی دکمه شمرده نمی‌شود.", "First real output: unrefunded image/video/music, ready voice audio, assistant reply, CRM contact, SEO audit, post, website, study material, fitness profile. Clicks never count.", "Erstes echtes Ergebnis: nicht erstattetes Bild/Video/Musik, fertige Audiodatei, Assistentenantwort, CRM-Kontakt, SEO-Analyse, Beitrag, Website, Lernmaterial, Fitnessprofil. Klicks zählen nie.", "İlk gerçek çıktı: iade edilmemiş görsel/video/müzik, hazır ses, asistan yanıtı, CRM kişisi, SEO analizi, gönderi, web sitesi, ders materyali, fitness profili. Tıklamalar sayılmaz."])}</dd>
            <dt>{tx(["خرید", "Paid", "Bezahlt", "Satın alma"])}</dt><dd>{tx(["پرداخت موفقی که فقط با تأیید درگاه، وب‌هوک یا بررسی مدیر ثبت می‌شود.", "A successful payment, set only by gateway verification, webhook or admin review.", "Erfolgreiche Zahlung, nur durch Gateway-Prüfung, Webhook oder Admin-Prüfung gesetzt.", "Yalnızca ödeme geçidi doğrulaması, webhook veya yönetici incelemesiyle başarılı ödeme."])}</dd>
            <dt>{tx(["استفادهٔ تکراری", "Repeat usage", "Wiederholte Nutzung", "Tekrar kullanım"])}</dt><dd>{tx(["حداقل ۲ روز فعال در پنجرهٔ امتیازدهی یا حداقل ۲ خروجی موفق.", "At least 2 active days in the scoring window, or at least 2 successful outputs.", "Mindestens 2 aktive Tage im Bewertungsfenster oder 2 erfolgreiche Ergebnisse.", "Puanlama penceresinde en az 2 aktif gün veya en az 2 başarılı çıktı."])}</dd>
            <dt>{tx(["درآمد", "Revenue", "Umsatz", "Gelir"])}</dt><dd>{tx(["جمع مبلغ تومانی پرداخت‌های موفق؛ برای پرداخت ارزی، معادل تومان در زمان پرداخت.", "Sum of the Toman amount of successful payments; for foreign currency, the Toman equivalent at checkout.", "Summe der Toman-Beträge erfolgreicher Zahlungen; bei Fremdwährung der Toman-Gegenwert beim Checkout.", "Başarılı ödemelerin Tümen toplamı; döviz için ödeme anındaki Tümen karşılığı."])}</dd>
            <dt>{tx(["مستثنی", "Excluded", "Ausgeschlossen", "Hariç"])}</dt><dd>{tx(["مدیران و حساب‌های مسدود.", "Administrators and blocked accounts.", "Administratoren und gesperrte Konten.", "Yöneticiler ve engelli hesaplar."])}</dd>
          </dl>
        </details>
      </>}
    </>
  );
}

type CustomerRow = { id: string; name: string | null; email: string | null; phone: string | null; createdAt: string; plan: string; credits: number; source: string | null; confidence: string; stage: string; score: number; band: string; lastActiveAt: string | null; preferredModule: string | null; followUpStatus: string };
type CustomersData = { disabled?: boolean; total: number; page: number; size: number; rows: CustomerRow[]; segmentCounts: Record<string, number>; settings: { thresholds: Record<string, number> } };

function Customers() {
  const { n, i, tx, date } = useG();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [segment, setSegment] = useState("");
  const [band, setBand] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ view: "customers", q: query, stage, segment, band, page: String(page) }).toString();
  const { data, error, loading } = useData<CustomersData>(GROWTH, params);
  const [busy, setBusy] = useState(false);
  if (data?.disabled) return <Disabled />;
  const th = data?.settings.thresholds;
  const defs: Record<string, string> = th ? {
    new: tx([`ثبت‌نام در ${th.newUserDays} روز اخیر`, `Registered in the last ${th.newUserDays} days`, `In den letzten ${th.newUserDays} Tagen registriert`, `Son ${th.newUserDays} günde kayıt`]),
    unactivated: tx(["هنوز هیچ خروجی واقعی نگرفته", "No real output yet", "Noch kein echtes Ergebnis", "Henüz gerçek çıktı yok"]),
    activated_free: tx(["حداقل یک خروجی واقعی، بدون پلن پولی فعال", "At least one real output, no active paid plan", "Mindestens ein Ergebnis, kein bezahlter Tarif", "En az bir çıktı, ücretli plan yok"]),
    engaged_free: tx([`رایگان با حداقل ${th.engagedActiveDays} روز فعال در ${th.scoringWindowDays} روز`, `Free with ≥${th.engagedActiveDays} active days in ${th.scoringWindowDays} days`, `Gratis mit ≥${th.engagedActiveDays} aktiven Tagen in ${th.scoringWindowDays} Tagen`, `${th.scoringWindowDays} günde ≥${th.engagedActiveDays} aktif gün, ücretsiz`]),
    high_intent: tx([`رایگان با امتیاز ≥ ${th.highIntentScore}`, `Free with score ≥ ${th.highIntentScore}`, `Gratis mit Punktzahl ≥ ${th.highIntentScore}`, `Puan ≥ ${th.highIntentScore}, ücretsiz`]),
    low_credit: tx([`کردیت ≤ ${th.lowCredits}`, `Credits ≤ ${th.lowCredits}`, `Credits ≤ ${th.lowCredits}`, `Kredi ≤ ${th.lowCredits}`]),
    inactive: tx([`بدون فعالیت در ${th.inactiveDays} روز`, `No activity for ${th.inactiveDays} days`, `Seit ${th.inactiveDays} Tagen inaktiv`, `${th.inactiveDays} gündür etkinlik yok`]),
    paying: tx(["پلن فعال و حداقل یک پرداخت موفق", "Active plan and at least one successful payment", "Aktiver Tarif und mindestens eine Zahlung", "Aktif plan ve en az bir ödeme"]),
    at_risk_paying: tx([`پولی با ${th.atRiskPaidInactiveDays} روز عدم فعالیت، پرداخت ناموفق اخیر، یا تمدید نزدیک با استفادهٔ کم`, `Paying with ${th.atRiskPaidInactiveDays} inactive days, a recent failed payment, or renewal soon with low usage`, `Zahlend mit ${th.atRiskPaidInactiveDays} inaktiven Tagen, kürzlich fehlgeschlagener Zahlung oder baldiger Verlängerung bei wenig Nutzung`, `${th.atRiskPaidInactiveDays} gün pasif, yakın zamanda başarısız ödeme veya az kullanımla yakın yenileme`]),
    renewed: tx(["پولی با ۲ پرداخت موفق یا بیشتر", "Paying with 2+ successful payments", "Zahlend mit 2+ Zahlungen", "2+ başarılı ödemeli"]),
    cancelled: tx(["قبلاً پرداخت کرده، اکنون پلن فعال ندارد", "Paid before, no active plan now", "Früher bezahlt, jetzt kein Tarif", "Daha önce ödedi, şimdi plan yok"]),
  } : {};
  async function exportCsv() {
    setBusy(true);
    const e = await saveFile(new URLSearchParams({ view: "export", q: query, stage, segment, band }).toString(), "aifekr-customers.csv").catch(() => "FAILED");
    if (e) toast.error(e === "HTTP_403" ? tx(["فقط مدیر ارشد اجازهٔ خروجی دارد.", "Only a super admin can export.", "Nur ein Super-Admin kann exportieren.", "Yalnızca süper yönetici dışa aktarabilir."]) : e);
    setBusy(false);
  }
  return (
    <>
      <SmsListCard />
      <nav className="gc-chips" aria-label={tx(["بخش‌ها", "Segments", "Segmente", "Segmentler"])}>
        <button aria-pressed={!segment} onClick={() => { setSegment(""); setPage(1); }}>{tx(["همه", "All", "Alle", "Tümü"])}</button>
        {Object.entries(SEGMENTS).map(([key, l]) => <button key={key} aria-pressed={segment === key} title={defs[key]} onClick={() => { setSegment(key); setPage(1); }}>{l[i]}{data ? " (" + n(data.segmentCounts[key] ?? 0) + ")" : ""}</button>)}
      </nav>
      <form className="domain-toolbar" onSubmit={(e) => { e.preventDefault(); setQuery(q); setPage(1); }}>
        <input aria-label={tx(["جست‌وجو", "Search", "Suche", "Ara"])} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx(["نام، ایمیل یا موبایل", "Name, email or phone", "Name, E-Mail oder Telefon", "Ad, e-posta veya telefon"])} />
        <Button type="submit" label={tx(["جست‌وجو", "Search", "Suche", "Ara"])}><Icon name="Search" size={16} /></Button>
        <select aria-label={tx(["مرحله", "Stage", "Phase", "Aşama"])} value={stage} onChange={(e) => { setStage(e.target.value); setPage(1); }}><option value="">{tx(["همهٔ مراحل", "All stages", "Alle Phasen", "Tüm aşamalar"])}</option>{Object.entries(STAGES).map(([key, l]) => <option key={key} value={key}>{l[i]}</option>)}</select>
        <select aria-label={tx(["اولویت", "Priority", "Priorität", "Öncelik"])} value={band} onChange={(e) => { setBand(e.target.value); setPage(1); }}><option value="">{tx(["همهٔ اولویت‌ها", "All priorities", "Alle Prioritäten", "Tüm öncelikler"])}</option>{Object.entries(BANDS).map(([key, l]) => <option key={key} value={key}>{l[i]}</option>)}</select>
        <Button disabled={busy} onClick={() => void exportCsv()}><Icon name="Download" size={16} />CSV</Button>
      </form>
      {segment && defs[segment] && <p className="fine-print">{tx(["تعریف", "Definition", "Definition", "Tanım"])}: {defs[segment]}</p>}
      <Problem error={error} />
      <section className="panel" aria-busy={loading}>
        {data?.rows.length ? <div className="table-scroll"><table className="admin-finance-table">
          <thead><tr>{([["کاربر", "User", "Benutzer", "Kullanıcı"], ["ثبت‌نام", "Signed up", "Registriert", "Kayıt"], ["منبع", "Source", "Quelle", "Kaynak"], ["مرحله", "Stage", "Phase", "Aşama"], ["پلن", "Plan", "Tarif", "Plan"], ["کردیت", "Credits", "Credits", "Kredi"], ["آخرین فعالیت", "Last active", "Zuletzt aktiv", "Son etkinlik"], ["ماژول اصلی", "Main module", "Hauptmodul", "Ana modül"], ["امتیاز", "Score", "Punkte", "Puan"], ["پیگیری", "Follow-up", "Follow-up", "Takip"]] as Tx[]).map((h) => <th key={h[1]}>{tx(h)}</th>)}</tr></thead>
          <tbody>{data.rows.map((r) => <tr key={r.id}>
            <td><Link href={"/admin/customer-growth/" + encodeURIComponent(r.id)}>{r.name || r.email || r.phone || r.id}</Link><small><bdi dir="ltr">{r.email || r.phone}</bdi></small></td>
            <td>{date(r.createdAt)}</td>
            <td>{r.source ? <bdi dir="ltr">{r.source}</bdi> : <Missing>{tx(["نامشخص", "Unknown", "Unbekannt", "Bilinmiyor"])}</Missing>}<small>{r.confidence}</small></td>
            <td><span className={"gc-stage gc-stage-" + r.stage}>{lbl(STAGES, r.stage, i)}</span></td>
            <td>{r.plan}</td><td dir="ltr">{n(r.credits)}</td><td>{date(r.lastActiveAt)}</td>
            <td>{r.preferredModule ? lbl(MODULES, r.preferredModule, i) : "—"}</td>
            <td><span className={"gc-band gc-band-" + r.band} title={lbl(BANDS, r.band, i)}>{n(r.score)}</span></td>
            <td>{r.followUpStatus === "none" ? "—" : r.followUpStatus}</td>
          </tr>)}</tbody>
        </table></div> : !loading && <Empty />}
        {data && <Pager page={page} size={data.size} total={data.total} onPage={setPage} />}
      </section>
      <p className="fine-print">{tx(["امتیاز یک ابزار اولویت‌بندی بر پایهٔ قواعد قابل تنظیم است، نه احتمال خرید.", "The score is a prioritisation aid based on configurable rules, not a purchase probability.", "Die Punktzahl ist eine Priorisierungshilfe nach einstellbaren Regeln, keine Kaufwahrscheinlichkeit.", "Puan, ayarlanabilir kurallara dayalı bir önceliklendirme aracıdır, satın alma olasılığı değildir."])}</p>
    </>
  );
}

function SmsListCard() {
  const { tx } = useG();
  const [audience, setAudience] = useState("not_opted_out");
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const e = await saveFile(new URLSearchParams({ view: "phone-export", audience }).toString(), "aifekr-sms.csv").catch(() => "FAILED");
    if (e) toast.error(e === "RATE_LIMITED" ? tx(["سقف خروجی گرفتن پر شده است (۳ بار در ساعت).", "Export limit reached (3 per hour).", "Exportlimit erreicht (3 pro Stunde).", "Dışa aktarma sınırı doldu (saatte 3)."]) : /403|FORBIDDEN/.test(e) ? tx(["فقط مدیر ارشد می‌تواند این فهرست را بگیرد.", "Only a super admin can download this list.", "Nur ein Super-Admin kann diese Liste laden.", "Bu listeyi yalnızca süper yönetici indirebilir."]) : e);
    setBusy(false);
  }
  return (
    <details className="panel gc-sms">
      <summary><Icon name="MessageSquareText" size={16} /> {tx(["فهرست موبایل کاربران برای پیامک", "Customers' mobile numbers for SMS", "Mobilnummern der Kunden für SMS", "SMS için müşteri telefonları"])}</summary>
      <p className="fine-print">{tx(["فایل CSV با نام، موبایل، زبان، تاریخ ثبت‌نام، مرحله، پلن، آخرین فعالیت و وضعیت رضایت/لغو. فقط مدیر ارشد؛ هر خروجی ثبت می‌شود و حداکثر ۳ بار در ساعت. این فایل اطلاعات شخصی است؛ آن را جایی منتشر نکنید.", "CSV with name, mobile, language, sign-up date, stage, plan, last activity and consent/opt-out. Super admin only; every export is audited, at most 3 per hour. It is personal data: do not share it.", "CSV mit Name, Mobilnummer, Sprache, Registrierung, Phase, Tarif, letzter Aktivität und Einwilligung. Nur Super-Admin; jeder Export wird protokolliert, max. 3 pro Stunde. Personenbezogene Daten: nicht weitergeben.", "Ad, telefon, dil, kayıt tarihi, aşama, plan, son etkinlik ve izin durumuyla CSV. Yalnızca süper yönetici; her dışa aktarma denetlenir, saatte en fazla 3. Kişisel veridir: paylaşmayın."])}</p>
      <p className="admin-note" role="note">{tx(["طبق مقررات پیامک تبلیغاتی در ایران، هر پیام تبلیغاتی باید راه لغو داشته باشد (مثلاً «لغو۱۱») و فقط برای کسانی ارسال شود که لغو نکرده‌اند. پیش‌فرض این فهرست همین افراد است.", "Iranian promotional-SMS rules: every promotional message needs an opt-out (e.g. «لغو۱۱») and may go only to people who have not opted out. That is this list's default.", "Iranische Werbe-SMS-Regeln: Jede Werbenachricht braucht eine Abmeldeoption und darf nur an Nicht-Abgemeldete gehen. Das ist der Standard dieser Liste.", "İran tanıtım SMS kuralları: her tanıtım mesajında çıkış yolu olmalı ve yalnızca çıkmamış kişilere gitmeli. Bu listenin varsayılanı budur."])}</p>
      <div className="domain-toolbar">
        <select aria-label={tx(["مخاطبان", "Audience", "Zielgruppe", "Hedef kitle"])} value={audience} onChange={(e) => setAudience(e.target.value)}>
          <option value="not_opted_out">{tx(["فقط کسانی که لغو نکرده‌اند (پیش‌فرض)", "Only people who haven't opted out (default)", "Nur Nicht-Abgemeldete (Standard)", "Yalnızca çıkmamış olanlar (varsayılan)"])}</option>
          <option value="consented">{tx(["فقط کسانی که صریحاً رضایت داده‌اند", "Only people who explicitly consented", "Nur ausdrücklich Einwilligende", "Yalnızca açıkça izin verenler"])}</option>
          <option value="all">{tx(["همه (برای پیام غیرتبلیغاتی)", "Everyone (non-promotional messages only)", "Alle (nur nicht werbliche Nachrichten)", "Herkes (yalnızca tanıtım dışı mesajlar)"])}</option>
        </select>
        <Button variant="primary" disabled={busy} onClick={() => void go()}><Icon name="Download" size={16} />{busy ? tx(["در حال ساخت…", "Building…", "Wird erstellt…", "Hazırlanıyor…"]) : tx(["دانلود CSV", "Download CSV", "CSV herunterladen", "CSV indir"])}</Button>
      </div>
    </details>
  );
}

type Campaign = { id: string; name: string; status: string; targetModule: string | null; landingPath: string; utmSource: string; utmMedium: string; spendToman: number | null; startsAt: string | null; endsAt: string | null; recommendedPlan: string | null; notes: string };
type CampaignRow = { activation?: Activation | null; key: string; campaign: Campaign | null; visits: number | null; visitors: number | null; signups: number; firstValue: number; repeat: number; pricingViews: number; checkouts: number; paid: number; revenueToman: number; creditsUsed: number; activationRate: number | null; conversionRate: number | null; cacToman: number | null };
type CampaignsData = { disabled?: boolean; campaigns: CampaignRow[]; modules: { id: string; name: Two; landingPath: string }[]; origin: string };
type CampaignForm = { id?: string; name: string; utmCampaign: string; utmSource: string; utmMedium: string; targetModule: string; landingPath: string; status: string; startsAt: string; endsAt: string; spendToman: string; recommendedPlan: string; notes: string };
const LIVE_PRESET: CampaignForm = { name: "AIFekr لایو — اینستاگرام", utmCampaign: "instagram_aifekr_live_launch", utmSource: "instagram", utmMedium: "comment_dm", targetModule: "live", landingPath: "/live", status: "draft", startsAt: "", endsAt: "", spendToman: "", recommendedPlan: "", notes: "کامنت «لایو» زیر پست ← دایرکت با لینک ← /live" };
const EMPTY_CAMPAIGN: CampaignForm = { name: "", utmCampaign: "", utmSource: "instagram", utmMedium: "paid_social", targetModule: "", landingPath: "/", status: "draft", startsAt: "", endsAt: "", spendToman: "", recommendedPlan: "", notes: "" };
const CAMPAIGN_STATUS: Record<string, Tx> = { draft: ["پیش‌نویس", "Draft", "Entwurf", "Taslak"], active: ["فعال", "Active", "Aktiv", "Aktif"], paused: ["متوقف", "Paused", "Pausiert", "Duraklatıldı"], ended: ["تمام‌شده", "Ended", "Beendet", "Bitti"] };

function Campaigns() {
  const { n, i, tx, two, date } = useG();
  const { data, error, loading, reload } = useData<CampaignsData>(GROWTH, "view=campaigns");
  const [form, setForm] = useState<CampaignForm | null>(null);
  const [busy, setBusy] = useState(false);
  if (data?.disabled) return <Disabled />;
  const url = form && data ? data.origin + form.landingPath + "?" + new URLSearchParams({ utm_source: form.utmSource, utm_medium: form.utmMedium, utm_campaign: form.utmCampaign }) : "";
  const edit = (r: CampaignRow) => setForm(r.campaign ? { id: r.campaign.id, name: r.campaign.name, utmCampaign: r.key, utmSource: r.campaign.utmSource, utmMedium: r.campaign.utmMedium, targetModule: r.campaign.targetModule ?? "", landingPath: r.campaign.landingPath, status: r.campaign.status, startsAt: r.campaign.startsAt?.slice(0, 10) ?? "", endsAt: r.campaign.endsAt?.slice(0, 10) ?? "", spendToman: r.campaign.spendToman?.toString() ?? "", recommendedPlan: r.campaign.recommendedPlan ?? "", notes: r.campaign.notes } : { ...EMPTY_CAMPAIGN, name: r.key, utmCampaign: r.key });
  async function save() {
    if (!form) return;
    setBusy(true);
    try {
      await post(GROWTH, { action: "saveCampaign", campaign: { ...form, targetModule: form.targetModule || null, startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null, endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null, spendToman: form.spendToman ? Number(form.spendToman) : null, recommendedPlan: form.recommendedPlan || null } });
      toast.success(tx(["ذخیره شد", "Saved", "Gespeichert", "Kaydedildi"])); setForm(null); reload();
    } catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(false); }
  }
  const set = (k: keyof CampaignForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => f && { ...f, [k]: e.target.value });
  const num = (v: number | null) => (v == null ? <Missing /> : n(v));
  const pct = (v: number | null) => (v == null ? <Missing /> : n(v) + "%");
  const hint = (c: Tx) => <small>{tx(c)}</small>;
  return (
    <>
      <LiveCampaignCard />
      <CampaignReportCard campaigns={(data?.campaigns ?? []).map((r) => ({ key: r.key, name: r.campaign?.name ?? null }))} />
      <div className="domain-toolbar">
        <Button variant="primary" onClick={() => setForm({ ...EMPTY_CAMPAIGN })}><Icon name="Plus" size={16} />{tx(["کمپین جدید", "New campaign", "Neue Kampagne", "Yeni kampanya"])}</Button>
        <Button onClick={() => setForm({ ...LIVE_PRESET })}>{tx(["پر کردن خودکار: کمپین AIFekr لایو", "Prefill: AIFekr Live campaign", "Vorausfüllen: AIFekr-Live-Kampagne", "Otomatik doldur: AIFekr Canlı kampanyası"])}</Button>
      </div>
      <p className="fine-print">{tx(["انتساب = اولین تماس کاربر. درآمد = همهٔ پرداخت‌های موفق کاربران منتسب. CAC فقط وقتی هزینهٔ تبلیغ وارد شده باشد.", "Attribution = the user's first touch. Revenue = all successful payments of attributed users. CAC only when ad spend is entered.", "Zuordnung = erster Kontakt. Umsatz = alle Zahlungen zugeordneter Nutzer. CAC nur mit eingetragenen Werbekosten.", "Atıf = ilk temas. Gelir = atanan kullanıcıların tüm başarılı ödemeleri. CAC yalnızca reklam harcaması girilince."])}</p>
      <Problem error={error} />
      <section className="panel" aria-busy={loading}>
        {data?.campaigns.length ? <div className="table-scroll"><table className="admin-finance-table">
          <thead><tr>{([["کمپین / منبع", "Campaign / source", "Kampagne / Quelle", "Kampanya / kaynak"], ["وضعیت", "Status", "Status", "Durum"], ["بازدید", "Visits", "Besuche", "Ziyaret"], ["بازدیدکننده", "Visitors", "Besucher", "Ziyaretçi"], ["ثبت‌نام", "Signups", "Registrierungen", "Kayıt"], ["نتیجهٔ اول", "First value", "Erster Nutzen", "İlk değer"], ["فعال‌سازی", "Activation", "Aktivierung", "Etkinleşme"], ["تکرار", "Repeat", "Wiederholt", "Tekrar"], ["دیدن قیمت", "Pricing", "Preise", "Fiyat"], ["پرداخت", "Checkout", "Checkout", "Ödeme"], ["خرید", "Paid", "Bezahlt", "Satın alma"], ["تبدیل", "Conv.", "Conv.", "Dönüşüm"], ["درآمد (تومان)", "Revenue (T)", "Umsatz (T)", "Gelir (T)"], ["کردیت مصرفی", "Credits used", "Verbrauchte Credits", "Harcanan kredi"], ["CAC", "CAC", "CAC", "CAC"]] as Tx[]).map((h) => <th key={h[1]}>{tx(h)}</th>)}</tr></thead>
          <tbody>{data.campaigns.map((r) => <tr key={r.key}>
            <td><button className="link-button" onClick={() => edit(r)} title={tx(["ویرایش / ساخت لینک", "Edit / build link", "Bearbeiten / Link erstellen", "Düzenle / bağlantı oluştur"])}>{r.campaign?.name ?? (r.key === "unknown" ? tx(["نامشخص (بدون شاهد)", "Unknown (no evidence)", "Unbekannt (ohne Nachweis)", "Bilinmiyor (kanıt yok)"]) : r.key)}</button><small><bdi dir="ltr">{r.key}</bdi>{r.campaign?.startsAt ? " · " + date(r.campaign.startsAt) : ""}</small></td>
            <td>{r.activation ? <ActivationText activation={r.activation} short /> : r.campaign ? <span className="badge">{lbl(CAMPAIGN_STATUS, r.campaign.status, i)}</span> : <small>{tx(["ثبت‌نشده", "Unregistered", "Nicht registriert", "Kayıtsız"])}</small>}</td>
            <td>{num(r.visits)}</td><td>{num(r.visitors)}</td><td>{n(r.signups)}</td><td>{n(r.firstValue)}</td><td>{pct(r.activationRate)}</td><td>{n(r.repeat)}</td><td>{n(r.pricingViews)}</td><td>{n(r.checkouts)}</td><td>{n(r.paid)}</td><td>{pct(r.conversionRate)}</td><td>{n(r.revenueToman)}</td><td>{n(r.creditsUsed)}</td>
            <td>{r.cacToman != null ? n(r.cacToman) : <Missing>{r.campaign?.spendToman == null ? tx(["هزینه وارد نشده", "No spend", "Keine Kosten", "Harcama yok"]) : tx(["خریدار ندارد", "No buyers", "Keine Käufer", "Alıcı yok"])}</Missing>}</td>
          </tr>)}</tbody>
        </table></div> : !loading && <p className="fine-print">{tx(["هنوز کمپین یا ورودی ردیابی‌شده‌ای نیست. یک کمپین بسازید و لینک آن را در تبلیغ استفاده کنید.", "No campaigns or tracked landings yet. Create a campaign and use its link in your ad.", "Noch keine Kampagnen oder erfassten Landungen. Kampagne anlegen und Link in der Anzeige nutzen.", "Henüz kampanya veya izlenen giriş yok. Bir kampanya oluşturup bağlantısını reklamda kullanın."])}</p>}
      </section>
      {form && data && (
        <Modal title={form.id ? tx(["ویرایش کمپین", "Edit campaign", "Kampagne bearbeiten", "Kampanyayı düzenle"]) : tx(["کمپین جدید", "New campaign", "Neue Kampagne", "Yeni kampanya"])} onClose={() => setForm(null)}>
          <p className="fine-print">{tx(["این فرم فقط یک «برچسب» برای شمارش است: لینکی می‌سازد که در تبلیغ یا دایرکت می‌گذارید. چیزی منتشر یا ارسال نمی‌کند. فیلدهای انگلیسی فقط حروف کوچک، عدد، خط تیره و زیرخط می‌گیرند.", "This only creates a tracking label: it builds the link you put in an ad or DM. It posts or sends nothing. English fields accept only lowercase letters, digits, - and _.", "Dies erstellt nur ein Tracking-Label: den Link für Anzeige oder DM. Es wird nichts gepostet oder gesendet. Englische Felder: nur Kleinbuchstaben, Ziffern, - und _.", "Bu yalnızca bir izleme etiketi oluşturur: reklam veya DM bağlantısı. Hiçbir şey yayınlanmaz veya gönderilmez. İngilizce alanlar yalnızca küçük harf, rakam, - ve _ alır."])}</p>
          <form className="domain-fields" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <label>{tx(["نام", "Name", "Name", "Ad"])}<input value={form.name} onChange={set("name")} />{hint(["نامی که خودتان در گزارش می‌بینید", "Your own name for reports", "Ihr Name für Berichte", "Raporlarda göreceğiniz ad"])}</label>
            <label>{tx(["شناسهٔ کمپین (utm_campaign)", "Campaign id (utm_campaign)", "Kampagnen-ID (utm_campaign)", "Kampanya kimliği (utm_campaign)"])}<input dir="ltr" value={form.utmCampaign} onChange={set("utmCampaign")} placeholder="instagram_aifekr_live_launch" />{hint(["یک اسم انگلیسی یکتا و ثابت؛ بعداً عوضش نکنید", "A unique, fixed English id; don't change it later", "Eindeutige, feste ID; später nicht ändern", "Benzersiz, sabit kimlik; sonra değiştirmeyin"])}</label>
            <label>{tx(["منبع (utm_source)", "Source (utm_source)", "Quelle (utm_source)", "Kaynak (utm_source)"])}<input dir="ltr" value={form.utmSource} onChange={set("utmSource")} />{hint(["instagram، telegram، google، youtube", "instagram, telegram, google, youtube", "instagram, telegram, google, youtube", "instagram, telegram, google, youtube"])}</label>
            <label>{tx(["نوع تبلیغ (utm_medium)", "Medium (utm_medium)", "Medium (utm_medium)", "Ortam (utm_medium)"])}<input dir="ltr" value={form.utmMedium} onChange={set("utmMedium")} />{hint(["comment_dm، paid_social، story، bio، influencer", "comment_dm, paid_social, story, bio, influencer", "comment_dm, paid_social, story, bio, influencer", "comment_dm, paid_social, story, bio, influencer"])}</label>
            <label>{tx(["ماژول هدف", "Target module", "Zielmodul", "Hedef modül"])}<select value={form.targetModule} onChange={(e) => { const m = data.modules.find((x) => x.id === e.target.value); setForm((f) => f && { ...f, targetModule: e.target.value, landingPath: m ? m.landingPath : f.landingPath }); }}><option value="">{tx(["کل پلتفرم", "Whole platform", "Gesamte Plattform", "Tüm platform"])}</option>{data.modules.map((m) => <option key={m.id} value={m.id}>{MODULES[m.id]?.[i] ?? two(m.name, m.id)}</option>)}</select></label>
            <label>{tx(["صفحهٔ فرود", "Landing page", "Landingpage", "Açılış sayfası"])}<input dir="ltr" value={form.landingPath} onChange={set("landingPath")} />{hint(["با انتخاب ماژول خودکار پر می‌شود؛ مثال: /live", "Filled when you pick a module, e.g. /live", "Wird mit dem Modul gefüllt, z. B. /live", "Modül seçince dolar, örn. /live"])}</label>
            <label>{tx(["وضعیت", "Status", "Status", "Durum"])}<select value={form.status} onChange={set("status")}>{Object.keys(CAMPAIGN_STATUS).map((s) => <option key={s} value={s}>{lbl(CAMPAIGN_STATUS, s, i)}</option>)}</select>{hint(["فقط برای مرتب‌کردن گزارش؛ شمارش در هر وضعیتی انجام می‌شود", "For reports only; visits are counted in any status", "Nur für Berichte; gezählt wird immer", "Yalnızca raporlar için; her durumda sayılır"])}</label>
            <label>{tx(["شروع", "Start", "Start", "Başlangıç"])}<input type="date" value={form.startsAt} onChange={set("startsAt")} /></label>
            <label>{tx(["پایان", "End", "Ende", "Bitiş"])}<input type="date" value={form.endsAt} onChange={set("endsAt")} /></label>
            <label>{tx(["هزینهٔ تبلیغ (تومان، اختیاری)", "Ad spend (Toman, optional)", "Werbekosten (Toman, optional)", "Reklam harcaması (Tümen, isteğe bağlı)"])}<input inputMode="numeric" dir="ltr" value={form.spendToman} onChange={set("spendToman")} /></label>
            <label>{tx(["کد پلن پیشنهادی (اختیاری)", "Recommended plan code (optional)", "Empfohlener Tarifcode (optional)", "Önerilen plan kodu (isteğe bağlı)"])}<input dir="ltr" value={form.recommendedPlan} onChange={set("recommendedPlan")} /></label>
            <label className="span-2">{tx(["یادداشت", "Notes", "Notizen", "Notlar"])}<textarea value={form.notes} onChange={set("notes")} /></label>
            {form.utmCampaign && <div className="span-2 gc-url"><code dir="ltr">{url}</code><Button onClick={() => { void navigator.clipboard?.writeText(url).then(() => toast.success(tx(["کپی شد", "Copied", "Kopiert", "Kopyalandı"]))); }}><Icon name="Copy" size={14} />{tx(["کپی لینک", "Copy link", "Link kopieren", "Bağlantıyı kopyala"])}</Button></div>}
            <div className="span-2 domain-actions"><Button type="submit" variant="primary" disabled={busy || !form.name || !form.utmCampaign}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button></div>
          </form>
        </Modal>
      )}
    </>
  );
}

type Activation = { live: boolean; blockers: string[] };
const BLOCKERS: Record<string, Tx> = {
  record_missing: ["رکورد کمپین ساخته نشده", "the campaign record does not exist", "der Kampagnendatensatz fehlt", "kampanya kaydı yok"],
  record_not_active: ["وضعیت رکورد کمپین «فعال» نیست", "the campaign record is not set to active", "der Kampagnendatensatz ist nicht aktiv", "kampanya kaydı aktif değil"],
  instagram_not_connected: ["اینستاگرام AIFekr با حساب مدیر وصل نیست", "AIFekr's Instagram is not connected to an admin account", "AIFekrs Instagram ist mit keinem Admin-Konto verbunden", "AIFekr Instagram'ı bir yönetici hesabına bağlı değil"],
  comment_campaign_missing: ["کمپین کامنت «لایو» فعال با لینک ردیابی‌شده وجود ندارد", "there is no active «لایو» comment campaign with the tracked link", "keine aktive «لایو»-Kommentarkampagne mit Tracking-Link", "izlenen bağlantılı aktif «لایو» yorum kampanyası yok"],
};
type LiveData = {
  enabled: boolean;
  status: { activation: Activation; definition: { utmCampaign: string; keyword: string; url: string }; growthCampaign: { id: string; status: string } | null; instagram: { connected: boolean; accounts: string[]; expired: number }; commentCampaigns: { id: string; name: string; isActive: boolean; linkHasUtm: boolean; linkClicks: number }[]; state: "ready" | "needs_comment_campaign" | "not_connected" };
  funnel: { comments: Record<string, number>; visits: number; visitors: number; attributedUsers: number; signups: number; liveStarted: number; liveFirstValue: number; buyers: number; revenueToman: number };
};
/** The Live campaign's running state, worded the same in the table and on its card. */
function ActivationText({ activation, short }: { activation: Activation; short?: boolean }) {
  const { tx } = useG();
  if (activation.live) return short
    ? <span className="badge">{tx(["در حال اجرا", "Running", "Läuft", "Çalışıyor"])}</span>
    : <>{tx(["در حال اجرا: رکورد فعال است و کامنت «لایو» روی اینستاگرام متصل، دایرکت با لینک ردیابی می‌فرستد.", "Running: the record is active, and a «لایو» comment on the connected Instagram gets a DM with the tracked link.", "Läuft: Datensatz aktiv, ein «لایو»-Kommentar auf dem verbundenen Instagram erhält eine DM mit Tracking-Link.", "Çalışıyor: kayıt aktif; bağlı Instagram'daki «لایو» yorumu izlenen bağlantılı DM alır."])}</>;
  const reasons = activation.blockers.map((b) => tx(BLOCKERS[b] ?? [b, b, b, b])).join("؛ ");
  return short
    ? <span className="badge" title={reasons}>{tx(["اجرا نمی‌شود", "Not running", "Läuft nicht", "Çalışmıyor"])}</span>
    : <>{tx(["اجرا نمی‌شود: ", "Not running: ", "Läuft nicht: ", "Çalışmıyor: "])}{reasons}</>;
}
function LiveCampaignCard() {
  const { n, tx } = useG();
  const { data, error, reload } = useData<LiveData>(FOLLOWUP, "view=live");
  const [busy, setBusy] = useState(false);
  if (error) return <Problem error={error} />;
  if (!data) return <section className="panel" aria-busy="true" />;
  const { status: s, funnel: f } = data;
  const state = <ActivationText activation={s.activation} />;
  const followups = data.enabled
    ? tx(["پیام‌های پیگیری لایو: روشن", "Live follow-up messages: on", "Live-Folgenachrichten: an", "Canlı takip mesajları: açık"])
    : tx(["پیام‌های پیگیری لایو: خاموش (در تنظیمات موتور پیگیری روشن می‌شود؛ روی اجرای خود کمپین اثری ندارد)", "Live follow-up messages: off (switch on in follow-up engine settings; this does not affect whether the campaign runs)", "Live-Folgenachrichten: aus (in den Engine-Einstellungen einschalten; beeinflusst nicht, ob die Kampagne läuft)", "Canlı takip mesajları: kapalı (takip motoru ayarlarından açılır; kampanyanın çalışmasını etkilemez)"]);
  const steps: [Tx, number | null][] = [
    [["کامنت‌های پاسخ‌داده‌شده", "Comments answered", "Beantwortete Kommentare", "Yanıtlanan yorumlar"], f.comments.sent ?? (Object.keys(f.comments).length ? 0 : null)],
    [["بازدید از لینک", "Link visits", "Linkbesuche", "Bağlantı ziyaretleri"], f.visits], [["بازدیدکنندهٔ یکتا", "Unique visitors", "Eindeutige Besucher", "Tekil ziyaretçi"], f.visitors],
    [["کاربر منتسب", "Attributed users", "Zugeordnete Nutzer", "Atanan kullanıcılar"], f.attributedUsers], [["ثبت‌نام جدید", "New sign-ups", "Neue Registrierungen", "Yeni kayıtlar"], f.signups],
    [["شروع لایو", "Started Live", "Live gestartet", "Canlı başlattı"], f.liveStarted], [["اولین گفتگوی واقعی (۳۰+ ثانیه)", "First real call (30s+)", "Erster echter Anruf (30s+)", "İlk gerçek görüşme (30sn+)"], f.liveFirstValue],
    [["خریدار", "Buyers", "Käufer", "Alıcılar"], f.buyers],
  ];
  async function ensure() {
    setBusy(true);
    try { await post(FOLLOWUP, { action: "ensureLiveCampaign" }); reload(); } catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(false); }
  }
  return (
    <details className="panel gc-live-card">
      <summary><Icon name="Radio" size={16} /> {tx(["کمپین اینستاگرام AIFekr لایو", "AIFekr Live Instagram campaign", "AIFekr-Live-Instagram-Kampagne", "AIFekr Canlı Instagram kampanyası"])} <bdi dir="ltr" className="badge">{s.definition.utmCampaign}</bdi></summary>
      <p className="fine-print" role="status">{state}</p>
      <p className="fine-print">{followups}</p>
      {s.activation.blockers.includes("comment_campaign_missing") && (
        <p className="plan-notice">{tx(["این صفحه فقط «برچسب ردیابی» کمپین را نگه می‌دارد. خود خودکارسازی، یعنی پاسخ به کامنت «لایو» با دایرکت، در استودیوی اجتماعیِ همان حسابی ساخته می‌شود که اینستاگرام AIFekr به آن وصل است: یک کمپین «کامنت به دایرکت» با کلمهٔ «لایو» و لینک بالا بسازید.", "This page holds only the campaign's tracking label. The automation itself, answering a «لایو» comment with a DM, is built in Social Studio of the account AIFekr's Instagram is connected to: create a Comment-to-DM campaign with the keyword «لایو» and the link above.", "Diese Seite enthält nur das Tracking-Label. Die Automatisierung selbst (Antwort-DM auf «لایو») wird im Social Studio des Kontos angelegt, mit dem AIFekrs Instagram verbunden ist: Kommentar-zu-DM-Kampagne mit «لایو» und dem Link oben anlegen.", "Bu sayfa yalnızca kampanyanın izleme etiketini tutar. Otomasyonun kendisi («لایو» yorumuna DM) AIFekr Instagram'ının bağlı olduğu hesabın Sosyal Stüdyo'sunda kurulur: «لایو» anahtar kelimesi ve yukarıdaki bağlantıyla bir Yorumdan DM'e kampanyası oluşturun."])} <a className="text-link" href="/social?tab=campaigns">{tx(["رفتن به کمپین‌های استودیو", "Open studio campaigns", "Studio-Kampagnen öffnen", "Stüdyo kampanyalarını aç"])}</a></p>
      )}
      <dl className="domain-detail">
        <dt>{tx(["کلمهٔ کامنت", "Comment keyword", "Kommentar-Stichwort", "Yorum anahtar kelimesi"])}</dt><dd>«{s.definition.keyword}»</dd>
        <dt>{tx(["لینک داخل دایرکت", "Link to put in the DM", "Link für die DM", "DM'ye konacak bağlantı"])}</dt><dd><bdi dir="ltr">{s.definition.url}</bdi></dd>
        <dt>{tx(["اینستاگرام", "Instagram", "Instagram", "Instagram"])}</dt><dd>{s.instagram.connected ? s.instagram.accounts.map((a) => "@" + a).join(", ") || tx(["وصل", "connected", "verbunden", "bağlı"]) : tx(["وصل نیست", "not connected", "nicht verbunden", "bağlı değil"])}{s.instagram.expired ? " · " + tx(["توکن منقضی", "expired token", "abgelaufenes Token", "süresi dolmuş token"]) + ": " + n(s.instagram.expired) : ""}</dd>
        <dt>{tx(["کمپین کامنت", "Comment campaign", "Kommentarkampagne", "Yorum kampanyası"])}</dt><dd>{s.commentCampaigns.length ? s.commentCampaigns.map((c) => `${c.name || c.id.slice(0, 6)} · ${c.isActive ? tx(["فعال", "active", "aktiv", "aktif"]) : tx(["غیرفعال", "inactive", "inaktiv", "pasif"])} · ${c.linkHasUtm ? tx(["لینک ردیابی دارد", "tracked link", "Tracking-Link", "izlenen bağlantı"]) : tx(["لینک بدون UTM", "link without UTM", "Link ohne UTM", "UTM'siz bağlantı"])} · ${tx(["کلیک", "clicks", "Klicks", "tıklama"])} ${n(c.linkClicks)}`).join(" | ") : tx(["ندارد", "none", "keine", "yok"])}</dd>
        <dt>{tx(["رکورد کمپین رشد", "Growth campaign record", "Growth-Kampagnendatensatz", "Büyüme kampanyası kaydı"])}</dt><dd>{s.growthCampaign ? s.growthCampaign.status : <Button disabled={busy} onClick={() => void ensure()}>{tx(["ساخت رکورد (پیش‌نویس، چیزی ارسال نمی‌شود)", "Create record (draft, sends nothing)", "Datensatz anlegen (Entwurf, sendet nichts)", "Kayıt oluştur (taslak, gönderim yok)"])}</Button>}</dd>
      </dl>
      <Bars max={Math.max(1, ...steps.map(([, v]) => v ?? 0))} rows={steps.map(([l, v]) => [tx(l), v ?? 0, v == null ? <Missing /> : null])} />
      <p className="fine-print">{tx([`درآمد خریداران بعد از اولین کلیک: ${n(f.revenueToman)} تومان. شمارش لایو فقط از مدت تماس است؛ متن گفتگوها خوانده نمی‌شود. این صفحه چیزی در اینستاگرام منتشر یا ارسال نمی‌کند.`, `Revenue from buyers after their first click: ${n(f.revenueToman)} Toman. Live counts come from call length only; conversation text is never read. This page never posts or sends on Instagram.`, `Umsatz der Käufer nach dem ersten Klick: ${n(f.revenueToman)} Toman. Live-Zahlen nur aus Anrufdauer; Gesprächstexte werden nie gelesen. Diese Seite postet oder sendet nichts auf Instagram.`, `İlk tıklamadan sonra alıcı geliri: ${n(f.revenueToman)} Tümen. Canlı sayımlar yalnızca görüşme süresinden; konuşma metni okunmaz. Bu sayfa Instagram'da hiçbir şey yayınlamaz veya göndermez.`])}</p>
    </details>
  );
}

function CampaignReportCard({ campaigns }: { campaigns: { key: string; name: string | null }[] }) {
  const { tx } = useG();
  const [to, setTo] = useState(() => iso(new Date()));
  const [from, setFrom] = useState(() => daysAgo(30));
  const [campaign, setCampaign] = useState("");
  const [busy, setBusy] = useState("");
  async function go(format: string) {
    setBusy(format);
    const e = await saveFile(new URLSearchParams({ view: "campaign-pack", format, from, to, ...(campaign ? { campaign } : {}) }).toString(), "aifekr-campaigns").catch(() => "FAILED");
    if (e) toast.error(e === "INVALID_RANGE" ? tx(["بازهٔ تاریخ نامعتبر است (حداکثر یک سال).", "Invalid date range (one year at most).", "Ungültiger Zeitraum (höchstens ein Jahr).", "Geçersiz tarih aralığı (en fazla bir yıl)."]) : e);
    setBusy("");
  }
  return (
    <details className="panel">
      <summary><Icon name="FileText" size={16} /> {tx(["گزارش کامل کمپین‌ها (برای تحلیل با هوش مصنوعی)", "Complete campaign report (for AI analysis)", "Vollständiger Kampagnenbericht (für KI-Analyse)", "Tam kampanya raporu (yapay zekâ analizi için)"])}</summary>
      <p className="fine-print">{tx(["قیف کامل با نرخ‌ها، منبع و UTM، استفاده از ماژول‌ها، زمان تا اولین نتیجه و خرید، درآمد از پرداخت‌های واقعی و ارسال‌های پیگیری. فقط آمار تجمیعی است؛ هیچ نام، ایمیل، موبایل یا متن گفتگویی در فایل نیست.", "Full funnel with rates, source/UTM, module usage, time to first value and purchase, revenue from real payments and follow-ups. Aggregates only: no names, emails, phones or conversation text.", "Vollständiger Trichter mit Raten, Quelle/UTM, Modulnutzung, Zeit bis Nutzen und Kauf, Umsatz aus echten Zahlungen und Follow-ups. Nur Aggregate: keine Namen, E-Mails, Telefonnummern oder Gesprächstexte.", "Oranlar, kaynak/UTM, modül kullanımı, ilk değere ve satın almaya kadar süre, gerçek ödemelerden gelir ve takiplerle tam huni. Yalnızca toplu veriler: ad, e-posta, telefon veya konuşma metni yok."])}</p>
      <div className="domain-toolbar">
        <label>{tx(["از", "From", "Von", "Başlangıç"])}<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>{tx(["تا", "To", "Bis", "Bitiş"])}<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
        <select aria-label={tx(["کمپین", "Campaign", "Kampagne", "Kampanya"])} value={campaign} onChange={(e) => setCampaign(e.target.value)}><option value="">{tx(["همهٔ کمپین‌ها", "All campaigns", "Alle Kampagnen", "Tüm kampanyalar"])}</option>{campaigns.map((c) => <option key={c.key} value={c.key}>{c.name ? c.name + " (" + c.key + ")" : c.key}</option>)}</select>
      </div>
      <div className="domain-actions">
        <Button variant="primary" disabled={!!busy} onClick={() => void go("md")}><Icon name="Download" size={14} />{tx(["بستهٔ تحلیل AI (Markdown)", "AI analysis pack (Markdown)", "KI-Analysepaket (Markdown)", "Yapay zekâ analiz paketi (Markdown)"])}</Button>
        <Button disabled={!!busy} onClick={() => void go("json")}><Icon name="Download" size={14} />JSON</Button>
        <Button disabled={!!busy} onClick={() => void go("csv")}><Icon name="Download" size={14} />{tx(["CSV خلاصه", "Summary CSV", "Zusammenfassung CSV", "Özet CSV"])}</Button>
        <Button disabled={!!busy} onClick={() => void go("csv-daily")}><Icon name="Download" size={14} />{tx(["CSV روزانه", "Daily CSV", "Tägliche CSV", "Günlük CSV"])}</Button>
      </div>
    </details>
  );
}

type Template = { titleFa: string; bodyFa: string; titleEn: string; bodyEn: string };
type Messaging = { minHoursBetween: number; maxPer14Days: number; quietStartHour: number; quietEndHour: number; enabledRules: string[]; templates: Record<string, Template> };
type GrowthSettings = { flags: Record<string, boolean>; thresholds: Record<string, number>; weights: Record<string, number>; messaging: Messaging };
type AutomationsData = {
  disabled?: boolean;
  preview: { quiet: boolean; results: { key: string; eligible: number; wouldSend: number; suppressed: Record<string, number>; sample: { userId: string; name: string | null; channel: string; title: string }[] }[] };
  rules: { key: string; kind: string; name: Two; when: Two; template: Template; customised: boolean }[];
  variables: string[]; messaging: Messaging; history: { ruleKey: string; status: string; _count: { _all: number } }[];
  engine?: { enabled: boolean; mode: string; blockers: string[]; caps: { per24h: number; per7d: number } };
};

function Automations() {
  const { n, i, tx, two } = useG();
  const { data, error, loading, reload } = useData<AutomationsData>(GROWTH, "view=automations");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);
  if (error) return <Problem error={error} />;
  if (data?.disabled) return <Disabled />;
  if (!data) return <section className="panel" aria-busy={loading} />;
  async function saveMessaging(next: Messaging) {
    setBusy(true);
    try {
      const current = await fetch(GROWTH + "?view=settings", { cache: "no-store", credentials: "include" }).then((r) => r.json());
      if (!current.settings) throw Error("FAILED");
      await post(GROWTH, { action: "saveSettings", settings: { ...current.settings, messaging: next } });
      toast.success(tx(["ذخیره شد", "Saved", "Gespeichert", "Kaydedildi"])); setEditing(null); reload();
    } catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(false); }
  }
  const live = !!data.engine && data.engine.blockers.length === 0;
  return (
    <>
      <p className={"admin-note" + (live ? " live" : "")} role="status">{live
        ? tx(["ارسال واقعی روشن است: قواعدِ فعال در اجرای زمان‌بندی‌شده پیام می‌فرستند.", "Live sending is ON: enabled rules send messages on the scheduled run.", "Echtes Senden ist AN: aktive Regeln senden beim geplanten Lauf.", "Gerçek gönderim AÇIK: etkin kurallar planlı çalıştırmada mesaj gönderir."])
        : tx(["حالت آزمایشی: هیچ پیامی ارسال نمی‌شود و آمار زیر فقط پیش‌نمایش است. ارسال واقعی فقط وقتی ممکن است که مدیر ارشد سوییچ‌های ارسال را در تنظیمات روشن کند، قاعده را فعال کند و موتور پیگیری را با یک کانال روی حالت واقعی بگذارد.", "Dry-run: nothing is sent and the numbers below are a preview only. Real sending needs a super admin to turn on the sending flags in Settings, enable the rule, and switch the follow-up engine to live with a channel on.", "Testmodus: nichts wird gesendet, die Zahlen sind nur eine Vorschau. Echtes Senden erfordert, dass ein Super-Admin die Sende-Schalter einschaltet, die Regel aktiviert und die Engine mit einem Kanal auf live stellt.", "Deneme modu: hiçbir şey gönderilmez, aşağıdaki sayılar yalnızca önizlemedir. Gerçek gönderim için süper yöneticinin gönderim anahtarlarını açması, kuralı etkinleştirmesi ve motoru bir kanalla canlıya alması gerekir."])}
        {data.preview.quiet && " " + tx(["(الان ساعت سکوت تهران است.)", "(Tehran quiet hours right now.)", "(Gerade Ruhezeit in Teheran.)", "(Şu an Tahran sessiz saatleri.)"])}</p>
      <p className="fine-print">{tx([`پیش‌نمایش با سقف قدیمی (${data.messaging.minHoursBetween} ساعت، ${data.messaging.maxPer14Days} پیام در ۱۴ روز) حساب می‌شود. ارسال واقعی فقط از موتور پیگیری است با سقف ${data.engine?.caps.per24h ?? 1} پیام در ۲۴ ساعت و ${data.engine?.caps.per7d ?? 3} پیام در ۷ روز. ایمیل فقط با رضایت صریح؛ قواعد تبلیغاتی به مشتری پولی نمی‌رسند.`, `The preview uses the legacy caps (${data.messaging.minHoursBetween}h, ${data.messaging.maxPer14Days} per 14 days). Real sends come only from the follow-up engine, capped at ${data.engine?.caps.per24h ?? 1} per 24 hours and ${data.engine?.caps.per7d ?? 3} per 7 days. Email only with explicit consent; promotional rules never reach paying customers.`, `Die Vorschau nutzt die alten Limits (${data.messaging.minHoursBetween} h, ${data.messaging.maxPer14Days} pro 14 Tage). Echtes Senden nur über die Engine, max. ${data.engine?.caps.per24h ?? 1} pro 24 h und ${data.engine?.caps.per7d ?? 3} pro 7 Tage. E-Mail nur mit Einwilligung; Werberegeln erreichen keine zahlenden Kunden.`, `Önizleme eski sınırları kullanır (${data.messaging.minHoursBetween} sa, 14 günde ${data.messaging.maxPer14Days}). Gerçek gönderim yalnızca takip motorundan, 24 saatte ${data.engine?.caps.per24h ?? 1} ve 7 günde ${data.engine?.caps.per7d ?? 3} sınırıyla. E-posta yalnızca açık izinle; tanıtım kuralları ödeyen müşterilere ulaşmaz.`])}</p>
      <div className="gc-rules">
        {data.rules.map((rule) => {
          const r = data.preview.results.find((x) => x.key === rule.key);
          const enabled = data.messaging.enabledRules.includes(rule.key);
          const sent = data.history.filter((h) => h.ruleKey === rule.key && h.status === "sent").reduce((s, h) => s + h._count._all, 0);
          return (
            <section className="panel gc-rule" key={rule.key}>
              <div className="row-between">
                <div>
                  <h3>{two(rule.name, rule.key)} <span className="badge">{rule.kind === "promotional" ? tx(["تبلیغاتی", "promotional", "werblich", "tanıtım"]) : tx(["راهنما", "guidance", "Hilfe", "rehber"])}</span>{rule.customised && <span className="badge orange">{tx(["متن سفارشی", "custom text", "eigener Text", "özel metin"])}</span>}</h3>
                  <p className="fine-print">{two(rule.when)}</p>
                </div>
                <label className="gc-switch"><input type="checkbox" checked={enabled} disabled={busy} onChange={(e) => void saveMessaging({ ...data.messaging, enabledRules: e.target.checked ? [...data.messaging.enabledRules, rule.key] : data.messaging.enabledRules.filter((k) => k !== rule.key) })} />{enabled ? tx(["فعال", "Enabled", "Aktiv", "Etkin"]) : tx(["خاموش", "Off", "Aus", "Kapalı"])}</label>
              </div>
              <div className="gc-figures">
                <span>{tx(["واجد شرایط الان", "Eligible now", "Jetzt berechtigt", "Şu an uygun"])}: <b>{n(r?.eligible ?? 0)}</b></span>
                <span>{tx(["دریافت می‌کردند", "Would receive", "Würden erhalten", "Alacaktı"])}: <b>{n(r?.wouldSend ?? 0)}</b></span>
                {Object.entries(r?.suppressed ?? {}).map(([k, v]) => <span key={k}>{lbl(REASONS, k, i)}: <b>{n(v)}</b></span>)}
                <span>{tx(["ارسال‌شده تاکنون", "Sent so far", "Bisher gesendet", "Şimdiye kadar gönderilen"])}: <b>{n(sent)}</b></span>
              </div>
              {!!r?.sample.length && <details><summary className="fine-print">{tx(["نمونهٔ دریافت‌کنندگان (پیش‌نمایش)", "Sample recipients (preview)", "Beispielempfänger (Vorschau)", "Örnek alıcılar (önizleme)"])}</summary><ul className="fine-print">{r.sample.map((s) => <li key={s.userId}>{s.name || s.userId} · {s.channel} · “{s.title}”</li>)}</ul></details>}
              {editing === rule.key && draft ? (
                <form className="domain-fields" onSubmit={(e) => { e.preventDefault(); void saveMessaging({ ...data.messaging, templates: { ...data.messaging.templates, [rule.key]: draft } }); }}>
                  <p className="span-2 fine-print">{tx(["متغیرهای مجاز", "Allowed variables", "Erlaubte Variablen", "İzin verilen değişkenler"])}: <bdi dir="ltr">{data.variables.map((v) => "{{" + v + "}}").join(" ")}</bdi></p>
                  <label>{tx(["عنوان فارسی", "Persian title", "Persischer Titel", "Farsça başlık"])}<input dir="rtl" value={draft.titleFa} onChange={(e) => setDraft({ ...draft, titleFa: e.target.value })} /></label>
                  <label>{tx(["عنوان انگلیسی", "English title", "Englischer Titel", "İngilizce başlık"])}<input dir="ltr" value={draft.titleEn} onChange={(e) => setDraft({ ...draft, titleEn: e.target.value })} /></label>
                  <label>{tx(["متن فارسی", "Persian text", "Persischer Text", "Farsça metin"])}<textarea dir="rtl" value={draft.bodyFa} onChange={(e) => setDraft({ ...draft, bodyFa: e.target.value })} /></label>
                  <label>{tx(["متن انگلیسی", "English text", "Englischer Text", "İngilizce metin"])}<textarea dir="ltr" value={draft.bodyEn} onChange={(e) => setDraft({ ...draft, bodyEn: e.target.value })} /></label>
                  <div className="span-2 domain-actions">
                    <Button type="submit" variant="primary" disabled={busy}>{tx(["ذخیرهٔ متن", "Save text", "Text speichern", "Metni kaydet"])}</Button>
                    {rule.customised && <Button disabled={busy} onClick={() => { const rest = { ...data.messaging.templates }; delete rest[rule.key]; void saveMessaging({ ...data.messaging, templates: rest }); }}>{tx(["بازگشت به متن پیش‌فرض", "Reset to default", "Auf Standard zurücksetzen", "Varsayılana dön"])}</Button>}
                    <Button onClick={() => setEditing(null)}>{tx(["انصراف", "Cancel", "Abbrechen", "İptal"])}</Button>
                  </div>
                </form>
              ) : (
                <div className="gc-template">
                  <p><b>{i === 0 ? rule.template.titleFa : rule.template.titleEn}</b> — {i === 0 ? rule.template.bodyFa : rule.template.bodyEn}</p>
                  <Button onClick={() => { setEditing(rule.key); setDraft(rule.template); }}><Icon name="Pencil" size={14} />{tx(["ویرایش متن", "Edit text", "Text bearbeiten", "Metni düzenle"])}</Button>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

type FollowupSettings = {
  engine_enabled: boolean; mode: "dry_run" | "live"; channels: Record<string, boolean>; caps: { per24h: number; per7d: number }; retry: { maxAttempts: number } & Record<string, unknown>;
  expireHours: number; holdoutPercent: number; conversionWindowDays: number; live_campaign_enabled: boolean; ruleModes: Record<string, string>; testUserIds: string[];
} & Record<string, unknown>;
type EngineData = {
  settings: FollowupSettings; planningMode: "dry_run" | "live" | null; liveBlockers: string[]; quietHours: { start: number; end: number };
  rules: { key: string; name: Two; when: Two; enabledInAutomations: boolean }[]; channels: Record<string, { available: boolean; needs?: string }>;
  counts: { mode: string; status: string; n: number }[]; due: number; lastProcessedAt: string | null;
};
const RULE_MODES: Record<string, Tx> = { off: ["خاموش", "Off", "Aus", "Kapalı"], dry_run: ["آزمایشی (فقط ثبت)", "Dry run", "Testlauf", "Deneme"], internal_test: ["تست داخلی", "Internal test", "Interner Test", "Dahili test"], live: ["واقعی", "Live", "Live", "Canlı"] };

function Engine() {
  const { n, i, tx, two, date } = useG();
  const { data, error, loading, reload } = useData<EngineData>(FOLLOWUP, "view=engine");
  const [draft, setDraft] = useState<FollowupSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<null | { title: string; body: React.ReactNode; action: string; run: () => void }>(null);
  if (error) return <Problem error={error} />;
  if (!data) return <section className="panel" aria-busy={loading} />;
  const s = draft ?? data.settings;
  const set = (next: Partial<FollowupSettings>) => setDraft({ ...s, ...next });
  const live = data.planningMode === "live";
  async function act(body: Record<string, unknown>, ok: string) {
    setBusy(true); setAsk(null);
    try {
      const r = await post(FOLLOWUP, body);
      toast.success(ok + (r.plan ? " · " + tx(["برنامه‌ریزی", "planned", "geplant", "planlanan"]) + ": " + r.plan.planned + " · " + tx(["پردازش", "processed", "verarbeitet", "işlenen"]) + ": " + r.processed.claimed : r.cancelled != null ? " · " + r.cancelled : ""));
      setDraft(null); reload();
    } catch (e) { toast.error(e instanceof Error && e.message === "SUPER_ADMIN_REQUIRED" ? tx(["این تغییر فقط با نقش مدیر ارشد ممکن است.", "Only a super admin can make this change.", "Nur ein Super-Admin kann das ändern.", "Bu değişikliği yalnızca süper yönetici yapabilir."]) : e instanceof Error ? e.message : "FAILED"); }
    finally { setBusy(false); }
  }
  // Changes that can make the engine message real users.
  const riskier = (() => {
    if (!draft) return [] as string[];
    const before = data.settings, out: string[] = [];
    if (draft.engine_enabled && !before.engine_enabled) out.push(tx(["روشن‌کردن موتور", "turning the engine on", "Engine einschalten", "motoru açma"]));
    if (draft.mode === "live" && before.mode !== "live") out.push(tx(["حالت واقعی (ارسال)", "live (sending) mode", "Live-Modus (Senden)", "canlı (gönderim) modu"]));
    for (const c of Object.keys(draft.channels)) if (draft.channels[c] && !before.channels[c]) out.push(lbl(CHANNELS, c, i));
    if (draft.live_campaign_enabled && !before.live_campaign_enabled) out.push(tx(["پیام‌های پیگیری کمپین لایو", "Live campaign follow-ups", "Live-Kampagnen-Folgenachrichten", "Canlı kampanya takipleri"]));
    for (const k of Object.keys(draft.ruleModes)) if (["live", "internal_test"].includes(draft.ruleModes[k]) && before.ruleModes[k] !== draft.ruleModes[k]) out.push(two(data.rules.find((r) => r.key === k)?.name, k) + " → " + lbl(RULE_MODES, draft.ruleModes[k], i));
    return out;
  })();
  function save() {
    const run = () => void act({ action: "saveSettings", settings: s }, tx(["ذخیره شد", "Saved", "Gespeichert", "Kaydedildi"]));
    if (!riskier.length) return run();
    setAsk({ title: tx(["تأیید تغییرات ارسال", "Confirm sending changes", "Sendeänderungen bestätigen", "Gönderim değişikliklerini onayla"]), body: <><p>{tx(["این تغییرات ممکن است باعث ارسال پیام واقعی به کاربران شوند:", "These changes can make the engine message real users:", "Diese Änderungen können echte Nachrichten an Nutzer auslösen:", "Bu değişiklikler kullanıcılara gerçek mesaj gönderilmesine yol açabilir:"])}</p><ul>{riskier.map((x) => <li key={x}>{x}</li>)}</ul></>, action: tx(["بله، ذخیره کن", "Yes, save", "Ja, speichern", "Evet, kaydet"]), run });
  }
  function runNow() {
    const run = () => void act({ action: "runNow" }, live ? tx(["اجرا شد (واقعی)", "Ran (live)", "Ausgeführt (live)", "Çalıştı (canlı)"]) : tx(["اجرای آزمایشی انجام شد", "Dry run done", "Testlauf erledigt", "Deneme tamamlandı"]));
    if (!live) return run();
    setAsk({ title: tx(["اجرای واقعی", "Live run", "Live-Lauf", "Canlı çalıştırma"]), body: <p>{tx(["این اجرا واقعاً به کاربرانِ واجد شرایط پیام می‌فرستد.", "This run really sends messages to eligible users.", "Dieser Lauf sendet wirklich Nachrichten an berechtigte Nutzer.", "Bu çalıştırma uygun kullanıcılara gerçekten mesaj gönderir."])}</p>, action: tx(["بله، اجرا کن", "Yes, run it", "Ja, ausführen", "Evet, çalıştır"]), run });
  }
  const totals = Object.entries(data.counts.reduce<Record<string, number>>((m, c) => { const k = c.mode + ":" + c.status; m[k] = (m[k] ?? 0) + c.n; return m; }, {}));
  const numSet = (k: "per24h" | "per7d", v: string) => set({ caps: { ...s.caps, [k]: Math.max(1, Number(v) || 1) } });
  return (
    <>
      <p className={"admin-note" + (live ? " live" : "")} role="status">{data.planningMode === null ? tx(["موتور پیگیری خاموش است: هیچ کاری برنامه‌ریزی یا ارسال نمی‌شود.", "The follow-up engine is off: nothing is planned or sent.", "Die Follow-up-Engine ist aus: nichts wird geplant oder gesendet.", "Takip motoru kapalı: hiçbir şey planlanmaz veya gönderilmez."])
        : live ? tx(["ارسال واقعی روشن است: قواعد فعال، با سقف‌ها و ساعت سکوت، به کاربران پیام می‌فرستند.", "Live sending is ON: enabled rules message users, within caps and quiet hours.", "Echtes Senden ist AN: aktive Regeln senden innerhalb der Limits und Ruhezeiten.", "Gerçek gönderim AÇIK: etkin kurallar sınırlar ve sessiz saatler içinde mesaj gönderir."])
        : tx(["حالت آزمایشی: موتور فقط ثبت می‌کند چه پیامی به چه کسی ارسال می‌شد. هیچ پیامی ارسال نمی‌شود.", "Dry-run mode: the engine only records what it would send to whom. Nothing is sent.", "Testmodus: die Engine protokolliert nur, was sie wem senden würde. Nichts wird gesendet.", "Deneme modu: motor yalnızca kime ne gönderileceğini kaydeder. Hiçbir şey gönderilmez."])}</p>
      {!!data.liveBlockers.length && <section className="panel">
        <h3>{tx(["چه چیزی جلوی ارسال واقعی را گرفته", "What blocks real sending", "Was echtes Senden blockiert", "Gerçek gönderimi engelleyenler"])}</h3>
        <ul className="fine-print">{data.liveBlockers.map((b) => <li key={b}>{lbl(REASONS, b, i)}</li>)}</ul>
        <p className="fine-print">{tx(["ارسال واقعی فقط وقتی ممکن است که همهٔ این موارد را مدیر ارشد آگاهانه روشن کند.", "Real sending is possible only after a super admin deliberately clears every item.", "Echtes Senden ist erst möglich, wenn ein Super-Admin alle Punkte bewusst freigibt.", "Gerçek gönderim, süper yönetici tüm maddeleri bilinçli olarak kaldırınca mümkündür."])}</p>
      </section>}
      <div className="gc-two">
        <section className="panel">
          <h3>{tx(["صف و نتیجه‌ها", "Queue and outcomes", "Warteschlange und Ergebnisse", "Kuyruk ve sonuçlar"])}</h3>
          <dl className="domain-detail">
            <dt>{tx(["آمادهٔ پردازش", "Due now", "Jetzt fällig", "Şimdi bekleyen"])}</dt><dd>{n(data.due)}</dd>
            <dt>{tx(["آخرین پردازش", "Last processed", "Zuletzt verarbeitet", "Son işlem"])}</dt><dd>{date(data.lastProcessedAt)}</dd>
            {totals.map(([k, v]) => { const [mode, status] = k.split(":"); return <Fragment key={k}><dt>{lbl(JOB_STATUS, status, i)} <span className="badge">{mode === "live" ? tx(["واقعی", "live", "live", "canlı"]) : tx(["آزمایشی", "dry run", "Test", "deneme"])}</span></dt><dd>{n(v)}</dd></Fragment>; })}
          </dl>
        </section>
        <section className="panel">
          <h3>{tx(["کانال‌ها", "Channels", "Kanäle", "Kanallar"])}</h3>
          <dl className="domain-detail">{Object.entries(data.channels).map(([k, c]) => <Fragment key={k}><dt>{lbl(CHANNELS, k, i)}</dt><dd>{k === "instagram_dm" && !c.available ? tx(["برای پیگیری‌ها به کار نمی‌رود: اینستاگرام دایرکت را فقط در پاسخ به کامنت یا پیام کاربر اجازه می‌دهد. همین دایرکت در «کامنت به دایرکت» استودیوی اجتماعی کار می‌کند.", "Not used for follow-ups: Instagram allows a DM only in reply to the user's comment or message. That reply DM works in Social Studio's Comment-to-DM.", "Nicht für Folgenachrichten: Instagram erlaubt DMs nur als Antwort auf Kommentar oder Nachricht. Diese Antwort-DM läuft im Social Studio (Kommentar-zu-DM).", "Takipte kullanılmaz: Instagram DM'e yalnızca yorum veya mesaja yanıt olarak izin verir. Bu yanıt DM'i Sosyal Stüdyo'daki Yorumdan DM'e ile çalışır."]) : <>{c.available ? tx(["آماده روی سرور", "Available on the server", "Auf dem Server verfügbar", "Sunucuda hazır"]) : tx(["در دسترس نیست", "Not available", "Nicht verfügbar", "Kullanılamıyor"])}{c.needs && <small><bdi dir="ltr">{c.needs}</bdi></small>}</>}</dd></Fragment>)}</dl>
        </section>
      </div>
      <section className="panel">
        <h3>{tx(["سناریوها", "Scenarios", "Szenarien", "Senaryolar"])}</h3>
        <p className="fine-print">{tx(["«آزمایشی» فقط ثبت می‌کند چه کسی پیام می‌گرفت. «تست داخلی» واقعاً ارسال می‌کند، اما فقط به حساب‌های تست زیر. «واقعی» به همه ارسال می‌کند. تست داخلی و واقعی فقط وقتی کار می‌کنند که موتور روی حالت واقعی باشد، کانال روشن باشد و قاعده در «قواعد و متن پیام‌ها» روشن باشد.", "Dry run only records who would get a message. Internal test really sends, but only to the test accounts below. Live sends to everyone eligible. Internal test and live need the engine in live mode, a channel on, and the rule on in Rules & templates.", "Testlauf protokolliert nur. Interner Test sendet wirklich, aber nur an die Testkonten unten. Live sendet an alle Berechtigten. Beides braucht Live-Modus, einen Kanal und die aktive Regel.", "Deneme yalnızca kaydeder. Dahili test gerçekten gönderir ama yalnızca aşağıdaki test hesaplarına. Canlı herkese gönderir. İkisi de canlı mod, açık kanal ve etkin kural gerektirir."])}</p>
        <div className="table-scroll"><table className="admin-finance-table">
          <thead><tr>{([["سناریو", "Scenario", "Szenario", "Senaryo"], ["کی", "When", "Wann", "Ne zaman"], ["حالت", "Mode", "Modus", "Mod"], ["در قواعد", "In rules", "In Regeln", "Kurallarda"]] as Tx[]).map((h) => <th key={h[1]}>{tx(h)}</th>)}</tr></thead>
          <tbody>{data.rules.map((r) => <tr key={r.key}><td>{two(r.name, r.key)}</td><td><small>{two(r.when)}</small></td>
            <td><select aria-label={two(r.name, r.key)} value={s.ruleModes[r.key] ?? "off"} onChange={(e) => set({ ruleModes: { ...s.ruleModes, [r.key]: e.target.value } })}>{Object.keys(RULE_MODES).map((m) => <option key={m} value={m}>{lbl(RULE_MODES, m, i)}</option>)}</select></td>
            <td>{r.enabledInAutomations ? tx(["روشن", "on", "an", "açık"]) : tx(["خاموش", "off", "aus", "kapalı"])}</td></tr>)}</tbody>
        </table></div>
        <div className="domain-fields">
          <label className="span-2">{tx(["شناسهٔ حساب‌های تست داخلی (با کاما جدا کنید)", "Internal test account ids (comma-separated)", "Interne Testkonto-IDs (kommagetrennt)", "Dahili test hesabı kimlikleri (virgülle)"])}
            <input dir="ltr" value={s.testUserIds.join(", ")} onChange={(e) => set({ testUserIds: e.target.value.split(/[\s,،]+/).map((x) => x.trim()).filter(Boolean).slice(0, 20) })} placeholder="cmh…" />
            <small>{tx(["شناسه را از نشانی صفحهٔ هر مشتری (/admin/customer-growth/<شناسه>) بردارید.", "Take the id from a customer's page address (/admin/customer-growth/<id>).", "Die ID steht in der Adresse der Kundenseite (/admin/customer-growth/<id>).", "Kimliği müşteri sayfası adresinden alın (/admin/customer-growth/<id>)."])}</small>
          </label>
        </div>
      </section>
      <section className="panel">
        <h3>{tx(["تنظیمات موتور", "Engine settings", "Engine-Einstellungen", "Motor ayarları"])}</h3>
        <p className="fine-print">{tx(["روشن‌کردن حالت واقعی، هر کانال یا کمپین لایو فقط با نقش مدیر ارشد ممکن است و در گزارش ممیزی ثبت می‌شود.", "Turning on live mode, any channel or the Live campaign needs a super admin and is audited.", "Live-Modus, Kanäle oder die Live-Kampagne einschalten erfordert einen Super-Admin und wird protokolliert.", "Canlı modu, herhangi bir kanalı veya Canlı kampanyayı açmak süper yönetici gerektirir ve denetlenir."])}</p>
        <div className="domain-fields">
          <label className="gc-switch"><input type="checkbox" checked={s.engine_enabled} onChange={(e) => set({ engine_enabled: e.target.checked })} />{tx(["موتور روشن", "Engine on", "Engine an", "Motor açık"])}</label>
          <label>{tx(["حالت", "Mode", "Modus", "Mod"])}<select value={s.mode} onChange={(e) => set({ mode: e.target.value as FollowupSettings["mode"] })}><option value="dry_run">{tx(["آزمایشی (فقط ثبت)", "Dry run (record only)", "Testlauf (nur Protokoll)", "Deneme (yalnızca kayıt)"])}</option><option value="live">{tx(["واقعی (ارسال)", "Live (send)", "Live (senden)", "Canlı (gönder)"])}</option></select></label>
          {(["in_app", "email", "push"] as const).map((c) => <label key={c} className="gc-switch"><input type="checkbox" checked={!!s.channels[c]} onChange={(e) => set({ channels: { ...s.channels, [c]: e.target.checked } })} />{lbl(CHANNELS, c, i)}</label>)}
          <label className="gc-switch"><input type="checkbox" checked={s.live_campaign_enabled} onChange={(e) => set({ live_campaign_enabled: e.target.checked })} />{tx(["پیام‌های پیگیری برای کاربران کمپین لایو", "Follow-up messages for Live campaign users", "Folgenachrichten für Nutzer der Live-Kampagne", "Canlı kampanya kullanıcılarına takip mesajları"])}<small>{tx(["فقط پیگیری بعد از ثبت‌نام را روشن می‌کند. دایرکتِ خود کمپین را «کامنت به دایرکت» در استودیوی اجتماعی می‌فرستد و به این تیک وابسته نیست.", "Turns on post-signup follow-ups only. The campaign's own DM is sent by Comment-to-DM in Social Studio and does not depend on this switch.", "Schaltet nur Folgenachrichten nach der Registrierung ein. Die DM der Kampagne sendet Kommentar-zu-DM im Social Studio, unabhängig von diesem Schalter.", "Yalnızca kayıt sonrası takipleri açar. Kampanyanın DM'ini Sosyal Stüdyo'daki Yorumdan DM'e gönderir; bu anahtara bağlı değildir."])}</small></label>
          <label>{tx(["حداکثر پیام در ۲۴ ساعت", "Max per 24 hours", "Max. pro 24 Stunden", "24 saatte en fazla"])}<input type="number" min={1} max={5} value={s.caps.per24h} onChange={(e) => numSet("per24h", e.target.value)} /></label>
          <label>{tx(["حداکثر پیام در ۷ روز", "Max per 7 days", "Max. pro 7 Tage", "7 günde en fazla"])}<input type="number" min={1} max={20} value={s.caps.per7d} onChange={(e) => numSet("per7d", e.target.value)} /></label>
          <label>{tx(["تعداد تلاش ارسال", "Send attempts", "Sendeversuche", "Gönderim denemesi"])}<input type="number" min={1} max={10} value={s.retry.maxAttempts} onChange={(e) => set({ retry: { ...s.retry, maxAttempts: Number(e.target.value) || 1 } })} /></label>
          <label>{tx(["انقضا (ساعت)", "Expire after (hours)", "Ablauf nach (Stunden)", "Süre sonu (saat)"])}<input type="number" min={6} max={336} value={s.expireHours} onChange={(e) => set({ expireHours: Number(e.target.value) || 72 })} /></label>
          <label>{tx(["گروه کنترل (٪)", "Holdout (%)", "Kontrollgruppe (%)", "Kontrol grubu (%)"])}<input type="number" min={0} max={50} value={s.holdoutPercent} onChange={(e) => set({ holdoutPercent: Math.min(50, Math.max(0, Number(e.target.value) || 0)) })} /></label>
          <label>{tx(["پنجرهٔ تبدیل (روز)", "Conversion window (days)", "Conversion-Fenster (Tage)", "Dönüşüm penceresi (gün)"])}<input type="number" min={1} max={60} value={s.conversionWindowDays} onChange={(e) => set({ conversionWindowDays: Number(e.target.value) || 7 })} /></label>
        </div>
        <p className="fine-print">{tx([`ساعت سکوت تهران: ${data.quietHours.start} تا ${data.quietHours.end} (در تنظیمات رشد). پیام‌های این بازه به بعد از آن منتقل می‌شوند.`, `Tehran quiet hours: ${data.quietHours.start}–${data.quietHours.end} (in Growth settings). Messages due then wait until it ends.`, `Ruhezeit Teheran: ${data.quietHours.start}–${data.quietHours.end} (in den Growth-Einstellungen). Fällige Nachrichten warten bis danach.`, `Tahran sessiz saatleri: ${data.quietHours.start}–${data.quietHours.end} (Büyüme ayarlarında). Bu aralıktaki mesajlar sonrasına kalır.`])}</p>
        <div className="domain-actions">
          <Button variant="primary" disabled={busy || !draft} onClick={save}>{tx(["ذخیرهٔ تنظیمات", "Save settings", "Einstellungen speichern", "Ayarları kaydet"])}</Button>
          {draft && <Button disabled={busy} onClick={() => setDraft(null)}>{tx(["لغو تغییرات", "Discard", "Verwerfen", "Vazgeç"])}</Button>}
          <Button disabled={busy || !data.settings.engine_enabled || !!draft} onClick={runNow}>{live ? tx(["اجرای الان (ارسال واقعی)", "Run now (sends for real)", "Jetzt ausführen (sendet wirklich)", "Şimdi çalıştır (gerçekten gönderir)"]) : tx(["اجرای آزمایشی الان", "Run a dry run now", "Jetzt Testlauf", "Şimdi deneme çalıştır"])}</Button>
          <Button variant="danger" disabled={busy} onClick={() => setAsk({ title: tx(["لغو صف", "Cancel queue", "Warteschlange leeren", "Kuyruğu iptal et"]), body: <p>{tx(["همهٔ کارهای در صف لغو شوند؟", "Cancel every queued job?", "Alle wartenden Aufträge abbrechen?", "Kuyruktaki tüm işler iptal edilsin mi?"])}</p>, action: tx(["بله، لغو کن", "Yes, cancel", "Ja, abbrechen", "Evet, iptal et"]), run: () => void act({ action: "cancelQueued" }, tx(["لغو شد", "Cancelled", "Abgebrochen", "İptal edildi"])) })}>{tx(["لغو همهٔ کارهای در صف", "Cancel all queued", "Alle wartenden abbrechen", "Tüm kuyruğu iptal et"])}</Button>
        </div>
      </section>
      {ask && <Confirm title={ask.title} body={ask.body} action={ask.action} onYes={ask.run} onClose={() => setAsk(null)} />}
    </>
  );
}

type Arm = { n: number; converted: number; returnRate: number | null; conversionRate: number | null };
type AnalyticsData = { windowDays: number; rules: { key: string; name: Two; sent: Arm; holdout: Arm; dryRun: Arm; suppressed: Record<string, number>; liftPoints: number | null }[] };
function Analytics() {
  const { n, i, tx, two } = useG();
  const [to, setTo] = useState(() => iso(new Date()));
  const [from, setFrom] = useState(() => daysAgo(30));
  const { data, error, loading } = useData<AnalyticsData>(FOLLOWUP, `view=analytics&from=${from}&to=${to}`);
  const pct = (v: number | null) => (v == null ? <Missing /> : n(v) + "%");
  return (
    <>
      <div className="domain-toolbar">
        <label>{tx(["از", "From", "Von", "Başlangıç"])}<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>{tx(["تا", "To", "Bis", "Bitiş"])}<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      {data && <p className="fine-print">{tx([`تبدیل = پرداخت موفق تا ${data.windowDays} روز بعد از پیام (یا بعد از تصمیم گروه کنترل). بازگشت = هر استفاده از کردیت در همان بازه. «اثر» فقط وقتی نمایش داده می‌شود که هر دو گروه حداقل ۳۰ نفر باشند؛ اجرای آزمایشی چیزی ارسال نکرده و فقط برای مقایسه است.`, `Conversion = a successful payment within ${data.windowDays} days after the message (or the holdout decision). Return = any credit use in that window. Lift shows only when both groups have at least 30 users; dry runs sent nothing and are for comparison only.`, `Conversion = erfolgreiche Zahlung bis ${data.windowDays} Tage nach der Nachricht (oder Kontrollentscheidung). Rückkehr = jede Credit-Nutzung im Fenster. Effekt nur bei mindestens 30 Nutzern je Gruppe; Testläufe sendeten nichts.`, `Dönüşüm = mesajdan (veya kontrol kararından) sonraki ${data.windowDays} gün içinde başarılı ödeme. Geri dönüş = bu aralıkta kredi kullanımı. Etki yalnızca iki grup da en az 30 kişiyse gösterilir; denemeler hiçbir şey göndermedi.`])}</p>}
      <Problem error={error} />
      <section className="panel" aria-busy={loading}>
        {data?.rules.length ? <div className="table-scroll"><table className="admin-finance-table">
          <thead><tr>{([["قاعده", "Rule", "Regel", "Kural"], ["ارسال‌شده", "Sent", "Gesendet", "Gönderilen"], ["تبدیل", "Converted", "Konvertiert", "Dönüşen"], ["بازگشت", "Returned", "Zurückgekehrt", "Dönen"], ["گروه کنترل", "Holdout", "Kontrollgruppe", "Kontrol grubu"], ["تبدیل کنترل", "Holdout conv.", "Kontroll-Conv.", "Kontrol dönüşümü"], ["اثر (واحد درصد)", "Lift (pts)", "Effekt (Pkt.)", "Etki (puan)"], ["آزمایشی", "Dry runs", "Testläufe", "Denemeler"], ["متوقف/ناموفق", "Suppressed/failed", "Unterdrückt/fehlgeschlagen", "Durdurulan/başarısız"]] as Tx[]).map((h) => <th key={h[1]}>{tx(h)}</th>)}</tr></thead>
          <tbody>{data.rules.map((r) => <tr key={r.key}>
            <td>{two(r.name, r.key)}</td><td>{n(r.sent.n)}</td><td>{n(r.sent.converted)} · {pct(r.sent.conversionRate)}</td><td>{pct(r.sent.returnRate)}</td>
            <td>{n(r.holdout.n)}</td><td>{pct(r.holdout.conversionRate)}</td><td>{r.liftPoints == null ? <Missing /> : n(r.liftPoints)}</td><td>{n(r.dryRun.n)}</td>
            <td><small>{Object.entries(r.suppressed).map(([k, v]) => { const [st, reason] = k.split(":"); return lbl(JOB_STATUS, st, i) + " – " + lbl(REASONS, reason === "-" ? null : reason, i) + ": " + n(v); }).join(" · ") || "—"}</small></td>
          </tr>)}</tbody>
        </table></div> : !loading && <Empty />}
      </section>
    </>
  );
}

type JobsData = { total: number; page: number; size: number; rows: { id: string; userId: string; userName: string | null; ruleKey: string; channel: string; mode: string; status: string; reason: string | null; variant: string; attempts: number; lastError: string | null; nextAttemptAt: string; processedAt: string | null; createdAt: string }[] };
function Logs() {
  const { n, i, tx, date } = useG();
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState("");
  const [rule, setRule] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading } = useData<JobsData>(FOLLOWUP, new URLSearchParams({ view: "jobs", status, mode, rule, page: String(page) }).toString());
  return (
    <>
      <div className="domain-toolbar">
        <select aria-label={tx(["وضعیت", "Status", "Status", "Durum"])} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">{tx(["همهٔ وضعیت‌ها", "All statuses", "Alle Status", "Tüm durumlar"])}</option>{Object.keys(JOB_STATUS).map((k) => <option key={k} value={k}>{lbl(JOB_STATUS, k, i)}</option>)}</select>
        <select aria-label={tx(["حالت", "Mode", "Modus", "Mod"])} value={mode} onChange={(e) => { setMode(e.target.value); setPage(1); }}><option value="">{tx(["همهٔ حالت‌ها", "All modes", "Alle Modi", "Tüm modlar"])}</option><option value="dry_run">{tx(["آزمایشی", "Dry run", "Testlauf", "Deneme"])}</option><option value="live">{tx(["واقعی", "Live", "Live", "Canlı"])}</option></select>
        <input aria-label={tx(["قاعده", "Rule", "Regel", "Kural"])} dir="ltr" value={rule} placeholder="welcome" onChange={(e) => { setRule(e.target.value.trim()); setPage(1); }} />
      </div>
      <Problem error={error} />
      <section className="panel" aria-busy={loading}>
        {data?.rows.length ? <div className="table-scroll"><table className="admin-finance-table">
          <thead><tr>{([["زمان", "When", "Wann", "Ne zaman"], ["کاربر", "User", "Benutzer", "Kullanıcı"], ["قاعده", "Rule", "Regel", "Kural"], ["کانال", "Channel", "Kanal", "Kanal"], ["حالت", "Mode", "Modus", "Mod"], ["وضعیت", "Status", "Status", "Durum"], ["دلیل", "Reason", "Grund", "Neden"], ["تلاش", "Attempts", "Versuche", "Deneme"]] as Tx[]).map((h) => <th key={h[1]}>{tx(h)}</th>)}</tr></thead>
          <tbody>{data.rows.map((r) => <tr key={r.id}>
            <td>{date(r.processedAt ?? r.createdAt)}</td>
            <td><Link href={"/admin/customer-growth/" + encodeURIComponent(r.userId)}>{r.userName || r.userId.slice(0, 8)}</Link></td>
            <td><bdi dir="ltr">{r.ruleKey}</bdi>{r.variant === "holdout" && <span className="badge">{tx(["کنترل", "holdout", "Kontrolle", "kontrol"])}</span>}</td>
            <td>{lbl(CHANNELS, r.channel, i)}</td><td>{r.mode === "live" ? tx(["واقعی", "live", "live", "canlı"]) : tx(["آزمایشی", "dry run", "Test", "deneme"])}</td>
            <td>{lbl(JOB_STATUS, r.status, i)}</td>
            <td title={r.lastError ?? undefined}>{lbl(REASONS, r.reason, i)}{r.status === "queued" && <small>{date(r.nextAttemptAt)}</small>}</td>
            <td>{n(r.attempts)}</td>
          </tr>)}</tbody>
        </table></div> : !loading && <p className="fine-print">{tx(["هنوز هیچ پیگیری‌ای ثبت نشده است. وقتی موتور روشن شود (حتی در حالت آزمایشی)، کارها اینجا دیده می‌شوند.", "No follow-ups recorded yet. Once the engine is on (even in dry-run mode), jobs appear here.", "Noch keine Follow-ups. Sobald die Engine läuft (auch im Testmodus), erscheinen sie hier.", "Henüz takip kaydı yok. Motor açılınca (deneme modunda bile) işler burada görünür."])}</p>}
        {data && <Pager page={page} size={data.size} total={data.total} onPage={setPage} />}
      </section>
    </>
  );
}

const FLAGS: Record<string, [Tx, Tx]> = {
  customer_growth_enabled: [["مرکز رشد مشتری", "Customer Growth Center", "Growth Center", "Büyüme merkezi"], ["داشبورد و API مدیریت", "Admin dashboard and API", "Admin-Dashboard und API", "Yönetim paneli ve API"]],
  customer_event_tracking_enabled: [["ثبت رویدادها و منبع ورود", "Event & attribution tracking", "Ereignis- & Quellen-Tracking", "Olay ve kaynak izleme"], ["UTM، ارجاع، بازدید قیمت و رویدادهای ماژول", "UTM, referrers, pricing views and module events", "UTM, Verweise, Preisaufrufe und Modulereignisse", "UTM, yönlendirenler, fiyat görüntüleme ve modül olayları"]],
  smart_onboarding_enabled: [["آشنایی هوشمند", "Smart onboarding", "Smartes Onboarding", "Akıllı tanışma"], ["پرسش‌های کوتاه و بازگشت مستقیم به ماژول کمپین", "Short questions and direct return to the campaign module", "Kurze Fragen und direkte Rückkehr zum Kampagnenmodul", "Kısa sorular ve kampanya modülüne doğrudan dönüş"]],
  lead_scoring_enabled: [["امتیازدهی مشتری", "Lead scoring", "Lead-Scoring", "Müşteri puanlama"], ["امتیاز قابل توضیح در جدول مشتریان", "Explainable score in the customer table", "Erklärbare Punktzahl in der Kundentabelle", "Müşteri tablosunda açıklanabilir puan"]],
  personalized_upgrade_enabled: [["پیشنهاد پلن در ماژول", "In-module plan suggestion", "Tarifvorschlag im Modul", "Modül içi plan önerisi"], ["فقط از جدول پکیج‌های واقعی", "Only from the real package table", "Nur aus der echten Pakettabelle", "Yalnızca gerçek paket tablosundan"]],
  lifecycle_automation_enabled: [["اتوماسیون چرخهٔ عمر", "Lifecycle automation", "Lebenszyklus-Automatisierung", "Yaşam döngüsü otomasyonu"], ["اجرای زمان‌بندی‌شدهٔ قواعد (فقط مدیر ارشد)", "Scheduled rule runs (super admin only)", "Geplante Regelläufe (nur Super-Admin)", "Planlı kural çalıştırma (yalnızca süper yönetici)"]],
  automated_communications_enabled: [["ارسال خودکار پیام", "Automated communications", "Automatische Nachrichten", "Otomatik iletişim"], ["بدون این سوییچ هیچ پیامی ارسال نمی‌شود (فقط مدیر ارشد)", "Without this nothing is sent (super admin only)", "Ohne diesen Schalter wird nichts gesendet (nur Super-Admin)", "Bu olmadan hiçbir şey gönderilmez (yalnızca süper yönetici)"]],
  ai_customer_insights_enabled: [["خلاصهٔ هوش مصنوعی", "AI insights", "KI-Einblicke", "Yapay zekâ özetleri"], ["هنوز پیاده نشده؛ خلاصه‌ها قاعده‌محورند", "Not implemented yet; summaries are rule-based", "Noch nicht umgesetzt; Zusammenfassungen sind regelbasiert", "Henüz yok; özetler kural tabanlı"]],
  adaptive_workspaces_enabled: [["فضاهای کاری تطبیقی", "Adaptive workspaces", "Adaptive Arbeitsbereiche", "Uyarlanabilir çalışma alanları"], ["انتخاب فضای کار، منو و خانهٔ شخصی؛ خاموش = منوی کلاسیک", "Workspace switcher, personal sidebar and home; off = classic menu", "Arbeitsbereich-Auswahl, persönliches Menü und Startseite; aus = klassisches Menü", "Çalışma alanı seçimi, kişisel menü ve ana sayfa; kapalı = klasik menü"]],
};
const THRESHOLDS: Record<string, Tx> = {
  newUserDays: ["روزهای «کاربر جدید»", "New-user days", "Tage „neuer Nutzer“", "Yeni kullanıcı günleri"], inactiveDays: ["روزهای عدم‌فعالیت", "Inactive after (days)", "Inaktiv nach (Tagen)", "Pasif sayılma (gün)"],
  lowCredits: ["آستانهٔ کردیت کم", "Low-credit threshold", "Schwelle wenig Credits", "Az kredi eşiği"], engagedActiveDays: ["روز فعال برای «درگیر»", "Active days for “engaged”", "Aktive Tage für „engagiert“", "“Bağlı” için aktif gün"],
  highIntentScore: ["امتیاز «قصد خرید بالا»", "High-intent score", "Punktzahl hohe Kaufabsicht", "Yüksek niyet puanı"], atRiskPaidInactiveDays: ["عدم‌فعالیت پولیِ در خطر (روز)", "At-risk paid inactivity (days)", "Gefährdet: inaktive Tage (zahlend)", "Riskli ödeyen pasiflik (gün)"],
  renewalSoonDays: ["روزهای «تمدید نزدیک»", "Renewal-soon days", "Tage „Verlängerung bald“", "Yakın yenileme günleri"], nurtureBand: ["شروع باند پرورش", "Nurture band starts at", "Pflegeband ab", "Besleme bandı başlangıcı"],
  salesBand: ["شروع باند فروش", "Sales band starts at", "Vertriebsband ab", "Satış bandı başlangıcı"], scoringWindowDays: ["پنجرهٔ امتیازدهی (روز)", "Scoring window (days)", "Bewertungsfenster (Tage)", "Puanlama penceresi (gün)"],
};
const WEIGHTS: Record<string, Tx> = {
  onboardingCompleted: ["تکمیل آشنایی", "Onboarding completed", "Onboarding abgeschlossen", "Tanışma tamamlandı"], firstValue: ["نتیجهٔ اول", "First result", "Erstes Ergebnis", "İlk sonuç"],
  returnedAnotherDay: ["بازگشت در روز دیگر", "Returned another day", "An anderem Tag zurück", "Başka gün döndü"], repeatedModuleUse: ["۳+ نتیجه در یک ماژول", "3+ results in one module", "3+ Ergebnisse in einem Modul", "Bir modülde 3+ sonuç"],
  pricingViewed: ["دیدن قیمت/پلن", "Viewed pricing/plans", "Preise/Tarife angesehen", "Fiyat/plan görüntüledi"], checkoutStarted: ["شروع پرداخت", "Checkout started", "Checkout begonnen", "Ödeme başladı"],
  demoRequested: ["درخواست کمک/دمو", "Requested help/demo", "Hilfe/Demo angefragt", "Yardım/demo istedi"], liveUsed: ["استفاده از AIFekr لایو (فقط مدت تماس)", "Used AIFekr Live (call length only)", "AIFekr Live genutzt (nur Anrufdauer)", "AIFekr Canlı kullandı (yalnızca süre)"],
};
const SENDING_FLAGS = ["lifecycle_automation_enabled", "automated_communications_enabled"];

function GrowthSettingsTab() {
  const { i, tx } = useG();
  const { data, error, loading, reload } = useData<{ settings: GrowthSettings }>(GROWTH, "view=settings");
  const [draft, setDraft] = useState<GrowthSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<string[] | null>(null);
  if (error) return <Problem error={error} />;
  const s = draft ?? data?.settings;
  if (!s) return <section className="panel" aria-busy={loading} />;
  const upd = (fn: (x: GrowthSettings) => void) => { const next = structuredClone(s); fn(next); setDraft(next); };
  async function doSave() {
    if (!draft) return;
    setBusy(true); setAsk(null);
    try { await post(GROWTH, { action: "saveSettings", settings: draft }); setDraft(null); toast.success(tx(["ذخیره شد و در گزارش ممیزی ثبت شد.", "Saved and recorded in the audit log.", "Gespeichert und protokolliert.", "Kaydedildi ve denetim günlüğüne yazıldı."])); reload(); }
    catch (e) { toast.error(e instanceof Error && /403|FORBIDDEN/.test(e.message) ? tx(["روشن‌کردن ارسال پیام فقط با نقش مدیر ارشد ممکن است.", "Only a super admin can turn on messaging.", "Nur ein Super-Admin kann Nachrichten einschalten.", "Mesajlaşmayı yalnızca süper yönetici açabilir."]) : e instanceof Error ? e.message : "FAILED"); }
    finally { setBusy(false); }
  }
  function save() {
    const turningOn = SENDING_FLAGS.filter((k) => draft?.flags[k] && !data?.settings.flags[k]);
    if (turningOn.length) setAsk(turningOn.map((k) => FLAGS[k][0][i]));
    else void doSave();
  }
  return (
    <>
      <section className="panel">
        <h3>{tx(["سوییچ‌ها", "Feature flags", "Funktionsschalter", "Özellik anahtarları"])}</h3>
        <div className="gc-flags">{Object.keys(FLAGS).filter((k) => k in s.flags).map((k) => <label key={k} className="gc-switch"><input type="checkbox" checked={s.flags[k]} onChange={(e) => upd((x) => { x.flags[k] = e.target.checked; })} /><span><b>{FLAGS[k][0][i]}</b> <small>— {FLAGS[k][1][i]}</small></span></label>)}</div>
      </section>
      <div className="gc-two">
        <section className="panel">
          <h3>{tx(["آستانه‌ها", "Thresholds", "Schwellenwerte", "Eşikler"])}</h3>
          <div className="domain-fields">{Object.keys(THRESHOLDS).filter((k) => k in s.thresholds).map((k) => <label key={k}>{THRESHOLDS[k][i]}<input type="number" min={0} dir="ltr" value={s.thresholds[k]} onChange={(e) => upd((x) => { x.thresholds[k] = Number(e.target.value); })} /></label>)}</div>
        </section>
        <section className="panel">
          <h3>{tx(["وزن‌های امتیاز (فرضیه، نه مدل اعتبارسنجی‌شده)", "Score weights (hypotheses, not a validated model)", "Punktgewichte (Hypothesen, kein validiertes Modell)", "Puan ağırlıkları (hipotez, doğrulanmış model değil)"])}</h3>
          <div className="domain-fields">{Object.keys(WEIGHTS).filter((k) => k in s.weights).map((k) => <label key={k}>{WEIGHTS[k][i]}<input type="number" min={0} max={100} dir="ltr" value={s.weights[k]} onChange={(e) => upd((x) => { x.weights[k] = Number(e.target.value); })} /></label>)}</div>
        </section>
      </div>
      <section className="panel">
        <h3>{tx(["محدودیت پیام", "Messaging limits", "Nachrichtenlimits", "Mesaj sınırları"])}</h3>
        <div className="domain-fields">
          <label>{tx(["حداقل فاصلهٔ دو پیام (ساعت)", "Min hours between messages", "Min. Stunden zwischen Nachrichten", "Mesajlar arası en az saat"])}<input type="number" dir="ltr" value={s.messaging.minHoursBetween} onChange={(e) => upd((x) => { x.messaging.minHoursBetween = Number(e.target.value); })} /></label>
          <label>{tx(["حداکثر پیام در ۱۴ روز", "Max messages per 14 days", "Max. Nachrichten pro 14 Tage", "14 günde en fazla mesaj"])}<input type="number" dir="ltr" value={s.messaging.maxPer14Days} onChange={(e) => upd((x) => { x.messaging.maxPer14Days = Number(e.target.value); })} /></label>
          <label>{tx(["شروع ساعت سکوت (تهران)", "Quiet hours start (Tehran)", "Ruhezeit Beginn (Teheran)", "Sessiz saat başlangıcı (Tahran)"])}<input type="number" min={0} max={23} dir="ltr" value={s.messaging.quietStartHour} onChange={(e) => upd((x) => { x.messaging.quietStartHour = Number(e.target.value); })} /></label>
          <label>{tx(["پایان ساعت سکوت", "Quiet hours end", "Ruhezeit Ende", "Sessiz saat bitişi"])}<input type="number" min={0} max={23} dir="ltr" value={s.messaging.quietEndHour} onChange={(e) => upd((x) => { x.messaging.quietEndHour = Number(e.target.value); })} /></label>
        </div>
      </section>
      <div className="domain-actions">
        <Button variant="primary" disabled={!draft || busy} onClick={save}>{tx(["ذخیرهٔ تنظیمات", "Save settings", "Einstellungen speichern", "Ayarları kaydet"])}</Button>
        {draft && <Button onClick={() => setDraft(null)}>{tx(["لغو تغییرات", "Discard changes", "Änderungen verwerfen", "Değişikliklerden vazgeç"])}</Button>}
      </div>
      {ask && <Confirm title={tx(["روشن‌کردن ارسال پیام", "Turn on messaging", "Nachrichten einschalten", "Mesajlaşmayı aç"])} body={<><p>{tx(["این سوییچ‌ها روشن می‌شوند و همراه موتور پیگیری می‌توانند به کاربران واقعی پیام بفرستند:", "These switches turn on and, with the follow-up engine, can message real users:", "Diese Schalter werden eingeschaltet und können mit der Engine echte Nutzer anschreiben:", "Bu anahtarlar açılır ve takip motoruyla gerçek kullanıcılara mesaj gönderebilir:"])}</p><ul>{ask.map((x) => <li key={x}>{x}</li>)}</ul></>} action={tx(["بله، ذخیره کن", "Yes, save", "Ja, speichern", "Evet, kaydet"])} onYes={() => void doSave()} onClose={() => setAsk(null)} />}
    </>
  );
}

type Touch = { utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; utmContent: string | null; utmTerm: string | null; referrerHost: string | null; landingPath: string } | null;
type Detail = {
  user: { id: string; name: string | null; email: string | null; phone: string | null; accountType: string; language: string | null; createdAt: string; lastLoginAt: string | null; plan: string; planExpiry: string | null; credits: number; isBlocked: boolean };
  profile: { attributionConfidence: string; intendedModule: string | null; objective: string | null; persona: string | null; intent: string | null; onboardingState: string; marketingConsent: boolean; consentAt: string | null; consentSource: string | null; unsubscribedAt: string | null; followUpStatus: string } | null;
  touches: { first: Touch; last: Touch };
  facts: { successes: Record<string, { count: number; name: Two }>; failedOperations: number; creditsUsedWindow: number; activeDaysWindow: number; lastActiveAt: string | null; payments: { success: number; failed: number; pending: number; revenueToman: number } };
  intelligence: { stage: string; score: number; band: string; lines: { rule: string; points: number; evidence: string }[]; segments: string[]; risks: string[]; firstValueAt: string | null; nextAction: string };
  notes: { id: string; body: string; createdAt: string }[];
  timeline: { at: string; type: string; label: string; detail: string | null }[];
};
const FOLLOW_STATES: Record<string, Tx> = { none: ["بدون پیگیری", "None", "Keins", "Yok"], open: ["باز", "Open", "Offen", "Açık"], contacted: ["تماس گرفته شد", "Contacted", "Kontaktiert", "İletişim kuruldu"], resolved: ["حل شد", "Resolved", "Erledigt", "Çözüldü"] };

function TouchView({ touch }: { touch: Touch }) {
  const { tx } = useG();
  if (!touch) return <Missing>{tx(["نامشخص — شاهدی ثبت نشده", "Unknown — no evidence recorded", "Unbekannt — kein Nachweis", "Bilinmiyor — kanıt yok"])}</Missing>;
  return <bdi dir="ltr">{[touch.utmSource, touch.utmMedium, touch.utmCampaign, touch.utmContent, touch.utmTerm].filter(Boolean).join(" / ") || touch.referrerHost} · {touch.landingPath}</bdi>;
}

export function LiveGrowthCustomer({ id }: { id: string }) {
  const { n, i, tx, two, date, dateTime } = useG();
  const { data, error, loading, reload } = useData<Detail & { disabled?: boolean }>(GROWTH, "view=customer&id=" + encodeURIComponent(id));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [stopAsk, setStopAsk] = useState(false);
  async function act(body: Record<string, unknown>) {
    setBusy(true);
    try { await post(GROWTH, body); reload(); return true; } catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); return false; } finally { setBusy(false); }
  }
  const back = <Link className="btn" href="/admin/customer-growth#customers"><Icon name={i === 0 ? "ArrowRight" : "ArrowLeft"} size={16} />{tx(["مرکز رشد", "Growth center", "Growth Center", "Büyüme merkezi"])}</Link>;
  if (error) return <>{back}<Problem error={error === "NOT_FOUND" ? tx(["این مشتری پیدا نشد.", "Customer not found.", "Kunde nicht gefunden.", "Müşteri bulunamadı."]) : error} /></>;
  if (data?.disabled) return <>{back}<Disabled /></>;
  if (!data) return <>{back}<section className="panel" aria-busy={loading} /></>;
  const { user, profile, facts, intelligence: ai } = data;
  const types = [...new Set(data.timeline.map((e) => e.type))];
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="UserRound" size={28} /></span>
        <div>
          <h2>{user.name || user.email || user.phone}</h2>
          <p><bdi dir="ltr">{[user.email, user.phone].filter(Boolean).join(" · ")}</bdi></p>
        </div>
        <span className={"gc-stage gc-stage-" + ai.stage}>{lbl(STAGES, ai.stage, i)}</span>
        <span className={"gc-band gc-band-" + ai.band}>{n(ai.score)} · {lbl(BANDS, ai.band, i)}</span>
      </div>
      <nav className="admin-finance-links">
        {back}
        <Link className="btn" href={"/admin/users/" + encodeURIComponent(user.id)}>{tx(["پروفایل حساب", "Account profile", "Kontoprofil", "Hesap profili"])}</Link>
      </nav>
      <div className="gc-two">
        <section className="panel"><h3>{tx(["هویت", "Identity", "Identität", "Kimlik"])}</h3><dl className="domain-detail">
          <dt>{tx(["ثبت‌نام", "Registered", "Registriert", "Kayıt"])}</dt><dd>{date(user.createdAt)}</dd>
          <dt>{tx(["آخرین ورود", "Last login", "Letzte Anmeldung", "Son giriş"])}</dt><dd>{date(user.lastLoginAt)}</dd>
          <dt>{tx(["زبان", "Language", "Sprache", "Dil"])}</dt><dd>{user.language || "—"}</dd>
          <dt>{tx(["نوع حساب", "Account type", "Kontotyp", "Hesap türü"])}</dt><dd>{user.accountType}</dd>
          <dt>{tx(["وضعیت", "Status", "Status", "Durum"])}</dt><dd>{user.isBlocked ? tx(["مسدود", "Blocked", "Gesperrt", "Engelli"]) : tx(["فعال", "Active", "Aktiv", "Aktif"])}</dd>
        </dl></section>
        <section className="panel"><h3>{tx(["منبع ورود", "Acquisition", "Herkunft", "Edinim"])}</h3><dl className="domain-detail">
          <dt>{tx(["اولین تماس", "First touch", "Erster Kontakt", "İlk temas"])}</dt><dd><TouchView touch={data.touches.first} /></dd>
          <dt>{tx(["آخرین تماس", "Last touch", "Letzter Kontakt", "Son temas"])}</dt><dd><TouchView touch={data.touches.last} /></dd>
          <dt>{tx(["اطمینان", "Confidence", "Sicherheit", "Güven"])}</dt><dd>{profile?.attributionConfidence ?? "unknown"}</dd>
          <dt>{tx(["ماژول هدف", "Intended module", "Zielmodul", "Hedef modül"])}</dt><dd>{profile?.intendedModule ? lbl(MODULES, profile.intendedModule, i) : "—"}</dd>
          <dt>{tx(["پاسخ‌های آشنایی", "Onboarding answers", "Onboarding-Antworten", "Tanışma yanıtları"])}</dt><dd>{[profile?.objective, profile?.persona, profile?.intent].filter(Boolean).join(" · ") || "—"} ({profile?.onboardingState ?? "not_started"})</dd>
        </dl></section>
        <section className="panel"><h3>{tx(["استفاده از محصول", "Product usage", "Produktnutzung", "Ürün kullanımı"])}</h3><dl className="domain-detail">
          <dt>{tx(["نتیجهٔ اول", "First value", "Erster Nutzen", "İlk değer"])}</dt><dd>{ai.firstValueAt ? date(ai.firstValueAt) : <Missing>{tx(["هنوز نه", "Not yet", "Noch nicht", "Henüz değil"])}</Missing>}</dd>
          <dt>{tx(["ماژول‌ها (نتیجهٔ واقعی)", "Modules (real results)", "Module (echte Ergebnisse)", "Modüller (gerçek sonuç)"])}</dt><dd>{Object.entries(facts.successes).map(([m, s]) => (MODULES[m]?.[i] ?? two(s.name, m)) + " ×" + n(s.count)).join(" · ") || "—"}</dd>
          <dt>{tx(["عملیات ناموفق (بازپرداخت)", "Failed (refunded) ops", "Fehlgeschlagen (erstattet)", "Başarısız (iade) işlemler"])}</dt><dd>{n(facts.failedOperations)}</dd>
          <dt>{tx(["روزهای فعال", "Active days", "Aktive Tage", "Aktif günler"])}</dt><dd>{n(facts.activeDaysWindow)}</dd>
          <dt>{tx(["کردیت مصرفی", "Credits used", "Verbrauchte Credits", "Harcanan kredi"])}</dt><dd>{n(facts.creditsUsedWindow)}</dd>
          <dt>{tx(["آخرین فعالیت", "Last activity", "Letzte Aktivität", "Son etkinlik"])}</dt><dd>{date(facts.lastActiveAt)}</dd>
        </dl></section>
        <section className="panel"><h3>{tx(["اشتراک و پرداخت", "Subscription & billing", "Abo & Abrechnung", "Abonelik ve ödeme"])}</h3><dl className="domain-detail">
          <dt>{tx(["پلن", "Plan", "Tarif", "Plan"])}</dt><dd>{user.plan}{user.planExpiry ? " · " + tx(["تا", "until", "bis", "bitiş"]) + " " + date(user.planExpiry) : ""}</dd>
          <dt>{tx(["کردیت", "Credits", "Credits", "Kredi"])}</dt><dd>{n(user.credits)}</dd>
          <dt>{tx(["پرداخت‌ها", "Payments", "Zahlungen", "Ödemeler"])}</dt><dd>{tx(["موفق", "success", "erfolgreich", "başarılı"])} {n(facts.payments.success)} · {tx(["ناموفق", "failed", "fehlgeschlagen", "başarısız"])} {n(facts.payments.failed)} · {tx(["باز", "pending", "offen", "bekleyen"])} {n(facts.payments.pending)}</dd>
          <dt>{tx(["درآمد", "Revenue", "Umsatz", "Gelir"])}</dt><dd>{n(facts.payments.revenueToman)} {tx(["تومان", "Toman", "Toman", "Tümen"])}</dd>
        </dl><Link className="btn" href={"/admin/financial?userId=" + encodeURIComponent(user.id)}>{tx(["خریدها و رسیدها", "Purchases & receipts", "Käufe & Belege", "Satın almalar ve dekontlar"])}</Link></section>
        <section className="panel"><h3>{tx(["هوش مشتری", "Customer intelligence", "Kundenintelligenz", "Müşteri zekâsı"])}</h3>
          <p className="fine-print">{tx(["شواهد (از داده):", "Evidence (from data):", "Belege (aus Daten):", "Kanıt (veriden):"])}</p>
          <ul className="fine-print">{ai.lines.length ? ai.lines.map((l) => <li key={l.rule}>+{l.points} · {l.rule} — {l.evidence}</li>) : <li>{tx(["هنوز رفتاری که امتیاز بدهد ثبت نشده.", "No scoring behaviour recorded yet.", "Noch kein bewertetes Verhalten.", "Henüz puanlanan davranış yok."])}</li>}</ul>
          <p className="fine-print">{tx(["بخش‌ها", "Segments", "Segmente", "Segmentler"])}: {ai.segments.map((s) => lbl(SEGMENTS, s, i)).join("، ") || "—"}</p>
          {!!ai.risks.length && <p className="admin-alert">{tx(["نشانه‌های خطر", "Risk signals", "Risikosignale", "Risk sinyalleri"])}: {ai.risks.join(", ")}</p>}
          <p><b>{tx(["اقدام پیشنهادی (توصیه، نه اجرای خودکار)", "Suggested action (advice, not automatic)", "Empfohlene Aktion (Rat, nicht automatisch)", "Önerilen eylem (tavsiye, otomatik değil)"])}:</b> {lbl(ACTIONS, ai.nextAction, i)}</p>
        </section>
        <section className="panel"><h3>{tx(["پیگیری و ارتباط", "Follow-up & communication", "Follow-up & Kommunikation", "Takip ve iletişim"])}</h3>
          <dl className="domain-detail">
            <dt>{tx(["رضایت ایمیل تبلیغاتی", "Marketing email consent", "Einwilligung Werbe-E-Mail", "Pazarlama e-postası izni"])}</dt><dd>{profile?.marketingConsent ? tx(["بله", "Yes", "Ja", "Evet"]) + " · " + (profile.consentSource ?? "") + " · " + date(profile.consentAt) : tx(["خیر", "No", "Nein", "Hayır"])}</dd>
            <dt>{tx(["پیام‌های پیگیری", "Lifecycle messages", "Lebenszyklus-Nachrichten", "Yaşam döngüsü mesajları"])}</dt><dd>{profile?.unsubscribedAt ? tx(["متوقف", "Stopped", "Gestoppt", "Durduruldu"]) + " · " + date(profile.unsubscribedAt) : tx(["مجاز", "Allowed", "Erlaubt", "İzinli"])}</dd>
          </dl>
          <div className="domain-toolbar">
            <label>{tx(["وضعیت پیگیری", "Follow-up status", "Follow-up-Status", "Takip durumu"])}<select value={profile?.followUpStatus ?? "none"} disabled={busy} onChange={(e) => void act({ action: "followUp", userId: user.id, status: e.target.value, assign: true })}>{Object.keys(FOLLOW_STATES).map((k) => <option key={k} value={k}>{lbl(FOLLOW_STATES, k, i)}</option>)}</select></label>
            {!profile?.unsubscribedAt && <Button variant="danger" disabled={busy} onClick={() => setStopAsk(true)}>{tx(["توقف پیام‌ها", "Stop messages", "Nachrichten stoppen", "Mesajları durdur"])}</Button>}
          </div>
          <form className="domain-fields" onSubmit={(e) => { e.preventDefault(); if (note.trim()) void act({ action: "addNote", userId: user.id, text: note }).then((ok) => { if (ok) setNote(""); }); }}>
            <label className="span-2">{tx(["یادداشت داخلی", "Internal note", "Interne Notiz", "Dahili not"])}<textarea value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} /></label>
            <div className="span-2 domain-actions"><Button type="submit" disabled={busy || !note.trim()}>{tx(["افزودن یادداشت", "Add note", "Notiz hinzufügen", "Not ekle"])}</Button></div>
          </form>
          <ul className="gc-timeline">{data.notes.map((x) => <li key={x.id}><time>{date(x.createdAt)}</time><span className="gc-note">{x.body}</span></li>)}</ul>
        </section>
      </div>
      <section className="panel">
        <div className="row-between"><h3>{tx(["خط زمانی", "Timeline", "Zeitleiste", "Zaman çizelgesi"])}</h3>
          <div className="gc-chips"><button aria-pressed={!filter} onClick={() => setFilter("")}>{tx(["همه", "All", "Alle", "Tümü"])}</button>{types.map((x) => <button key={x} aria-pressed={filter === x} onClick={() => setFilter(x)}>{x}</button>)}</div></div>
        <p className="fine-print">{tx(["متن پرامپت‌ها و محتوای تولیدشده نمایش داده نمی‌شود.", "Prompt text and generated content are never shown.", "Prompt-Texte und erzeugte Inhalte werden nie angezeigt.", "İstem metni ve üretilen içerik asla gösterilmez."])}</p>
        <ol className="gc-timeline">{data.timeline.filter((e) => !filter || e.type === filter).map((e, k) => <li key={k}><time>{dateTime(e.at)}</time><span><span className="badge">{e.type}</span> <b>{e.label}</b>{e.detail ? <small> · {e.detail}</small> : null}</span></li>)}</ol>
        {!data.timeline.length && <Empty />}
      </section>
      {stopAsk && <Confirm title={tx(["توقف پیام‌ها", "Stop messages", "Nachrichten stoppen", "Mesajları durdur"])} body={<p>{tx(["پیام‌های پیگیری این کاربر متوقف شود؟ مدیر نمی‌تواند از طرف کاربر دوباره رضایت بدهد.", "Stop lifecycle messages for this user? An admin cannot grant consent back on their behalf.", "Lebenszyklus-Nachrichten für diesen Nutzer stoppen? Ein Admin kann die Einwilligung nicht zurückgeben.", "Bu kullanıcının mesajları durdurulsun mu? Yönetici onun adına yeniden izin veremez."])}</p>} action={tx(["بله، متوقف کن", "Yes, stop", "Ja, stoppen", "Evet, durdur"])} onYes={() => { setStopAsk(false); void act({ action: "stopMessages", userId: user.id }); }} onClose={() => setStopAsk(false)} />}
    </>
  );
}
